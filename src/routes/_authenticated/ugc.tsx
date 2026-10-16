import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { artistsQuery, type ArtistEvent } from "@/lib/artists";
import { sc } from "@/lib/modules";
import { Panel, Portrait, DemoBadge, ScoreRing } from "@/components/br-ui";

export const Route = createFileRoute("/_authenticated/ugc")({
  head: () => ({ meta: [{ title: "UGC Intelligence — Breakout Radar" }, { name: "description", content: "Fan-made content driving artist growth." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(artistsQuery),
  component: Ugc,
});

function Ugc() {
  const { data } = useSuspenseQuery(artistsQuery);
  const ranked = [...data].sort((a, b) => (sc(b).ugc_impact ?? 0) - (sc(a).ugc_impact ?? 0));
  const events = data.flatMap((a) => ((a.events ?? []) as ArtistEvent[]).filter((e) => e.type === "ugc").map((e) => ({ ...e, a }))).sort((x, y) => y.d.localeCompare(x.d));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="UGC impact ranking" sub="How much fan-made content drives each artist's growth (index 0–100, not a probability)">
        <div className="space-y-2">
          {ranked.map((a) => {
            const v = sc(a).ugc_impact;
            return (
              <Link key={a.id} to="/artists/$id" params={{ id: a.id }} className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-accent">
                <Portrait seed={a.portrait_seed} name={a.name} className="size-8" />
                <span className="w-32 truncate text-sm">{a.name}</span>
                <div className="h-2 flex-1 rounded-full bg-muted"><div className="h-2 rounded-full bg-cyan" style={{ width: `${v ?? 0}%` }} /></div>
                <ScoreRing value={v} size={32} />
              </Link>
            );
          })}
        </div>
      </Panel>
      <Panel title="UGC moments" sub="Fan trends detected across artists" action={<DemoBadge />}>
        <ul className="space-y-3">
          {events.map((e, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="w-20 shrink-0 text-xs text-muted-foreground num">{e.d}</span>
              <div><Link to="/artists/$id" params={{ id: e.a.id }} className="font-medium hover:text-lime">{e.a.name}</Link><div className="text-xs text-muted-foreground">{e.label}</div></div>
            </li>
          ))}
          {!events.length && <li className="text-sm text-muted-foreground">No UGC moments recorded.</li>}
        </ul>
        <p className="mt-4 text-[11px] text-muted-foreground">No licensed platform demographic data is connected; signals come from demo fixtures.</p>
      </Panel>
    </div>
  );
}
