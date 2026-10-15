import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, HelpCircle, AlertCircle, ListTodo } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { artistQuery, notesQuery, snapshotsQuery, stageLabel, fmt, type Scores, type SeriesPoint, type ArtistEvent, type Evidence } from "@/lib/artists";
import { growthMultiplier } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { Panel, Portrait, DemoBadge, IntegrityChip, ScoreRing } from "@/components/br-ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AudienceCompare } from "@/components/audience-compare";

export const Route = createFileRoute("/_authenticated/artists/$id")({
  head: () => ({ meta: [{ title: "Artist profile — Breakout Radar" }, { name: "description", content: "Artist intelligence profile." }] }),
  loader: async ({ context, params }) => {
    const a = await context.queryClient.ensureQueryData(artistQuery(params.id));
    if (!a) throw notFound();
  },
  component: ArtistPage,
});

const SCORE_LABELS: [keyof Scores, string][] = [
  ["momentum", "Momentum"], ["fan_depth", "Fan Depth"], ["ugc_impact", "UGC Impact"], ["audience_evolution", "Audience Evolution"],
  ["catalogue", "Catalogue Strength"], ["artistic", "Artistic Potential"], ["market_expansion", "Market Expansion"],
  ["organic", "Organic Growth Confidence"], ["data_confidence", "Data Confidence"], ["priority", "A&R Priority"],
];

function ArtistPage() {
  const { id } = Route.useParams();
  const { data: a } = useSuspenseQuery(artistQuery(id));
  const { data: snaps } = useQuery(snapshotsQuery);
  if (!a) return null;
  const scores = a.scores as Scores;
  const series = a.series as SeriesPoint[];
  const events = a.events as ArtistEvent[];
  const ev = a.evidence as Evidence;
  const mine = (snaps ?? []).filter((s) => s.artist_id === a.id);

  return (
    <div className="space-y-6">
      <Link to="/artists" search={{ q: undefined }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3" /> Artists</Link>
      <section className="panel flex flex-col gap-6 p-6 lg:flex-row lg:items-center">
        <Portrait seed={a.portrait_seed} name={a.name} className="size-28 rounded-2xl" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-bold">{a.name}</h1>{a.is_demo && <DemoBadge />}</div>
          <div className="mt-1 text-sm text-muted-foreground">{a.genre} · {a.city}, {a.country} · {a.language}</div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-muted px-2 py-0.5 font-mono">{a.canonical_id}</span>
            {a.aliases.map((x) => <span key={x} className="rounded bg-muted px-2 py-0.5">aka {x}</span>)}
            <span className="rounded bg-lime/15 px-2 py-0.5 text-lime">{stageLabel(a.pipeline_stage)}</span>
            <span className="rounded bg-muted px-2 py-0.5">Scout: {a.scout_owner ?? "Unassigned"}</span>
            <IntegrityChip value={a.integrity} />
            <span className="rounded bg-muted px-2 py-0.5">Artistic: {a.artistic_status}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div><div className="font-display text-2xl font-bold num">{fmt(a.audience_current)}</div><div className="text-[11px] text-muted-foreground">Audience</div></div>
          <div><div className="font-display text-2xl font-bold text-lime num">{growthMultiplier(Number(a.growth_30d), Number(a.expected_growth_30d))}×</div><div className="text-[11px] text-muted-foreground">vs expected</div></div>
          <div><div className="font-display text-2xl font-bold num">{a.evidence_confidence}%</div><div className="text-[11px] text-muted-foreground">Evidence confidence</div></div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {SCORE_LABELS.map(([k, l]) => (
          <div key={k} className="panel flex items-center gap-3 p-3">
            <ScoreRing value={scores[k]} size={38} />
            <span className="text-xs">{l}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Scores are 0–100 relative indicators against same-stage peers. A score of 90 is not a 90% probability.</p>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4 grid gap-6 xl:grid-cols-[1fr_380px]">
          <Panel title="Audience: actual vs expected" sub="Monthly audience (people) · source: DEMO fixture">
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={series}>
                  <defs><linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--lime)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--lime)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={fmt} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="a" name="Actual" stroke="var(--lime)" strokeWidth={2} fill="url(#ga)" />
                  <Line type="monotone" dataKey="e" name="Expected (peer baseline)" stroke="var(--violet)" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Why now?" sub="Brief grounded in stored evidence">
            <p className="text-sm leading-relaxed">{a.why_now}</p>
            <EvidenceList icon={<CheckCircle2 className="size-3.5 text-lime" />} title="Corroborated facts" items={ev.facts} />
            <EvidenceList icon={<HelpCircle className="size-3.5 text-cyan" />} title="Hypotheses" items={ev.hypotheses} />
            <EvidenceList icon={<AlertCircle className="size-3.5 text-amber" />} title="Limitations" items={ev.limitations} />
            <EvidenceList icon={<ListTodo className="size-3.5 text-violet" />} title="Scout actions" items={ev.actions} />
          </Panel>
        </TabsContent>
        <TabsContent value="audience" className="mt-4">
          {mine.length >= 2 && mine[0] && mine[mine.length - 1] ? <AudienceCompare prior={mine[0]} current={mine[mine.length - 1]!} /> : <Panel><p className="text-sm text-muted-foreground">Need two snapshots from the same source to compare.</p></Panel>}
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <Panel title="Events" sub="Releases, UGC, live, campaigns and notable shifts">
            <ol className="relative space-y-4 border-l border-border pl-6">
              {events.map((e) => (
                <li key={e.d + e.label}><span className="absolute -left-1.5 mt-1 size-3 rounded-full bg-lime" /><div className="text-xs text-muted-foreground">{e.d} · {e.type}</div><div className="text-sm">{e.label}</div></li>
              ))}
            </ol>
          </Panel>
        </TabsContent>
        <TabsContent value="notes" className="mt-4"><Notes artistId={a.id} /></TabsContent>
      </Tabs>
    </div>
  );
}

function EvidenceList({ icon, title, items }: { icon: ReactNode; title: string; items?: string[] | undefined }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold">{icon}{title}</div>
      <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}

function Notes({ artistId }: { artistId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery(notesQuery(artistId));
  const [body, setBody] = useState("");
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("artist_notes").insert({ artist_id: artistId, body, author_id: "00000000-0000-0000-0000-000000000000", author_name: "A&R Team" });
      if (error) throw error;
    },
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: ["notes", artistId] }); toast.success("Note saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Panel title="Internal notes">
      <form onSubmit={(e) => { e.preventDefault(); if (body.trim()) add.mutate(); }} className="space-y-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Call notes, observations, @mentions…" aria-label="New note" />
        <Button size="sm" disabled={add.isPending || !body.trim()}>Add note</Button>
      </form>
      <ul className="mt-5 space-y-3">
        {(data ?? []).map((n) => <li key={n.id} className="rounded-lg bg-panel-raised p-3 text-sm"><div className="mb-1 text-[11px] text-muted-foreground">{n.author_name} · {new Date(n.created_at).toLocaleString()}</div>{n.body}</li>)}
        {data?.length === 0 && <li className="text-xs text-muted-foreground">No notes yet.</li>}
      </ul>
    </Panel>
  );
}
