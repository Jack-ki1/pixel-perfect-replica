// Pure scoring rules for Discovery, Analyse and Recommendations (tested in src/test/scoring.test.ts).
// All outputs are 0–100 ranking indices, never probabilities.

export const EMERGING_MIN_FANS = 100;
export const EMERGING_MAX_FANS = 300_000;

export type Snap = { captured_at: string; nb_fan: number };

export function isEmerging(fans: number) {
  return fans >= EMERGING_MIN_FANS && fans <= EMERGING_MAX_FANS;
}

/** Fan growth per 30 days (%) from first to last snapshot; null until two snapshots ≥ 20 hours apart. */
export function fanGrowth30d(snaps: Snap[]): number | null {
  if (snaps.length < 2) return null;
  const s = [...snaps].sort((a, b) => a.captured_at.localeCompare(b.captured_at));
  const a = s[0]!, b = s[s.length - 1]!;
  const days = (Date.parse(b.captured_at) - Date.parse(a.captured_at)) / 86_400_000;
  if (days < 20 / 24 || a.nb_fan <= 0) return null;
  const daily = Math.log(b.nb_fan / a.nb_fan) / days;
  return Math.round((Math.exp(daily * 30) - 1) * 1000) / 10;
}

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

export type DiscoveryFeatures = {
  fans: number;
  topRank: number | null; // Deezer track rank, 0–1,000,000
  playlistHits: number; // appearances across scanned African playlists
  daysSinceRelease: number | null;
  releases12m: number | null;
  growth30d: number | null;
};

/**
 * Breakout index. Weighted, transparent model:
 * traction (rank vs fan base) 30%, momentum (growth) 25%, curator breadth 20%,
 * release activity 15%, headroom (smaller = more upside) 10%.
 * Missing momentum is re-weighted away and lowers confidence.
 */
export type DiscoveryWeights = { traction: number; momentum: number; breadth: number; releases: number; headroom: number };
export function discoveryIndex(f: DiscoveryFeatures, dw: DiscoveryWeights = { traction: 30, momentum: 25, breadth: 20, releases: 15, headroom: 10 }) {
  const tot = dw.traction + dw.momentum + dw.breadth + dw.releases + dw.headroom || 1;
  const parts: { w: number; v: number | null }[] = [
    { w: dw.traction / tot, v: f.topRank == null ? null : clamp(f.topRank / 600_000) },
    { w: dw.momentum / tot, v: f.growth30d == null ? null : clamp(f.growth30d / 60) },
    { w: dw.breadth / tot, v: clamp(Math.log2(1 + f.playlistHits) / 3) },
    { w: dw.releases / tot, v: f.daysSinceRelease == null ? null : clamp(1 - f.daysSinceRelease / 365) * 0.6 + clamp((f.releases12m ?? 0) / 4) * 0.4 },
    { w: dw.headroom / tot, v: clamp(1 - Math.log10(Math.max(f.fans, 1)) / Math.log10(EMERGING_MAX_FANS)) },
  ];
  const known = parts.filter((p) => p.v != null);
  const w = known.reduce((s, p) => s + p.w, 0);
  const score = w ? Math.round((known.reduce((s, p) => s + p.w * p.v!, 0) / w) * 100) : 0;
  const confidence = Math.round(w * 100);
  return { score, confidence };
}

export const ARTISTIC_KEYS = ["songwriting", "vocals", "melody", "production", "originality", "commercial"] as const;
export type ArtisticKey = (typeof ARTISTIC_KEYS)[number];

/** Artistic overall 0–100 from 0–10 sub-scores; songwriting and vocals count double. */
export function artisticOverall(s: Partial<Record<ArtisticKey, number>>, w: Record<ArtisticKey, number> = { songwriting: 2, vocals: 2, melody: 1.5, production: 1, originality: 1.5, commercial: 1 }): number | null {
  let t = 0, ws = 0;
  for (const k of ARTISTIC_KEYS) { const v = s[k]; if (typeof v === "number") { t += clamp(v / 10) * w[k]; ws += w[k]; } }
  return ws ? Math.round((t / ws) * 100) : null;
}

export type Tier = "sign" | "meet" | "watch" | "hold";
/** Recommendation: artistic quality 60%, discovery 40%; artistic quality must clear a floor. */
export type TierRules = { signArtistic: number; signScore: number; meetArtistic: number; meetScore: number; watchScore: number };
export function recommend(discovery: number, artistic: number | null, share = 60, t: TierRules = { signArtistic: 75, signScore: 70, meetArtistic: 65, meetScore: 58, watchScore: 45 }): { score: number; tier: Tier } {
  const a = share / 100;
  if (artistic == null) return { score: Math.round(discovery * (1 - a)), tier: "hold" };
  const score = Math.round(artistic * a + discovery * (1 - a));
  const tier: Tier = artistic >= t.signArtistic && score >= t.signScore ? "sign" : artistic >= t.meetArtistic && score >= t.meetScore ? "meet" : score >= t.watchScore ? "watch" : "hold";
  return { score, tier };
}

/** Monday (UTC) of the week containing d, as YYYY-MM-DD. */
export function weekStart(d = new Date()) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

export const AFRICAN_ISO = new Set(("DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW").split(" "));
export const EAST_AFRICA_ISO = new Set("KE TZ UG RW BI ET SO SS DJ ER SD".split(" "));
