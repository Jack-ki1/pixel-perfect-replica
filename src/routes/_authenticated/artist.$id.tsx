import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { liveArtistQuery, snapshotsQuery, analysesQuery, feat, fmt, type AnalysisJson } from "@/lib/live";
import { analyseOne } from "@/lib/radar.functions";
import { ARTISTIC_KEYS } from "@/lib/scoring";
import { Panel, Avatar, ScoreRing, Bar, Empty } from "@/components/br-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/artist/$id")({
  head: () => ({ meta: [{ title: "Artist — Breakout Radar" }, { name: "description", content: "Live artist profile with discovery signals and artistic review." }, { name: "robots", content: "noindex" }] }),
  loader: async ({ context, params }) => {
    const a = await context.queryClient.ensureQueryData(liveArtistQuery(params.id));
    if (!a) throw notFound();
    await Promise.all([context.queryClient.ensureQueryData(snapshotsQuery(params.id)), context.queryClient.ensureQueryData(analysesQuery)]);
  },
  component: ArtistPage,
});

function ArtistPage() {
  const { id } = Route.useParams();
  const { data: a } = useSuspenseQuery(liveArtistQuery(id));
  const { data: snaps } = useSuspenseQuery(snapshotsQuery(id));
  const { data: all } = useSuspenseQuery(analysesQuery);
  const qc = useQueryClient();
  const listen = useServerFn(analyseOne);
  const mine = all.filter((x) => x.artist_id === id);
  const run = useMutation({
    mutationFn: () => listen({ data: { id } }),
    onSuccess: (r) => { if (r.ok) { toast.success(`Reviewed: ${r.overall}/100`); qc.invalidateQueries({ queryKey: ["live_analyses"] }); } else toast.error(r.error); },
  });
  if (!a) return null;
  const f = feat(a);
  const chart = snaps.map((s) => ({ d: s.captured_at.slice(5, 10), fans: s.nb_fan }));
  const j = mine[0]?.result as AnalysisJson | undefined;

  return (
    <div className="space-y-6">
      <Link to="/discovery" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3" /> Discovery</Link>
      <section className="panel flex flex-wrap items-center gap-5 p-6">
        <Avatar src={a.picture} name={a.name} className="size-24" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{a.name}</h1>
          <div className="text-sm text-muted-foreground">{a.country ?? "Country unverified"} ({a.region_source}) · {fmt(a.nb_fan)} fans · {a.nb_album} releases</div>
          <div className="mt-2 flex flex-wrap gap-1.5">{a.seed_sources.map((s) => <span key={s} className="rounded-full border px-2 py-0.5 text-[11px]">{s}</span>)}</div>
        </div>
        <div className="flex gap-4 text-center text-[10px] text-muted-foreground">
          <div><ScoreRing value={a.discovery_score == null ? null : Number(a.discovery_score)} tone="cyan" size={60} />Discovery</div>
          <div><ScoreRing value={mine[0] ? Number(mine[0].overall) : null} tone="violet" size={60} />Artistic</div>
        </div>
        {a.link && <Button asChild variant="outline" size="sm"><a href={a.link} target="_blank" rel="noreferrer">Listen <ExternalLink className="size-3.5" /></a></Button>}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Panel title="Fan growth" sub={`${snaps.length} live snapshots`}>
          {snaps.length < 2 ? <Empty>Growth appears after the radar sees this artist on a second day.</Empty> : (
            <div className="h-56"><ResponsiveContainer><LineChart data={chart}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={11} /><YAxis stroke="var(--muted-foreground)" fontSize={11} width={50} /><Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} /><Line dataKey="fans" stroke="var(--lime)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>)}
        </Panel>
        <Panel title="Discovery signals" sub={`Confidence ${f.confidence ?? 0}%`}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-[11px] text-muted-foreground">30-day growth</dt><dd className="num">{f.growth30d == null ? "pending" : `${f.growth30d}%`}</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Best track rank</dt><dd className="num">{a.top_rank ? fmt(a.top_rank) : "—"}</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Playlist appearances</dt><dd className="num">{a.playlist_hits}</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Releases (12 mo)</dt><dd className="num">{a.releases_12m ?? "—"}</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Latest release</dt><dd>{a.latest_release ?? "—"}</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">First seen</dt><dd>{a.first_seen.slice(0, 10)}</dd></div>
          </dl>
        </Panel>
      </div>

      <Panel title="Artistic review" sub={mine[0] ? `“${mine[0].track_title}” · week of ${mine[0].week_start}` : "Not reviewed yet"}
        action={<Button size="sm" onClick={() => run.mutate()} disabled={run.isPending}>{run.isPending ? "Listening…" : mine[0] ? "Re-review this week" : "Review now"}</Button>}>
        {!j ? <Empty>The AI will listen to this artist's top track preview and score the music.</Empty> : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1.5">{ARTISTIC_KEYS.map((k) => <div key={k} className="flex items-center gap-3 text-xs"><span className="w-24 capitalize">{k}</span><Bar value={j.scores[k]} /><span className="w-6 text-right num">{j.scores[k]}</span></div>)}
              <p className="pt-3 text-sm">{j.summary}</p><p className="text-sm font-medium text-lime">{j.recommendation}</p></div>
            <dl className="space-y-2 text-xs">
              <div><dt className="font-semibold">Key & tempo</dt><dd className="text-muted-foreground">{j.key} {j.mode ?? ""} · {j.tempo_bpm ?? mine[0]!.deezer_bpm ?? "?"} BPM · {j.genre} · {j.language}</dd></div>
              <div><dt className="font-semibold">Vocals</dt><dd className="text-muted-foreground">{j.vocals.tone}; range {j.vocals.range}; pitch {j.vocals.pitch_control}; {j.vocals.delivery}</dd></div>
              <div><dt className="font-semibold">Songwriting</dt><dd className="text-muted-foreground">{j.songwriting.hook} · {j.songwriting.structure} · {j.songwriting.lyric_themes}</dd></div>
              <div><dt className="font-semibold">Strengths</dt><dd className="text-muted-foreground">{j.strengths.join("; ")}</dd></div>
              <div><dt className="font-semibold">Risks</dt><dd className="text-muted-foreground">{j.risks.join("; ")}</dd></div>
              {j.comparable_artists?.length ? <div><dt className="font-semibold">Sounds like</dt><dd className="text-muted-foreground">{j.comparable_artists.join(", ")}</dd></div> : null}
            </dl>
          </div>)}
        {mine.length > 1 && <div className="mt-4 text-xs text-muted-foreground">History: {mine.map((m) => `${m.week_start}: ${m.overall}`).join(" · ")}</div>}
      </Panel>
    </div>
  );
}
