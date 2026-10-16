import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { artistsQuery, fmt, stageLabel, STAGES, INTEGRITY_LABEL } from "@/lib/artists";
import { sc } from "@/lib/modules";
import { Panel, DemoBadge } from "@/components/br-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Breakout Radar" }, { name: "description", content: "Weekly A&R summary and exports." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(artistsQuery),
  component: Reports,
});

function Reports() {
  const { data } = useSuspenseQuery(artistsQuery);
  const top = [...data].sort((a, b) => (sc(b).priority ?? 0) - (sc(a).priority ?? 0)).slice(0, 5);
  const csv = () => {
    const head = ["name", "country", "city", "genre", "stage", "integrity", "audience", "growth_30d", "priority"];
    const lines = data.map((a) => [a.name, a.country, a.city, a.genre, stageLabel(a.pipeline_stage), INTEGRITY_LABEL[a.integrity], a.audience_current, a.growth_30d, sc(a).priority ?? ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const url = URL.createObjectURL(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "breakout-radar-artists.csv" }).click();
    URL.revokeObjectURL(url);
  };
  return (
    <Panel title="Weekly A&R report" sub="Demo data · week ending 14 Sep 2026"
      action={<div className="flex gap-2 print:hidden"><Button size="sm" variant="outline" onClick={csv}><Download className="size-4" />CSV</Button><Button size="sm" onClick={() => window.print()}><Printer className="size-4" />Print</Button></div>}>
      <div className="mb-2"><DemoBadge /></div>
      <h3 className="mb-2 text-sm font-semibold">Top 5 priorities</h3>
      <ol className="mb-6 space-y-2 text-sm">
        {top.map((a, i) => <li key={a.id}><b>{i + 1}. {a.name}</b> — {a.genre}, {a.city} · {fmt(a.audience_current)} audience, +{Number(a.growth_30d)}% (30d) · priority {sc(a).priority ?? "—"}<div className="text-xs text-muted-foreground">{a.why_now}</div></li>)}
      </ol>
      <h3 className="mb-2 text-sm font-semibold">Pipeline</h3>
      <div className="mb-6 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
        {STAGES.map((s) => <div key={s.id} className="rounded-lg border p-2"><div className="text-xs text-muted-foreground">{s.label}</div><b className="num">{data.filter((a) => a.pipeline_stage === s.id).length}</b></div>)}
      </div>
      <h3 className="mb-2 text-sm font-semibold">Integrity</h3>
      <p className="text-sm">{Object.entries(INTEGRITY_LABEL).map(([k, v]) => `${v}: ${data.filter((a) => a.integrity === k).length}`).join(" · ")}</p>
    </Panel>
  );
}
