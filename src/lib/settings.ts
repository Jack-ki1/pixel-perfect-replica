// Tunable configuration for the whole radar. Stored as one JSON row; missing keys fall back to defaults.
import { z } from "zod";

export const DEFAULT_SEEDS = [
  "bongo flava", "gengetone", "kenya new music", "tanzania hits", "uganda music", "rwanda music",
  "arbantone", "kenyan drill", "ethiopian music", "east african hits", "amapiano new", "afrobeats new",
  "naija new music", "ghana music", "zambia music", "singeli", "kenya gospel", "african rnb",
];

export const SettingsSchema = z.object({
  sources: z.object({ deezer: z.boolean(), musicbrainz: z.boolean(), wikipedia: z.boolean() }),
  seeds: z.array(z.string().min(1)).min(1),
  seedsPerRun: z.number().int().min(1).max(10),
  playlistsPerSeed: z.number().int().min(1).max(5),
  maxCandidates: z.number().int().min(10).max(150),
  minFans: z.number().int().min(0),
  maxFans: z.number().int().min(100),
  maxCatalog: z.number().int().min(1).max(500),
  maxTopRank: z.number().int().min(10_000).max(1_000_000),
  excludeWikipedia: z.boolean(),
  excludeNames: z.array(z.string()),
  regionFocus: z.enum(["east", "africa"]),
  discoveryWeights: z.object({ traction: z.number().min(0), momentum: z.number().min(0), breadth: z.number().min(0), releases: z.number().min(0), headroom: z.number().min(0) }),
  artisticWeights: z.object({ songwriting: z.number().min(0), vocals: z.number().min(0), melody: z.number().min(0), production: z.number().min(0), originality: z.number().min(0), commercial: z.number().min(0) }),
  artisticShare: z.number().min(0).max(100),
  tiers: z.object({ signArtistic: z.number(), signScore: z.number(), meetArtistic: z.number(), meetScore: z.number(), watchScore: z.number() }),
  aiModel: z.string().min(3),
  analysisBatch: z.number().int().min(1).max(10),
  listenerNotes: z.string().max(1000),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  sources: { deezer: true, musicbrainz: true, wikipedia: true },
  seeds: DEFAULT_SEEDS,
  seedsPerRun: 3,
  playlistsPerSeed: 2,
  maxCandidates: 60,
  minFans: 50,
  maxFans: 20_000,
  maxCatalog: 30,
  maxTopRank: 250_000,
  excludeWikipedia: true,
  excludeNames: ["Diamond Platnumz", "Harmonize", "Rayvanny", "Alikiba", "Sauti Sol", "Burna Boy", "Wizkid", "Davido", "Tems", "Rema"],
  regionFocus: "east",
  discoveryWeights: { traction: 30, momentum: 25, breadth: 20, releases: 15, headroom: 10 },
  artisticWeights: { songwriting: 2, vocals: 2, melody: 1.5, production: 1, originality: 1.5, commercial: 1 },
  artisticShare: 60,
  tiers: { signArtistic: 75, signScore: 70, meetArtistic: 65, meetScore: 58, watchScore: 45 },
  aiModel: "google/gemini-3.8-flash",
  analysisBatch: 3,
  listenerNotes: "",
};

export const AI_MODELS = ["google/gemini-3.8-flash", "google/gemini-2.5-flash", "google/gemini-2.5-pro"];

/** Deep-merge stored JSON over defaults so older saves keep working. */
export function mergeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const [k, v] of Object.entries(r)) {
    const d = (DEFAULT_SETTINGS as Record<string, unknown>)[k];
    if (v == null || d === undefined) continue;
    out[k] = d && typeof d === "object" && !Array.isArray(d) && typeof v === "object" ? { ...d, ...v } : v;
  }
  const p = SettingsSchema.safeParse(out);
  return p.success ? p.data : DEFAULT_SETTINGS;
}

/** Why an artist counts as already established (null = still emerging). */
export function establishedReason(a: { name: string; nb_fan: number; nb_album: number; top_rank: number | null; wiki_famous?: boolean }, s: Settings): string | null {
  if (s.excludeNames.some((n) => n.trim().toLowerCase() === a.name.toLowerCase())) return "On exclusion list";
  if (/\b(hits|various artists|playlist|compilation|records|music)\s*$/i.test(a.name)) return "Compilation or label, not an artist";
  if (a.nb_fan > s.maxFans) return `Over ${s.maxFans} fans`;
  if (a.nb_fan < s.minFans) return `Under ${s.minFans} fans`;
  if (a.nb_album > s.maxCatalog) return `Large catalogue (${a.nb_album} releases)`;
  if ((a.top_rank ?? 0) > s.maxTopRank) return "Hit-level track popularity";
  if (s.excludeWikipedia && a.wiki_famous) return "Has a Wikipedia article";
  return null;
}
