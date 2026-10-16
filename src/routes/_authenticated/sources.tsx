import { createFileRoute } from "@tanstack/react-router";
import { SOURCES } from "@/lib/modules";
import { Panel, DemoBadge } from "@/components/br-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sources")({
  head: () => ({ meta: [{ title: "Data Sources — Breakout Radar" }, { name: "description", content: "Where Breakout Radar's data comes from." }] }),
  component: Sources,
});

function Sources() {
  return (
    <Panel title="Data Sources" sub="Every number in the app traces back to one of these. Real platform feeds are not connected yet." action={<DemoBadge />}>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Source</th><th>Type</th><th>Status</th><th>Last updated</th></tr></thead>
        <tbody className="divide-y">
          {SOURCES.map((s) => (
            <tr key={s.name}><td className="py-2.5 font-medium">{s.name}</td><td>{s.kind}</td>
              <td><span className={cn("rounded-full border px-2 py-0.5 text-[11px]", s.status === "Demo fixture" ? "border-amber/40 text-amber" : "text-muted-foreground")}>{s.status}</span></td>
              <td className="num text-muted-foreground">{s.fresh}</td></tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
