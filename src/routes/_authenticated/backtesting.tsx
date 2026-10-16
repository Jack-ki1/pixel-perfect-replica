import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { artistsQuery, fmt } from "@/lib/artists";
import { backtest } from "@/lib/modules";
import { Panel, DemoBadge, Kpi } from "@/components/br-ui";
import { Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/backtesting")({
  head: () => ({ meta: [{ title: "Backtesting — Breakout Radar" }, { name: "description", content: "Test growth forecasts against history." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(artistsQuery),
  component: Backtesting,
});

function Backtesting() {
  const { data } = useSuspenseQuery(artistsQuery);
  const [cut, setCut] = useState(3);
  const rows = data.map((a) => ({ a, r: backtest(a, cut) })).filter((x) => x.r);
  const mae = rows.length ? Math.round(rows.reduce((s, x) => s + Math.abs(x.r!.errorPct), 0) / rows.length) : 0;
  const within = rows.filter((x) => Math.abs(x.r!.errorPct) <= 20).length;
  return (
    <div className="space-y-4">
      <Panel title="Backtesting workbench" sub="Forecast each artist from early months only, then compare with what actually happened." action={<DemoBadge />}>
        <label className="flex items-center gap-3 text-sm">Train on first <b className="num">{cut}</b> months
          <input type="range" min={2} max={5} value={cut} onChange={(e) => setCut(+e.target.value)} aria-label="Training months" />
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Kpi icon={<Target className="size-4" />} value={`${mae}%`} label="Average forecast error" />
          <Kpi icon={<Target className="size-4" />} value={`${within}/${rows.length}`} label="Within ±20%" tone="cyan" />
          <Kpi icon={<Target className="size-4" />} value={6 - cut} label="Months forecast ahead" tone="violet" />
        </div>
      </Panel>
      <Panel title="Results by artist">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Artist</th><th>Forecast</th><th>Actual</th><th>Error</th></tr></thead>
          <tbody className="divide-y">
            {rows.map(({ a, r }) => (
              <tr key={a.id}><td className="py-2">{a.name}</td><td className="num">{fmt(r!.predicted)}</td><td className="num">{fmt(r!.actual)}</td>
                <td className={`num ${Math.abs(r!.errorPct) <= 20 ? "text-lime" : "text-amber"}`}>{r!.errorPct > 0 ? "+" : ""}{r!.errorPct}%</td></tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-muted-foreground">Naive compound-growth baseline on demo series. Large negative errors mean the artist broke out faster than early data suggested.</p>
      </Panel>
    </div>
  );
}
