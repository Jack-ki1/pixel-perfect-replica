import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { artistsQuery, snapshotsQuery } from "@/lib/artists";
import { Panel, Portrait, DemoBadge } from "@/components/br-ui";
import { AudienceCompare, morphNarrative } from "@/components/audience-compare";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/audience")({
  head: () => ({ meta: [{ title: "Audience Morphing — Breakout Radar" }, { name: "description", content: "How artist audiences are changing over time." }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(artistsQuery), context.queryClient.ensureQueryData(snapshotsQuery)]),
  component: AudiencePage,
});

function AudiencePage() {
  const { data: artists } = useSuspenseQuery(artistsQuery);
  const { data: snaps } = useSuspenseQuery(snapshotsQuery);
  const [sel, setSel] = useState(artists[0]?.id);
  const pick = (id?: string) => snaps.filter((s) => s.artist_id === id);
  const mine = pick(sel);
  const artist = artists.find((a) => a.id === sel);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">Audience Morphing <DemoBadge /></h1>
          <p className="text-sm text-muted-foreground">Who the audience is, and how its makeup shifts between snapshots. Core audience = dominant cohorts, never individuals.</p>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Choose artist">
        {artists.map((a) => (
          <button key={a.id} role="tab" aria-selected={a.id === sel} onClick={() => setSel(a.id)}
            className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition", a.id === sel ? "border-lime bg-lime/10 text-lime" : "hover:bg-accent")}>
            <Portrait seed={a.portrait_seed} name={a.name} className="size-6" /> {a.name}
          </button>
        ))}
      </div>
      {artist && mine.length >= 2 ? (
        <>
          <Panel title={`Core audience shift — ${artist.name}`} sub="Generated from stored aggregate snapshots" action={<Link to="/artists/$id" params={{ id: artist.id }} className="text-xs text-lime hover:underline">Open profile →</Link>}>
            <p className="text-sm">{morphNarrative(mine[0], mine[mine.length - 1])}</p>
            <p className="mt-2 text-xs text-muted-foreground">Hypothesis, not causal: consider localised content and a live date in the fastest-growing cross-border market. Confidence limited by demo coverage.</p>
          </Panel>
          <AudienceCompare prior={mine[0]} current={mine[mine.length - 1]} />
        </>
      ) : (
        <Panel><p className="py-8 text-center text-sm text-muted-foreground">Fewer than two snapshots from the same source — comparison unavailable.</p></Panel>
      )}
    </div>
  );
}
