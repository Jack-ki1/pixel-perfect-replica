// Server-only engine: live discovery (Deezer + MusicBrainz) and AI listening analysis.
import { streamText } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai/gateway-helpers";
import { AFRICAN_ISO, artisticOverall, discoveryIndex, fanGrowth30d, isEmerging, weekStart } from "@/lib/scoring";

const DZ = "https://api.deezer.com";
const UA = "BreakoutRadar/1.0 (internal A&R research)";
export const AUDIO_MODEL = "google/gemini-3.8-flash";

/** Seed searches for African, East-Africa-first playlists. Rotated across runs. */
export const SEEDS = [
  "bongo flava", "gengetone", "kenya new music", "tanzania hits", "uganda music", "rwanda music",
  "arbantone", "kenyan drill", "ethiopian music", "east african hits", "amapiano new", "afrobeats new",
  "naija new music", "ghana music", "zambia music", "singeli", "kenya gospel", "african rnb",
];

async function dz<T>(path: string): Promise<T> {
  const r = await fetch(`${DZ}${path}`);
  if (!r.ok) throw new Error(`Deezer ${r.status}`);
  const j = (await r.json()) as T & { error?: { message: string } };
  if (j.error) throw new Error(`Deezer: ${j.error.message}`);
  return j;
}

/** Run async work over items, at most 6 at once (server connection limit). */
async function pool<T, R>(items: T[], fn: (x: T) => Promise<R>, size = 6): Promise<(R | null)[]> {
  const out: (R | null)[] = new Array(items.length).fill(null);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) { const k = i++; try { out[k] = await fn(items[k]!); } catch { out[k] = null; } }
  }));
  return out;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type DzTrack = { id: number; title: string; rank: number; link: string; preview: string; artist: { id: number; name: string } };
type DzArtist = { id: number; name: string; link: string; picture_medium: string; nb_fan: number; nb_album: number };

export async function runDiscovery(kind: "manual" | "scheduled", seedsPerRun = 3) {
  const db = supabaseAdmin;
  const { data: run } = await db.from("discovery_runs").insert({ kind: `discovery:${kind}` }).select("id").single();
  const { count } = await db.from("discovery_runs").select("id", { count: "exact", head: true }).like("kind", "discovery:%");
  const offset = ((count ?? 1) - 1) * seedsPerRun;
  const seeds = Array.from({ length: seedsPerRun }, (_, k) => SEEDS[(offset + k) % SEEDS.length]!);
  const stats = { seeds, playlists: 0, tracks: 0, candidates: 0, emerging: 0, new: 0, outsideAfrica: 0 };
  try {
    // 1. Find curator playlists for each seed.
    const lists = (await pool(seeds, (q) => dz<{ data: { id: number; nb_tracks: number }[] }>(`/search/playlist?q=${encodeURIComponent(q)}&limit=3`)))
      .flatMap((r, k) => (r?.data ?? []).filter((p) => p.nb_tracks >= 15).slice(0, 2).map((p) => ({ id: p.id, seed: seeds[k]! })));
    stats.playlists = lists.length;
    // 2. Gather tracks → artists, counting playlist appearances and best track rank.
    const byArtist = new Map<number, { name: string; hits: number; rank: number; seeds: Set<string> }>();
    const trackLists = await pool(lists, (p) => dz<{ data: DzTrack[] }>(`/playlist/${p.id}/tracks?limit=100`));
    trackLists.forEach((r, k) => (r?.data ?? []).forEach((t) => {
      stats.tracks++;
      const a = byArtist.get(t.artist.id) ?? { name: t.artist.name, hits: 0, rank: 0, seeds: new Set<string>() };
      a.hits++; a.rank = Math.max(a.rank, t.rank ?? 0); a.seeds.add(lists[k]!.seed);
      byArtist.set(t.artist.id, a);
    }));
    // 3. Fetch artist profiles (cap per run) and keep emerging ones.
    const ids = [...byArtist.keys()].slice(0, 60);
    stats.candidates = ids.length;
    const profiles = (await pool(ids, (id) => dz<DzArtist>(`/artist/${id}`))).filter((p): p is DzArtist => !!p && isEmerging(p.nb_fan));
    stats.emerging = profiles.length;
    const { data: existing } = await db.from("live_artists").select("id,deezer_id,mb_checked,country,seed_sources,playlist_hits").in("deezer_id", profiles.map((p) => p.id));
    const ex = new Map((existing ?? []).map((e) => [Number(e.deezer_id), e]));
    // 4. Release activity for each emerging artist.
    const albums = await pool(profiles, (p) => dz<{ data: { release_date: string }[] }>(`/artist/${p.id}/albums?limit=50`));
    // 5. Country check via MusicBrainz for a few new artists (1 request/second limit).
    let mbBudget = 6;
    for (let k = 0; k < profiles.length; k++) {
      const p = profiles[k]!, seen = byArtist.get(p.id)!, prev = ex.get(p.id);
      const dates = (albums[k]?.data ?? []).map((a) => a.release_date).filter(Boolean).sort();
      const latest = dates.at(-1) ?? null;
      const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
      let country = prev?.country ?? null, mbid: string | null = null, mbChecked = prev?.mb_checked ?? false, regionSource = country ? "MusicBrainz" : "African playlist";
      if (!mbChecked && mbBudget-- > 0) {
        try {
          const r = await fetch(`https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(`artist:"${p.name}"`)}&fmt=json&limit=1`, { headers: { "User-Agent": UA } });
          const j = (await r.json()) as { artists?: { id: string; score: number; country?: string; name: string }[] };
          const m = j.artists?.[0];
          if (m && m.score >= 95 && m.name.toLowerCase() === p.name.toLowerCase()) { mbid = m.id; country = m.country ?? null; if (country) regionSource = "MusicBrainz"; }
          mbChecked = true;
        } catch { /* try again next run */ }
        await sleep(1100);
      }
      if (country && !AFRICAN_ISO.has(country)) { stats.outsideAfrica++; continue; }
      const row = {
        deezer_id: p.id, name: p.name, picture: p.picture_medium, link: p.link, nb_fan: p.nb_fan, nb_album: p.nb_album,
        country, region_source: regionSource, mb_checked: mbChecked, ...(mbid ? { mbid } : {}),
        seed_sources: [...new Set([...(prev?.seed_sources ?? []), ...seen.seeds])],
        playlist_hits: Math.max(prev?.playlist_hits ?? 0, seen.hits), top_rank: seen.rank,
        latest_release: latest, releases_12m: dates.filter((d) => d >= yearAgo).length, last_scanned: new Date().toISOString(),
      };
      const { data: up } = await db.from("live_artists").upsert(row, { onConflict: "deezer_id" }).select("id").single();
      if (!up) continue;
      if (!prev) stats.new++;
      await db.from("live_snapshots").insert({ artist_id: up.id, nb_fan: p.nb_fan, top_rank: seen.rank, playlist_hits: seen.hits });
    }
    await rescoreAll();
    await db.from("discovery_runs").update({ finished_at: new Date().toISOString(), stats }).eq("id", run!.id);
    return stats;
  } catch (e) {
    await db.from("discovery_runs").update({ finished_at: new Date().toISOString(), stats, error: (e as Error).message }).eq("id", run!.id);
    throw e;
  }
}

/** Recompute the breakout index for every artist from stored snapshots. */
export async function rescoreAll() {
  const db = supabaseAdmin;
  const { data: artists } = await db.from("live_artists").select("id,nb_fan,top_rank,playlist_hits,latest_release,releases_12m");
  const { data: snaps } = await db.from("live_snapshots").select("artist_id,captured_at,nb_fan").order("captured_at");
  const byA = new Map<string, { captured_at: string; nb_fan: number }[]>();
  (snaps ?? []).forEach((s) => byA.set(s.artist_id, [...(byA.get(s.artist_id) ?? []), s]));
  await pool(artists ?? [], async (a) => {
    const growth = fanGrowth30d(byA.get(a.id) ?? []);
    const days = a.latest_release ? Math.max(0, (Date.now() - Date.parse(a.latest_release)) / 864e5) : null;
    const f = { fans: a.nb_fan, topRank: a.top_rank, playlistHits: a.playlist_hits, daysSinceRelease: days, releases12m: a.releases_12m, growth30d: growth };
    const { score, confidence } = discoveryIndex(f);
    await db.from("live_artists").update({ discovery_score: score, features: { ...f, confidence, snapshots: (byA.get(a.id) ?? []).length } }).eq("id", a.id);
  });
}

const Analysis = z.object({
  key: z.string(), mode: z.string().optional(), tempo_bpm: z.number().nullable().optional(),
  genre: z.string(), language: z.string(),
  vocals: z.object({ tone: z.string(), range: z.string(), pitch_control: z.string(), delivery: z.string() }),
  songwriting: z.object({ hook: z.string(), structure: z.string(), lyric_themes: z.string() }),
  scores: z.object({ songwriting: z.number(), vocals: z.number(), melody: z.number(), production: z.number(), originality: z.number(), commercial: z.number() }),
  strengths: z.array(z.string()), risks: z.array(z.string()),
  comparable_artists: z.array(z.string()).optional(),
  summary: z.string(), recommendation: z.string(),
});
export type AnalysisResult = z.infer<typeof Analysis>;

const PROMPT = `You are a senior A&R listener. Listen carefully to this 30-second preview by "{artist}" (track "{title}").
Judge ARTISTIC QUALITY only, as a professional would: songwriting (hook, structure, lyric craft), key and harmony, vocals (tone, range, pitch control, delivery), melody, production, originality, commercial potential.
Be honest and specific to what you hear; a 30-second clip is limited evidence, say so in risks if relevant.
Score each dimension 0-10 (5 = competent professional, 8+ = rare).
Reply with ONLY a JSON object with keys: key, mode, tempo_bpm, genre, language, vocals{tone,range,pitch_control,delivery}, songwriting{hook,structure,lyric_themes}, scores{songwriting,vocals,melody,production,originality,commercial}, strengths[], risks[], comparable_artists[], summary (2-3 sentences), recommendation (one sentence for the A&R team).`;

/** Listen to one artist's top track and store this week's analysis. */
export async function analyseArtist(artistId: string) {
  const db = supabaseAdmin;
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");
  const { data: a } = await db.from("live_artists").select("id,name,deezer_id").eq("id", artistId).single();
  if (!a) throw new Error("Artist not found");
  const top = await dz<{ data: DzTrack[] }>(`/artist/${a.deezer_id}/top?limit=3`);
  const t = top.data.find((x) => x.preview);
  if (!t) throw new Error("No playable preview for this artist");
  const [audio, detail] = await Promise.all([
    fetch(t.preview).then((r) => { if (!r.ok) throw new Error("Preview unavailable"); return r.arrayBuffer(); }),
    dz<{ bpm?: number }>(`/track/${t.id}`).catch(() => ({ bpm: 0 })),
  ]);
  const provider = createLovableAiGatewayProvider(apiKey, undefined, { baseURL: "https://ai.gateway.lovable.dev/v1" });
  const result = streamText({
    model: provider(AUDIO_MODEL),
    maxRetries: 0,
    messages: [{ role: "user", content: [
      { type: "text", text: PROMPT.replace("{artist}", a.name).replace("{title}", t.title) },
      { type: "file", data: new Uint8Array(audio), mediaType: "audio/mpeg" },
    ] }],
  });
  const text = await result.text;
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const parsed = Analysis.parse(JSON.parse(json));
  const overall = artisticOverall(parsed.scores);
  const row = {
    artist_id: a.id, week_start: weekStart(), track_id: t.id, track_title: t.title, track_link: t.link,
    deezer_bpm: detail.bpm || null, result: parsed, overall, model: AUDIO_MODEL,
  };
  const { error } = await db.from("live_analyses").upsert(row, { onConflict: "artist_id,week_start" });
  if (error) throw new Error(error.message);
  return { artist: a.name, overall };
}

/** Weekly review: analyse the top-N discovery artists not yet reviewed this week. */
export async function runWeeklyAnalysis(limit = 4) {
  const db = supabaseAdmin;
  const wk = weekStart();
  const { data: done } = await db.from("live_analyses").select("artist_id").eq("week_start", wk);
  const skip = new Set((done ?? []).map((d) => d.artist_id));
  const { data: top } = await db.from("live_artists").select("id").order("discovery_score", { ascending: false, nullsFirst: false }).limit(40);
  const todo = (top ?? []).filter((t) => !skip.has(t.id)).slice(0, limit);
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const t of todo) {
    try { await analyseArtist(t.id); results.push({ id: t.id, ok: true }); }
    catch (e) {
      const msg = (e as Error).message;
      results.push({ id: t.id, ok: false, error: msg });
      if (/402|403|credit/i.test(msg)) break; // stop on billing/permission problems
    }
  }
  await db.from("discovery_runs").insert({ kind: "analysis", finished_at: new Date().toISOString(), stats: { week: wk, results } });
  return { week: wk, analysed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, remaining: Math.max(0, (top ?? []).length - skip.size - results.length) };
}
