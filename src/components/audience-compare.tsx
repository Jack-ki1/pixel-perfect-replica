import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { Snapshot } from "@/lib/artists";
import { compareSegments, isSuppressed } from "@/lib/analytics";
import { Panel } from "@/components/br-ui";
import { cn } from "@/lib/utils";

const COLORS = ["var(--lime)", "var(--cyan)", "var(--violet)", "var(--amber)", "var(--chart-5)"];
const DIMS: [string, string][] = [["age", "Age bracket"], ["city", "Market"], ["new_vs_returning", "New vs returning"], ["platform", "Platform"]];

type Segs = Record<string, Record<string, number>>;

function Donut({ data, label }: { data: Record<string, number>; label: string }) {
  const rows = Object.entries(data).map(([name, value]) => ({ name, value }));
  const top = rows[0];
  return (
    <div className="relative h-36 w-36">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={rows} dataKey="value" innerRadius={44} outerRadius={64} stroke="none">
            {rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div><div className="font-display text-lg font-bold num">{top?.value}%</div><div className="text-[10px] text-muted-foreground">{top?.name} · {label}</div></div>
      </div>
    </div>
  );
}

export function AudienceCompare({ prior, current }: { prior: Snapshot; current: Snapshot }) {
  const ps = prior.segments as Segs;
  const cs = current.segments as Segs;
  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-cyan/30 bg-cyan/5 p-3 text-xs text-muted-foreground">
        Comparing aggregate snapshots: <b className="text-foreground">{prior.reference_date}</b> ({prior.window_days}d window, {prior.total.toLocaleString()} people) → <b className="text-foreground">{current.reference_date}</b> ({current.window_days}d, {current.total.toLocaleString()}). Source: {current.source}.
        Aggregate snapshots cannot show whether the same individual listeners stayed or left — share change and absolute change are reported separately.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {DIMS.map(([key, label]) => {
          const rows = compareSegments(ps[key] ?? {}, prior.total, cs[key] ?? {}, current.total);
          return (
            <Panel key={key} title={label}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-center"><Donut data={ps[key] ?? {}} label="prior" /><div className="text-[10px] text-muted-foreground">Prior</div></div>
                <div className="text-center"><Donut data={cs[key] ?? {}} label="latest" /><div className="text-[10px] text-muted-foreground">Latest</div></div>
                <table className="min-w-52 flex-1 text-xs">
                  <thead className="text-muted-foreground"><tr><th className="text-left font-normal">Segment</th><th className="text-right font-normal">Share</th><th className="text-right font-normal">Δ pp</th><th className="text-right font-normal">Δ people</th></tr></thead>
                  <tbody>
                    {rows.map((r) => {
                      const hidden = isSuppressed(r.currentShare, current.total);
                      return (
                        <tr key={r.segment} className="border-t border-border/50">
                          <td className="py-1.5">{r.segment}</td>
                          <td className="text-right num">{hidden ? "<50" : `${r.currentShare}%`}</td>
                          <td className={cn("text-right num", r.ppChange > 0 ? "text-lime" : r.ppChange < 0 ? "text-amber" : "")}>{hidden ? "—" : `${r.ppChange > 0 ? "+" : ""}${r.ppChange}`}</td>
                          <td className={cn("text-right num", r.absChange >= 0 ? "text-lime" : "text-amber")}>{hidden ? "—" : `${r.absChange >= 0 ? "+" : ""}${r.absChange.toLocaleString()}`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

export function morphNarrative(prior: Snapshot, current: Snapshot): string {
  const rows = compareSegments((prior.segments as Segs)["age"] ?? {}, prior.total, (current.segments as Segs)["age"] ?? {}, current.total);
  const gain = [...rows].sort((a, b) => b.ppChange - a.ppChange)[0];
  const loss = [...rows].sort((a, b) => a.ppChange - b.ppChange)[0];
  if (!gain || !loss) return "Insufficient segment data.";
  const cross = compareSegments((prior.segments as Segs)["city"] ?? {}, prior.total, (current.segments as Segs)["city"] ?? {}, current.total).find((r) => r.segment === "Cross-border");
  return `Largest share gain: ${gain.segment} (${gain.ppChange > 0 ? "+" : ""}${gain.ppChange} pp). Largest share loss: ${loss.segment} (${loss.ppChange} pp)${loss.absChange > 0 ? `, though this group still grew by ${loss.absChange.toLocaleString()} people` : ""}. Cross-border share ${cross ? `${cross.priorShare}% → ${cross.currentShare}%` : "n/a"}.`;
}
