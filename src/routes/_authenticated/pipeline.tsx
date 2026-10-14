import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { artistsQuery, STAGES, type Artist, type PipelineStage } from "@/lib/artists";
import { Portrait, IntegrityChip, DemoBadge } from "@/components/br-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({ meta: [{ title: "A&R Pipeline — Breakout Radar" }, { name: "description", content: "Move artists from discovery to signing." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(artistsQuery),
  component: PipelinePage,
});

function PipelinePage() {
  const { data } = useSuspenseQuery(artistsQuery);
  const qc = useQueryClient();
  const [over, setOver] = useState<PipelineStage | null>(null);

  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: PipelineStage }) => {
      const { data: rows, error } = await supabase.from("artists").update({ pipeline_stage: stage }).eq("id", id).select("id");
      if (error) throw error;
      if (!rows?.length) throw new Error("You don't have permission to move artists.");
    },
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ["artists"] });
      const prev = qc.getQueryData<Artist[]>(["artists"]);
      qc.setQueryData<Artist[]>(["artists"], (old) => old?.map((a) => (a.id === id ? { ...a, pipeline_stage: stage } : a)));
      return { prev };
    },
    onError: (e: Error, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["artists"], ctx.prev); toast.error(e.message); },
    onSuccess: (_d, v) => toast.success(`Moved to ${STAGES.find((s) => s.id === v.stage)?.label}`),
    onSettled: () => { qc.invalidateQueries({ queryKey: ["artists"] }); qc.invalidateQueries({ queryKey: ["audit"] }); },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">A&R Pipeline</h1>
        <p className="text-sm text-muted-foreground">Drag cards between stages, or use the stage menu on each card. Signing is a human decision — only Head of A&R or Admin can mark Signed.</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((s) => {
          const cards = data.filter((a) => a.pipeline_stage === s.id);
          return (
            <section key={s.id} aria-label={s.label}
              onDragOver={(e) => { e.preventDefault(); setOver(s.id); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("text/plain"); const a = data.find((x) => x.id === id); if (a && a.pipeline_stage !== s.id) move.mutate({ id, stage: s.id }); }}
              className={cn("panel flex w-64 shrink-0 flex-col p-3 transition", over === s.id && "border-lime glow")}>
              <header className="mb-3 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider">
                {s.label}<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] num">{cards.length}</span>
              </header>
              <div className="flex min-h-24 flex-col gap-2">
                {cards.map((a) => (
                  <article key={a.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                    className="cursor-grab rounded-lg border bg-panel-raised p-3 text-sm active:cursor-grabbing">
                    <Link to="/artists/$id" params={{ id: a.id }} className="flex items-center gap-2 font-medium hover:text-lime">
                      <Portrait seed={a.portrait_seed} name={a.name} className="size-7" /> {a.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">{a.genre} · {a.country} {a.is_demo && <DemoBadge />}</div>
                    <div className="mt-2 flex flex-wrap gap-1"><IntegrityChip value={a.integrity} /><span className="rounded-full border px-2 py-0.5 text-[11px]">{a.artistic_status}</span></div>
                    {a.next_action && <div className="mt-2 flex items-start gap-1 text-[11px]"><CalendarClock className="mt-0.5 size-3 text-cyan" />{a.next_action}{a.next_action_due && <span className="text-muted-foreground"> · {a.next_action_due}</span>}</div>}
                    <div className="mt-2 text-[11px] text-muted-foreground">Scout: {a.scout_owner ?? "Unassigned"}</div>
                    <select aria-label={`Move ${a.name}`} value={a.pipeline_stage} onChange={(e) => move.mutate({ id: a.id, stage: e.target.value as PipelineStage })}
                      className="mt-2 h-7 w-full rounded border bg-panel px-1 text-[11px]">
                      {STAGES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                    </select>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
