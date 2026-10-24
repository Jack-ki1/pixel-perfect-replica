import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { ArtisticKey } from "@/lib/scoring";

export type LiveArtist = Database["public"]["Tables"]["live_artists"]["Row"];
export type LiveAnalysis = Database["public"]["Tables"]["live_analyses"]["Row"];
export type AnalysisJson = {
  key: string; mode?: string; tempo_bpm?: number | null; genre: string; language: string;
  vocals: { tone: string; range: string; pitch_control: string; delivery: string };
  songwriting: { hook: string; structure: string; lyric_themes: string };
  scores: Record<ArtisticKey, number>; strengths: string[]; risks: string[]; comparable_artists?: string[];
  summary: string; recommendation: string;
};
export type Features = { fans?: number; topRank?: number | null; playlistHits?: number; daysSinceRelease?: number | null; releases12m?: number | null; growth30d?: number | null; confidence?: number; snapshots?: number };

const q = <T,>(key: unknown[], fn: () => Promise<T>) => queryOptions({ queryKey: key, queryFn: fn });
const must = <T,>(r: { data: T | null; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data as T; };

export const liveArtistsQuery = q(["live_artists"], async () =>
  must(await supabase.from("live_artists").select("*").order("discovery_score", { ascending: false, nullsFirst: false }).limit(500)));
export const liveArtistQuery = (id: string) => q(["live_artist", id], async () => must(await supabase.from("live_artists").select("*").eq("id", id).maybeSingle()));
export const snapshotsQuery = (id: string) => q(["live_snapshots", id], async () => must(await supabase.from("live_snapshots").select("*").eq("artist_id", id).order("captured_at")));
export const analysesQuery = q(["live_analyses"], async () => must(await supabase.from("live_analyses").select("*").order("week_start", { ascending: false }).limit(500)));
export const decisionsQuery = q(["live_decisions"], async () => must(await supabase.from("live_decisions").select("*").order("created_at", { ascending: false })));
export const runsQuery = q(["discovery_runs"], async () => must(await supabase.from("discovery_runs").select("*").order("started_at", { ascending: false }).limit(15)));

export const feat = (a: LiveArtist) => (a.features ?? {}) as Features;
export const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);
export const ago = (iso: string) => { const h = (Date.now() - Date.parse(iso)) / 36e5; return h < 1 ? "just now" : h < 24 ? `${Math.round(h)}h ago` : `${Math.round(h / 24)}d ago`; };

/** Latest analysis per artist. */
export function latestByArtist(rows: LiveAnalysis[]) {
  const m = new Map<string, LiveAnalysis>();
  for (const r of rows) if (!m.has(r.artist_id)) m.set(r.artist_id, r);
  return m;
}
