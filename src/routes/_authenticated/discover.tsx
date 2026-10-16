import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { artistsQuery, fmt, INTEGRITY_LABEL } from "@/lib/artists";
import { tableQuery, sc } from "@/lib/modules";
import { Panel, Portrait, DemoBadge, ScoreRing, IntegrityChip } from "@/components/br-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Discover — Breakout Radar" }, { name: "description", content: "Filter artists and save searches." }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(artistsQuery), context.queryClient.ensureQueryData(tableQuery("saved_searches"))]),
  component: Discover,
});

type F = { country: string; genre: string; integrity: string; minMomentum: number; minGrowth: number };
const EMPTY: F = { country: "", genre: "", integrity: "", minMomentum: 0, minGrowth: 0 };
const sel = "h-9 rounded-lg border bg-panel px-2 text-sm";

function Discover() {
  const { data } = useSuspenseQuery(artistsQuery);
  const { data: saved } = useSuspenseQuery(tableQuery("saved_searches"));
  const qc = useQueryClient();
  const [f, setF] = useState<F>(EMPTY);
  const [name, setName] = useState("");
  const uniq = (k: "country" | "genre") => [...new Set(data.map((a) => a[k]))].sort();
  const rows = useMemo(() => data.filter((a) =>
    (!f.country || a.country === f.country) && (!f.genre || a.genre === f.genre) && (!f.integrity || a.integrity === f.integrity) &&
    (sc(a).momentum ?? 0) >= f.minMomentum && Number(a.growth_30d) >= f.minGrowth), [data, f]);

  const save = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("saved_searches").insert({ name: name.trim(), filters: f }); if (error) throw error; },
    onSuccess: () => { setName(""); toast.success("Search saved"); qc.invalidateQueries({ queryKey: ["saved_searches"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("saved_searches").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved_searches"] }),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <Panel title="Discover" sub={`${rows.length} artists match`}>
        <div className="mb-4 flex flex-wrap items-end gap-3 text-xs">
          <label className="grid gap-1">Country<select className={sel} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}><option value="">Any</option>{uniq("country").map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="grid gap-1">Genre<select className={sel} value={f.genre} onChange={(e) => setF({ ...f, genre: e.target.value })}><option value="">Any</option>{uniq("genre").map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="grid gap-1">Integrity<select className={sel} value={f.integrity} onChange={(e) => setF({ ...f, integrity: e.target.value })}><option value="">Any</option>{Object.entries(INTEGRITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="grid gap-1">Min momentum: {f.minMomentum}<input type="range" min={0} max={100} value={f.minMomentum} onChange={(e) => setF({ ...f, minMomentum: +e.target.value })} /></label>
          <label className="grid gap-1">Min 30d growth: {f.minGrowth}%<input type="range" min={0} max={200} step={10} value={f.minGrowth} onChange={(e) => setF({ ...f, minGrowth: +e.target.value })} /></label>
          <Button variant="ghost" size="sm" onClick={() => setF(EMPTY)}>Reset</Button>
        </div>
        <div className="divide-y">
          {rows.map((a) => (
            <Link key={a.id} to="/artists/$id" params={{ id: a.id }} className="flex items-center gap-3 py-2.5 hover:text-lime">
              <Portrait seed={a.portrait_seed} name={a.name} className="size-9" />
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-sm font-medium">{a.name}{a.is_demo && <DemoBadge />}</div><div className="text-xs text-muted-foreground">{a.genre} · {a.city}, {a.country}</div></div>
              <IntegrityChip value={a.integrity} />
              <span className="w-24 text-right text-xs num">{fmt(a.audience_current)} · <span className="text-lime">+{Number(a.growth_30d)}%</span></span>
              <ScoreRing value={sc(a).momentum} size={34} />
            </Link>
          ))}
          {!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">No artists match these filters.</p>}
        </div>
      </Panel>
      <Panel title="Saved searches">
        <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) save.mutate(); }}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this search" aria-label="Search name" />
          <Button type="submit" size="sm" disabled={!name.trim()}>Save</Button>
        </form>
        <ul className="space-y-1">
          {saved.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent">
              <button className="flex-1 text-left" onClick={() => setF({ ...EMPTY, ...(s.filters as Partial<F>) })}>{s.name}</button>
              <button aria-label={`Delete ${s.name}`} onClick={() => del.mutate(s.id)}><Trash2 className="size-3.5 text-muted-foreground" /></button>
            </li>
          ))}
          {!saved.length && <li className="text-xs text-muted-foreground">No saved searches yet.</li>}
        </ul>
      </Panel>
    </div>
  );
}
