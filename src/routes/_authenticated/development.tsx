import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { artistsQuery } from "@/lib/artists";
import { tableQuery } from "@/lib/modules";
import { Panel, Portrait } from "@/components/br-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/development")({
  head: () => ({ meta: [{ title: "Artist Development — Breakout Radar" }, { name: "description", content: "Development plans for artists in progress." }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(artistsQuery), context.queryClient.ensureQueryData(tableQuery("dev_tasks"))]),
  component: Development,
});

const AREAS: string[] = ["Music", "Live", "Content", "Brand", "Team"];
const DEV_STAGES = ["live_audition", "development", "negotiation", "signed"];

function Development() {
  const { data: artists } = useSuspenseQuery(artistsQuery);
  const { data: tasks } = useSuspenseQuery(tableQuery("dev_tasks"));
  const qc = useQueryClient();
  const list = artists.filter((a) => DEV_STAGES.includes(a.pipeline_stage) || tasks.some((t) => t.artist_id === a.id));
  const [form, setForm] = useState({ artist_id: artists[0]?.id ?? "", area: "Music", title: "", due: "" });
  const inv = () => qc.invalidateQueries({ queryKey: ["dev_tasks"] });
  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("dev_tasks").insert({ ...form, title: form.title.trim(), due: form.due || null }); if (error) throw error; },
    onSuccess: () => { setForm({ ...form, title: "", due: "" }); toast.success("Task added"); inv(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => { const { error } = await supabase.from("dev_tasks").update({ done }).eq("id", id); if (error) throw error; },
    onSuccess: inv,
  });
  const sel = "h-9 rounded-lg border bg-panel px-2 text-sm";
  return (
    <div className="space-y-4">
      <Panel title="Artist Development" sub="Plan the work for artists past audition. Add a task for any artist to start a plan.">
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (form.title.trim()) add.mutate(); }}>
          <select aria-label="Artist" className={sel} value={form.artist_id} onChange={(e) => setForm({ ...form, artist_id: e.target.value })}>{artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <select aria-label="Area" className={sel} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select>
          <Input aria-label="Task" className="min-w-48 flex-1" placeholder="e.g. Co-write session with producer" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input aria-label="Due date" type="date" className="w-40" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
          <Button type="submit" disabled={!form.title.trim()}>Add task</Button>
        </form>
      </Panel>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((a) => {
          const ts = tasks.filter((t) => t.artist_id === a.id);
          const done = ts.filter((t) => t.done).length;
          return (
            <Panel key={a.id} title={<Link to="/artists/$id" params={{ id: a.id }} className="flex items-center gap-2 hover:text-lime"><Portrait seed={a.portrait_seed} name={a.name} className="size-7" />{a.name}</Link>} sub={`${done}/${ts.length} tasks done`}>
              <div className="mb-3 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-lime" style={{ width: `${ts.length ? (done / ts.length) * 100 : 0}%` }} /></div>
              <ul className="space-y-1.5 text-sm">
                {ts.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <input type="checkbox" checked={t.done} onChange={(e) => toggle.mutate({ id: t.id, done: e.target.checked })} aria-label={t.title} />
                    <span className={t.done ? "text-muted-foreground line-through" : ""}>{t.title}</span>
                    <span className="ml-auto rounded bg-muted px-1.5 text-[10px]">{t.area}</span>{t.due && <span className="text-[11px] text-muted-foreground num">{t.due}</span>}
                  </li>
                ))}
                {!ts.length && <li className="text-xs text-muted-foreground">No tasks yet.</li>}
              </ul>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
