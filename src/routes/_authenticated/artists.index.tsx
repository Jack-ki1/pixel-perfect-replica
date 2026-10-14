import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { artistsQuery, fmt, stageLabel } from "@/lib/artists";
import { Panel, Portrait, DemoBadge, IntegrityChip, ScoreRing } from "@/components/br-ui";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/artists/")({
  head: () => ({ meta: [{ title: "Artists — Breakout Radar" }, { name: "description", content: "All monitored artists." }] }),
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : undefined }),
  loader: ({ context }) => context.queryClient.ensureQueryData(artistsQuery),
  component: ArtistsPage,
});

function ArtistsPage() {
  const { q: initial } = Route.useSearch();
  const { data } = useSuspenseQuery(artistsQuery);
  const [q, setQ] = useState(initial ?? "");
  const rows = useMemo(() => {
    const t = q.toLowerCase().trim();
    return data.filter((a) => !t || [a.name, a.city, a.country, a.genre, a.language, ...a.aliases].join(" ").toLowerCase().includes(t));
  }, [data, q]);

  return (
    <Panel title="Artists" sub={`${rows.length} of ${data.length} monitored`} action={<Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name, city, genre…" className="w-64" aria-label="Filter artists" />}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((a) => (
          <Link key={a.id} to="/artists/$id" params={{ id: a.id }} className="panel flex gap-4 bg-panel-raised p-4 transition hover:border-lime/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Portrait seed={a.portrait_seed} name={a.name} className="size-16 rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="font-semibold">{a.name}</span>{a.is_demo && <DemoBadge />}</div>
              <div className="text-xs text-muted-foreground">{a.genre} · {a.city}, {a.country}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded bg-muted px-1.5 py-0.5">{stageLabel(a.pipeline_stage)}</span>
                <IntegrityChip value={a.integrity} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground num">{fmt(a.audience_current)} audience · <span className="text-lime">+{Number(a.growth_30d)}%</span></div>
            </div>
            <ScoreRing value={(a.scores as Record<string, number>).priority} />
          </Link>
        ))}
        {rows.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No artists match “{q}”.</p>}
      </div>
    </Panel>
  );
}
