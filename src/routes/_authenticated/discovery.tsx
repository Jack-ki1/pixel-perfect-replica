import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Radar, Users, ListMusic, Activity, RefreshCw, Globe2, TrendingUp, Gauge, Disc3, ShieldOff } from "lucide-react";
import { BarPlot, DonutPlot, ScatterPlot, AreaPlot, histogram, countBy } from "@/components/charts";
import { liveArtistsQuery, runsQuery, allArtistsQuery, feat, fmt, ago } from "@/lib/live";
import { discoverNow, reapplyFilters } from "@/lib/radar.functions";
import { EAST_AFRICA_ISO } from "@/lib/scoring";
import { Panel, Kpi, ScoreRing, Avatar, Empty } from "@/components/br-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/discovery")({
  head: () => ({ meta: [
    { title: "Discovery — Breakout Radar" },
    { name: "description", content: "Autonomous discovery of emerging African artists from live data." },
    { property: "og:title", content: "Discovery — Breakout Radar" },
    { property: "og:description", content: "Autonomous discovery of emerging African artists from live data." },
  ] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(liveArtistsQuery), context.queryClient.ensureQueryData(runsQuery), context.queryClient.ensureQueryData(allArtistsQuery)]),
  component: Discovery,
});

const REGION = { all: "All Africa", east: "East Africa", unverified: "Country unverified" } as const;

function Discovery() {
  const { data: artists } = useSuspenseQuery(liveArtistsQuery);
  const { data: runs } = useSuspenseQuery(runsQuery);
  const { data: all } = useSuspenseQuery(allArtistsQuery);
  const refilter = useServerFn(reapplyFilters);
  const recheck = useMutation({
    mutationFn: () => refilter(),
    onSuccess: (r) => { toast.success(`${r.kept} emerging kept · ${r.excluded} already-established removed`); ["live_artists", "live_artists_all"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e: Error) => toast.error(e.message),
  });
  const qc = useQueryClient();
  const discover = useServerFn(discoverNow);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<keyof typeof REGION>("all");
  const run = useMutation({
    mutationFn: () => discover(),
    onSuccess: (s) => { toast.success(`Scanned ${s.playlists} playlists · ${s.emerging} emerging artists · ${s.new} new`); ["live_artists", "live_artists_all", "discovery_runs"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e: Error) => toast.error(`Discovery failed: ${e.message}`),
  });
  const rows = useMemo(() => artists.filter((a) =>
    (!q || a.name.toLowerCase().includes(q.toLowerCase())) &&
    (region === "all" || (region === "east" ? !!a.country && EAST_AFRICA_ISO.has(a.country) || (!a.country && a.seed_sources.some((s) => /bongo|genge|kenya|tanzania|uganda|rwanda|arban|singeli|ethiop|east/.test(s))) : !a.country))), [artists, q, region]);
  const lastRun = runs.find((r) => r.kind.startsWith("discovery"));
  const withGrowth = artists.filter((a) => feat(a).growth30d != null).length;
  const excluded = all.filter((a) => a.excluded_reason);
  const scores = artists.map((a) => Number(a.discovery_score ?? 0));
  const avgScore = scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : 0;
  const growths = artists.map((a) => feat(a).growth30d).filter((g): g is number => g != null);
  const medGrowth = growths.length ? [...growths].sort((a, b) => a - b)[Math.floor(growths.length / 2)]! : null;
  const recent = artists.filter((a) => a.latest_release && Date.now() - Date.parse(a.latest_release) < 90 * 864e5).length;
  const scanRuns = runs.filter((r) => r.kind.startsWith("discovery")).slice().reverse().map((r) => { const st = (r.stats ?? {}) as Record<string, number>; return { name: r.started_at.slice(5, 10), Emerging: st.emerging ?? 0, New: st.new ?? 0, Filtered: st.established ?? 0 }; });

  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-lime/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-lime"><Radar className="size-3.5" /> Autonomous discovery · live data</div>
            <h1 className="text-3xl font-bold">Who is about to break in Africa</h1>
            <p className="mt-2 text-sm text-muted-foreground">Every day the radar scans African curator playlists, drops anyone already established (big fan base, large catalogue, hit-level tracks, a Wikipedia article or on your exclusion list), checks their country, tracks fan growth and release activity, and ranks them with a breakout index (0–100, a ranking — not a probability).</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <Button variant="outline" className="mr-2" onClick={() => recheck.mutate()} disabled={recheck.isPending}><ShieldOff className="size-4" />{recheck.isPending ? "Checking…" : "Remove established artists"}</Button>
            <Button onClick={() => run.mutate()} disabled={run.isPending}><RefreshCw className={cn("size-4", run.isPending && "animate-spin")} />{run.isPending ? "Scanning… (up to a minute)" : "Run discovery now"}</Button>
            <div className="mt-2">{lastRun ? <>Last scan {ago(lastRun.started_at)}{lastRun.error ? " · had an error" : ""}</> : "No scans yet"} · runs daily automatically</div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<Users className="size-4" />} value={artists.length} label="Emerging artists tracked" />
        <Kpi icon={<Globe2 className="size-4" />} value={artists.filter((a) => a.country && EAST_AFRICA_ISO.has(a.country)).length} label="Confirmed East African" tone="cyan" />
        <Kpi icon={<Activity className="size-4" />} value={withGrowth} label="With measured fan growth" tone="violet" />
        <Kpi icon={<ListMusic className="size-4" />} value={new Set(artists.flatMap((a) => a.seed_sources)).size} label="Scenes scanned" tone="amber" />
        <Kpi icon={<Gauge className="size-4" />} value={avgScore} label="Average breakout index" />
        <Kpi icon={<TrendingUp className="size-4" />} value={medGrowth == null ? "pending" : `${medGrowth}%`} label="Median 30-day fan growth" tone="cyan" />
        <Kpi icon={<Disc3 className="size-4" />} value={recent} label="Released in last 90 days" tone="violet" />
        <Kpi icon={<ShieldOff className="size-4" />} value={excluded.length} label="Already-popular artists filtered out" tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BarPlot title="Breakout index distribution" sub="How many artists fall in each score band" data={histogram(scores, [0, 20, 30, 40, 50, 60, 70, 101], (lo, hi) => `${lo}-${hi === 101 ? 100 : hi}`)} />
        <DonutPlot title="Country mix" sub="Confirmed via MusicBrainz" data={countBy(artists, (a) => a.country ?? "Unverified", 6)} />
        <BarPlot title="Fan base size" sub="Smaller = earlier stage" color={1} data={histogram(artists.map((a) => a.nb_fan), [0, 500, 1000, 2500, 5000, 10000, 1e9], (lo, hi) => hi > 1e8 ? `${fmt(lo)}+` : `<${fmt(hi)}`)} />
        <ScatterPlot title="Fans vs breakout index" sub="Top-left = small but rising fast" x="Fans" y="Index" data={artists.map((a) => ({ name: a.name, x: a.nb_fan, y: Number(a.discovery_score ?? 0) }))} />
        <BarPlot title="Strongest scenes" sub="Artists found per scene" color={2} horizontal data={countBy(artists.flatMap((a) => a.seed_sources.map((s) => ({ s }))), (r) => r.s, 8)} />
        <BarPlot title="Why artists were filtered out" sub="Already established, so excluded" color={3} horizontal data={countBy(excluded, (a) => a.excluded_reason?.replace(/\(.*\)/, "").trim(), 6)} />
      </div>
      <AreaPlot title="Scan history" sub="Emerging artists kept, new arrivals and established artists filtered per scan" data={scanRuns} keys={["Emerging", "New", "Filtered"]} />

      <Panel title="Breakout ranking" sub="Fan growth appears after the radar has seen an artist on two separate days."
        action={<div className="flex flex-wrap gap-2">
          {(Object.keys(REGION) as (keyof typeof REGION)[]).map((r) => <Button key={r} size="sm" variant={region === r ? "default" : "ghost"} onClick={() => setRegion(r)}>{REGION[r]}</Button>)}
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find artist…" className="h-8 w-44" aria-label="Find artist" />
        </div>}>
        {artists.length === 0 ? <Empty>No artists yet. Press <b>Run discovery now</b> to start the first live scan.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="py-2">#</th><th>Artist</th><th>Country</th><th className="text-right">Fans</th><th className="text-right">30d growth</th><th className="text-right">Playlists</th><th>Latest release</th><th>Confidence</th><th>Index</th></tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((a, i) => { const f = feat(a); return (
                  <tr key={a.id} className="hover:bg-accent/40">
                    <td className="py-2.5 num text-muted-foreground">{i + 1}</td>
                    <td><Link to="/artist/$id" params={{ id: a.id }} className="flex items-center gap-2.5 font-medium hover:text-lime"><Avatar src={a.picture} name={a.name} className="size-8" />{a.name}</Link>
                      <div className="ml-10 text-[11px] text-muted-foreground">{a.seed_sources.slice(0, 2).join(", ")}</div></td>
                    <td className="text-xs">{a.country ?? <span className="text-muted-foreground">unverified</span>}</td>
                    <td className="text-right num">{fmt(a.nb_fan)}</td>
                    <td className={cn("text-right num", (f.growth30d ?? 0) > 0 ? "text-lime" : "text-muted-foreground")}>{f.growth30d == null ? "pending" : `${f.growth30d > 0 ? "+" : ""}${f.growth30d}%`}</td>
                    <td className="text-right num">{a.playlist_hits}</td>
                    <td className="text-xs text-muted-foreground">{a.latest_release ?? "—"}</td>
                    <td className="text-xs num">{f.confidence ?? 0}%</td>
                    <td><ScoreRing value={a.discovery_score == null ? null : Number(a.discovery_score)} size={34} /></td>
                  </tr>); })}
              </tbody>
            </table>
            {!rows.length && <p className="py-6 text-center text-sm text-muted-foreground">No artists match.</p>}
          </div>
        )}
      </Panel>
      <p className="text-[11px] text-muted-foreground">Sources: Deezer public catalogue (fans, playlists, releases, previews) and MusicBrainz (country). Index weights: traction 30%, fan growth 25%, curator breadth 20%, release activity 15%, headroom 10%.</p>
    </div>
  );
}
