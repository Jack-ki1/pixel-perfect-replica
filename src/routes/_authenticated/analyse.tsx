import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Headphones, Music2, Mic2, PenLine } from "lucide-react";
import { liveArtistsQuery, analysesQuery, latestByArtist, type AnalysisJson } from "@/lib/live";
import { analyseNow } from "@/lib/radar.functions";
import { ARTISTIC_KEYS, weekStart } from "@/lib/scoring";
import { Panel, Avatar, ScoreRing, Bar, Empty, Kpi } from "@/components/br-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/analyse")({
  head: () => ({ meta: [
    { title: "Analyse — Breakout Radar" },
    { name: "description", content: "Weekly AI listening review of artistic quality: songwriting, key, vocals." },
    { property: "og:title", content: "Analyse — Breakout Radar" },
    { property: "og:description", content: "Weekly AI listening review of artistic quality." },
  ] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(liveArtistsQuery), context.queryClient.ensureQueryData(analysesQuery)]),
  component: Analyse,
});

const LABEL: Record<string, string> = { songwriting: "Songwriting", vocals: "Vocals", melody: "Melody", production: "Production", originality: "Originality", commercial: "Commercial" };

function Analyse() {
  const { data: artists } = useSuspenseQuery(liveArtistsQuery);
  const { data: analyses } = useSuspenseQuery(analysesQuery);
  const qc = useQueryClient();
  const go = useServerFn(analyseNow);
  const wk = weekStart();
  const thisWeek = analyses.filter((a) => a.week_start === wk);
  const latest = latestByArtist(analyses);
  const byId = new Map(artists.map((a) => [a.id, a]));
  const rows = [...latest.values()].filter((r) => byId.has(r.artist_id)).sort((a, b) => Number(b.overall) - Number(a.overall));
  const run = useMutation({
    mutationFn: () => go(),
    onSuccess: (r) => { r.failed ? toast.warning(`Reviewed ${r.analysed}, ${r.failed} could not be reviewed`) : toast.success(`Reviewed ${r.analysed} artists`); qc.invalidateQueries({ queryKey: ["live_analyses"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const avg = (k: string) => rows.length ? Math.round(rows.reduce((s, r) => s + ((r.result as AnalysisJson).scores?.[k as "vocals"] ?? 0), 0) / rows.length * 10) / 10 : "—";

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-6">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-violet"><Headphones className="size-3.5" /> Weekly artistic review</div>
          <h1 className="text-3xl font-bold">Is the music actually good?</h1>
          <p className="mt-2 text-sm text-muted-foreground">Every Monday the AI listens to the top-ranked artists' leading track and judges songwriting, key and harmony, vocals, melody, production, originality and commercial pull. Songwriting and vocals count double. AI judgements are a first listen — your team has the final word.</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <Button onClick={() => run.mutate()} disabled={run.isPending || !artists.length}>{run.isPending ? "Listening… (about a minute)" : "Review next 3 artists"}</Button>
          <div className="mt-2">Week of {wk} · {thisWeek.length} reviewed so far</div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<Music2 className="size-4" />} value={rows.length} label="Artists reviewed" tone="violet" />
        <Kpi icon={<PenLine className="size-4" />} value={avg("songwriting")} label="Avg songwriting /10" />
        <Kpi icon={<Mic2 className="size-4" />} value={avg("vocals")} label="Avg vocals /10" tone="cyan" />
        <Kpi icon={<Headphones className="size-4" />} value={thisWeek.length} label="Reviewed this week" tone="amber" />
      </div>

      {rows.length === 0 ? <Empty>No reviews yet. Run Discovery first, then press <b>Review next 3 artists</b>.</Empty> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((r) => { const a = byId.get(r.artist_id)!; const j = r.result as AnalysisJson; return (
            <Panel key={r.id}>
              <div className="flex items-start gap-3">
                <Avatar src={a.picture} name={a.name} className="size-12" />
                <div className="min-w-0 flex-1">
                  <Link to="/artist/$id" params={{ id: a.id }} className="font-semibold hover:text-lime">{a.name}</Link>
                  <div className="truncate text-xs text-muted-foreground">“{r.track_title}” · {j.genre} · {j.language}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-full border px-2 py-0.5">Key: {j.key}{j.mode && !j.key.toLowerCase().includes(j.mode.toLowerCase()) ? ` ${j.mode}` : ""}</span>
                    <span className="rounded-full border px-2 py-0.5 num">{j.tempo_bpm ?? r.deezer_bpm ?? "?"} BPM</span>
                    <span className="rounded-full border px-2 py-0.5">Week {r.week_start}</span>
                  </div>
                </div>
                <ScoreRing value={Number(r.overall)} tone="violet" size={46} />
              </div>
              <div className="mt-4 grid gap-1.5">{ARTISTIC_KEYS.map((k) => (
                <div key={k} className="flex items-center gap-3 text-xs"><span className="w-24">{LABEL[k]}</span><Bar value={j.scores[k]} className={k === "songwriting" || k === "vocals" ? "bg-violet" : undefined} /><span className="w-6 text-right num">{j.scores[k]}</span></div>))}</div>
              <dl className="mt-4 grid gap-2 text-xs">
                <div><dt className="font-semibold">Vocals</dt><dd className="text-muted-foreground">{j.vocals.tone}; {j.vocals.range}; pitch: {j.vocals.pitch_control}; {j.vocals.delivery}</dd></div>
                <div><dt className="font-semibold">Songwriting</dt><dd className="text-muted-foreground">Hook: {j.songwriting.hook}. Structure: {j.songwriting.structure}. Themes: {j.songwriting.lyric_themes}</dd></div>
              </dl>
              <p className="mt-3 text-sm">{j.summary}</p>
            </Panel>); })}
        </div>
      )}
    </div>
  );
}
