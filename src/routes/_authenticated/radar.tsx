import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Activity, AlertTriangle, Radar, ShieldCheck, Sparkles, Users, Download, ArrowRight } from "lucide-react";
import { artistsQuery, auditQuery, fmt, stageLabel, type Artist } from "@/lib/artists";
import { growthMultiplier, isEligibleClean } from "@/lib/analytics";
import { Panel, Portrait, DemoBadge, ScoreRing, IntegrityChip, Kpi } from "@/components/br-ui";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/_authenticated/radar")({
  head: () => ({ meta: [{ title: "Command Centre — Breakout Radar" }, { name: "description", content: "Today's breakouts and A&R signals." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(artistsQuery),
  component: RadarPage,
});

const COUNTRIES = ["All", "Kenya", "Uganda", "Tanzania", "Nigeria", "Ghana", "South Africa"];

function exportCsv(rows: Artist[]) {
  const head = ["canonical_id", "name", "country", "genre", "stage", "growth_30d", "expected_growth_30d", "priority", "integrity", "confidence", "is_demo"];
  const lines = rows.map((a) => [a.canonical_id, a.name, a.country, a.genre, a.stage, a.growth_30d, a.expected_growth_30d, (a.scores as Record<string, number>)["priority"], a.integrity, a.evidence_confidence, a.is_demo].join(","));
  const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const el = document.createElement("a");
  el.href = url; el.download = "breakouts-demo.csv"; el.click();
  URL.revokeObjectURL(url);
}

function RadarPage() {
  const { data: artists } = useSuspenseQuery(artistsQuery);
  const { data: audit } = useQuery(auditQuery);
  const [country, setCountry] = useState("All");
  const [cleanOnly, setCleanOnly] = useState(true);

  const ranked = useMemo(
    () => artists
      .filter((a) => country === "All" || a.country === country)
      .filter((a) => !cleanOnly || isEligibleClean(a.integrity))
      .sort((a, b) => ((b.scores as Record<string, number>)["priority"] ?? 0) - ((a.scores as Record<string, number>)["priority"] ?? 0)),
    [artists, country, cleanOnly],
  );
  const review = artists.filter((a) => a.integrity === "suspicious");

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border">
        <img src={hero} alt="Artist performing on stage" className="absolute inset-0 h-full w-full object-cover object-right" width={1600} height={640} />
        <div className="hero-fade absolute inset-0" />
        <div className="relative max-w-xl p-8">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Confidential · Internal A&R <DemoBadge /></div>
          <h1 className="text-4xl font-bold leading-tight">Find Tomorrow’s Stars <span className="text-lime">Today.</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">Evidence-based discovery of emerging African artists. Scores are relative indicators, not probabilities.</p>
          <div className="mt-5 flex gap-3">
            <Button asChild><Link to="/pipeline">Open pipeline <ArrowRight /></Link></Button>
            <Button asChild variant="outline"><Link to="/audience">Audience shifts</Link></Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={<Users className="size-4" />} value={artists.length} label="Artists monitored" tone="violet" />
        <Kpi icon={<Sparkles className="size-4" />} value={artists.filter((a) => (growthMultiplier(Number(a.growth_30d), Number(a.expected_growth_30d)) ?? 0) >= 3).length} label="Breakouts (≥3× expected)" />
        <Kpi icon={<AlertTriangle className="size-4" />} value={review.length} label="Integrity reviews open" tone="amber" />
        <Kpi icon={<Activity className="size-4" />} value={artists.length} label="Audience shifts tracked" tone="cyan" />
        <Kpi icon={<ShieldCheck className="size-4" />} value={artists.filter((a) => a.artistic_status === "Review due" || a.artistic_status === "In review").length} label="Artistic reviews due" tone="violet" />
        <Kpi icon={<Radar className="size-4" />} value="—" label="Predictions validated (no trained model)" tone="cyan" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Panel
          title="Today’s Breakouts"
          sub={cleanOnly ? "Ranking eligible clean candidates only · artists under integrity review listed separately" : "All candidates, including those under review"}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Territory" value={country} onChange={(e) => setCountry(e.target.value)} className="h-8 rounded-md border bg-panel-raised px-2 text-xs">
                {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={cleanOnly} onChange={(e) => setCleanOnly(e.target.checked)} className="accent-lime" /> Clean cohort</label>
              <Button size="sm" variant="outline" onClick={() => exportCsv(ranked)}><Download /> CSV</Button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b"><th className="py-2 pr-2">#</th><th>Artist</th><th>Genre</th><th className="text-right">Audience</th><th className="text-right">Growth 30d</th><th className="text-right">vs expected</th><th className="text-center">Priority</th><th>Integrity</th><th className="text-right">Confidence</th><th>Next action</th></tr>
              </thead>
              <tbody>
                {ranked.map((a, i) => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-accent/40">
                    <td className="py-3 pr-2 text-muted-foreground num">{i + 1}</td>
                    <td>
                      <Link to="/artists/$id" params={{ id: a.id }} className="flex items-center gap-3 font-medium hover:text-lime">
                        <Portrait seed={a.portrait_seed} name={a.name} className="size-9" />
                        <span><span className="block">{a.name}</span><span className="text-xs text-muted-foreground">{a.city}, {a.country}</span></span>
                      </Link>
                    </td>
                    <td className="text-xs">{a.genre}</td>
                    <td className="text-right num">{fmt(a.audience_current)}</td>
                    <td className="text-right font-semibold text-lime num">+{Number(a.growth_30d)}%</td>
                    <td className="text-right num">{growthMultiplier(Number(a.growth_30d), Number(a.expected_growth_30d))}×</td>
                    <td><div className="flex justify-center"><ScoreRing value={(a.scores as Record<string, number>)["priority"]} size={34} /></div></td>
                    <td><IntegrityChip value={a.integrity} /></td>
                    <td className="text-right num">{a.evidence_confidence}%</td>
                    <td className="max-w-40 truncate text-xs text-muted-foreground" title={a.next_action ?? ""}>{a.next_action ?? "—"}</td>
                  </tr>
                ))}
                {ranked.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-sm text-muted-foreground">No eligible candidates for this filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Under integrity review" sub="Advisory signals — not accusations">
            <ul className="space-y-3">
              {review.map((a) => (
                <li key={a.id}><Link to="/artists/$id" params={{ id: a.id }} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent">
                  <Portrait seed={a.portrait_seed} name={a.name} className="size-8" />
                  <div className="min-w-0 text-sm"><div className="font-medium">{a.name}</div><div className="truncate text-xs text-muted-foreground">{a.next_action}</div></div>
                </Link></li>
              ))}
              {review.length === 0 && <li className="text-xs text-muted-foreground">No open cases.</li>}
            </ul>
          </Panel>
          <Panel title="Recent pipeline activity">
            <ul className="space-y-2 text-xs">
              {(audit ?? []).map((e) => {
                const d = e.detail as { artist?: string; from?: string; to?: string } | null;
                return <li key={e.id} className="border-l-2 border-lime/60 pl-3"><span className="font-medium">{d?.artist}</span> moved to {stageLabel((d?.to ?? "identified") as never)}<div className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div></li>;
              })}
              {audit && audit.length === 0 && <li className="text-muted-foreground">No moves yet — drag a card on the pipeline board.</li>}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
