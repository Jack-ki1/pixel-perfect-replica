import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { tableQuery } from "@/lib/modules";
import { Panel, DemoBadge } from "@/components/br-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({ meta: [{ title: "Alerts — Breakout Radar" }, { name: "description", content: "Momentum and integrity alerts." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tableQuery("alerts")),
  component: Alerts,
});

function Alerts() {
  const { data } = useSuspenseQuery(tableQuery("alerts"));
  const qc = useQueryClient();
  const mark = useMutation({
    mutationFn: async (ids: string[]) => { const { error } = await supabase.from("alerts").update({ is_read: true }).in("id", ids); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
  const unread = data.filter((a) => !a.is_read);
  return (
    <Panel title="Alerts" sub={`${unread.length} unread`} action={<Button size="sm" variant="outline" disabled={!unread.length} onClick={() => mark.mutate(unread.map((a) => a.id))}>Mark all read</Button>}>
      <ul className="space-y-2">
        {data.map((a) => (
          <li key={a.id} className={cn("flex items-start gap-3 rounded-lg border p-3", !a.is_read && "border-lime/50 bg-lime/5")}>
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", a.kind === "integrity" ? "bg-amber" : "bg-lime")} />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-medium">{a.title}{a.is_demo && <DemoBadge />}</div>
              {a.body && <p className="text-xs text-muted-foreground">{a.body}</p>}
              {a.artist_id && <Link to="/artists/$id" params={{ id: a.artist_id }} className="text-xs text-cyan hover:underline">Open artist</Link>}
            </div>
            {!a.is_read && <Button size="sm" variant="ghost" onClick={() => mark.mutate([a.id])}>Mark read</Button>}
          </li>
        ))}
        {!data.length && <li className="py-8 text-center text-sm text-muted-foreground">No alerts.</li>}
      </ul>
    </Panel>
  );
}
