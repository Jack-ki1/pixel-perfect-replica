import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Artist, Scores, SeriesPoint } from "@/lib/artists";

export const tableQuery = <T extends "saved_searches" | "integrity_cases" | "artistic_reviews" | "alerts" | "dev_tasks">(t: T) =>
  queryOptions({
    queryKey: [t],
    queryFn: async () => {
      const { data, error } = await supabase.from(t).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const sc = (a: Artist) => (a.scores ?? {}) as Scores;
export const series = (a: Artist) => (a.series ?? []) as SeriesPoint[];

/** Demo model: transparent weighted index, NOT a probability. */
export const MODELS = [
  { id: "br-index-v1", name: "Breakout Index v1", status: "production", trained: "2026-08-01", weights: { momentum: 0.3, fan_depth: 0.2, ugc_impact: 0.2, organic: 0.15, market_expansion: 0.15 } },
  { id: "br-index-v2", name: "Breakout Index v2 (candidate)", status: "shadow", trained: "2026-09-20", weights: { momentum: 0.25, fan_depth: 0.25, ugc_impact: 0.15, organic: 0.2, audience_evolution: 0.15 } },
] as const;

export function modelScore(a: Artist, weights: Record<string, number>) {
  const s = sc(a) as Record<string, number | null | undefined>;
  let tot = 0, w = 0;
  for (const [k, v] of Object.entries(weights)) { const x = s[k]; if (x != null) { tot += x * v; w += v; } }
  return w ? Math.round(tot / w) : null;
}

/** Backtest: predict from first `cut` months, compare with actual final growth. */
export function backtest(a: Artist, cut: number) {
  const pts = series(a);
  if (pts.length <= cut || cut < 2) return null;
  const first = pts[0]!.a, last = pts[cut - 1]!.a, actual = pts[pts.length - 1]!.a;
  const rate = (last / first) ** (1 / (cut - 1));
  const predicted = Math.round(last * rate ** (pts.length - cut));
  return { predicted, actual, errorPct: Math.round(((predicted - actual) / actual) * 100) };
}

export const SOURCES = [
  { name: "Streaming fixtures", kind: "Streaming", status: "Demo fixture", fresh: "14 Sep 2026" },
  { name: "Short-video UGC fixtures", kind: "Social / UGC", status: "Demo fixture", fresh: "14 Sep 2026" },
  { name: "Audience snapshots", kind: "Demographics", status: "Demo fixture", fresh: "14 Sep 2026" },
  { name: "Live & ticketing", kind: "Live", status: "Not connected", fresh: "—" },
  { name: "Artist-provided analytics", kind: "First-party", status: "Not connected", fresh: "—" },
];
