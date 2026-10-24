import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trophy, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { liveArtistsQuery, analysesQuery, decisionsQuery, latestByArtist, feat, fmt, type AnalysisJson } from "@/lib/live";
import { recommend, type Tier } from "@/lib/scoring";
import { Panel, Avatar, ScoreRing, Empty } from "@/components/br-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/recommendations")({
  head: () => ({ meta: [
    { title: "Recommendations — Breakout Radar" },
    { name: "description", content: "Which emerging artists to pursue, and why." },
    { property: "og:title", content: "Recommendations — Breakout Radar" },
    { property: "og:description", content: "Which emerging artists to pursue, and why." },
  ] }),
  loader: ({ context }) => Promise.all([liveArtistsQuery, analysesQuery, decisionsQuery].map((q) => context.queryClient.ensureQueryData(q as typeof liveArtistsQuery))),
  component: Recs,
});

const TIER: Record<Tier, { label: string; cls: string; desc: string }> = {
  sign: { label: "Pursue signing", cls: "border-lime/50 bg-lime/10 text-lime", desc: "Strong music and strong momentum" },
  meet: { label: "Book a meeting", cls: "border-cyan/50 bg-cyan/10 text-cyan", desc: "Good music, worth a conversation" },
  watch: { label: "Keep watching", cls: "border-amber/50 bg-amber/10 text-amber", desc: "Promising, needs more evidence" },
  hold: { label: "Not yet reviewed", cls: "border-border text-muted-foreground", desc: "Waiting for an artistic review" },
};
const DEC = { shortlist: "Shortlisted", meet: "Meeting booked", pass: "Passed" } as const;

function Recs() {
  const { data: artists } = useSuspenseQuery(liveArtistsQuery);
  const { data: analyses } = useSuspenseQuery(analysesQuery);
  const { data: decisions } = useSuspenseQuery(decisionsQuery);
  const qc = useQueryClient();
  const [note, setNote] = useState<Record<string, string>>({});
  const latest = latestByArtist(analyses);
  const lastDecision = new Map<string, (typeof decisions)[number]>();
  decisions.forEach((d) => { if (!lastDecision.has(d.artist_id)) lastDecision.set(d.artist_id, d); });
  const rows = artists.map((a) => { const an = latest.get(a.id); const r = recommend(Number(a.discovery_score ?? 0), an ? Number(an.overall) : null); return { a, an, ...r }; })
    .filter((x) => x.an).sort((x, y) => y.score - x.score);
  const decide = useMutation({
    mutationFn: async (v: { artist_id: string; decision: keyof typeof DEC }) => { const { error } = await supabase.from("live_decisions").insert({ ...v, note: note[v.artist_id] || null }); if (error) throw error; },
    onSuccess: (_d, v) => { toast.success(DEC[v.decision]); qc.invalidateQueries({ queryKey: ["live_decisions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const csv = () => {
    const lines = [["artist", "tier", "score", "artistic", "discovery", "fans", "country", "recommendation"].join(","),
      ...rows.map(({ a, an, score, tier }) => [a.name, TIER[tier].label, score, an?.overall, a.discovery_score, a.nb_fan, a.country ?? "", (an?.result as AnalysisJson | undefined)?.recommendation ?? ""].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "breakout-radar-recommendations.csv" }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-6">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-cyan"><Trophy className="size-3.5" /> Recommendations</div>
          <h1 className="text-3xl font-bold">Who we should pick</h1>
          <p className="mt-2 text-sm text-muted-foreground">Combines artistic quality (60%) with discovery momentum (40%). "Pursue signing" needs an artistic score of at least 75. Signing remains your team's decision.</p>
        </div>
        <Button variant="outline" onClick={csv} disabled={!rows.length}><Download className="size-4" />Export CSV</Button>
      </section>
      <div className="grid gap-3 sm:grid-cols-4">{(Object.keys(TIER) as Tier[]).slice(0, 3).map((t) => (
        <div key={t} className={cn("rounded-xl border p-4", TIER[t].cls)}><div className="font-display text-2xl font-bold num">{rows.filter((r) => r.tier === t).length}</div><div className="text-xs font-semibold">{TIER[t].label}</div><div className="text-[11px] opacity-80">{TIER[t].desc}</div></div>))}
        <div className="rounded-xl border p-4"><div className="font-display text-2xl font-bold num">{artists.length - rows.length}</div><div className="text-xs font-semibold">Awaiting review</div><div className="text-[11px] text-muted-foreground">Discovered, not yet listened to</div></div>
      </div>
      {rows.length === 0 ? <Empty>Recommendations appear once artists have been reviewed in <Link to="/analyse" className="text-lime underline">Analyse</Link>.</Empty> : (
        <div className="space-y-3">{rows.map(({ a, an, score, tier }, i) => { const j = an!.result as AnalysisJson; const d = lastDecision.get(a.id); return (
          <Panel key={a.id} className={cn(i === 0 && tier === "sign" && "glow")}>
            <div className="flex flex-wrap items-start gap-4">
              <span className="w-6 pt-2 font-display text-lg font-bold text-muted-foreground num">{i + 1}</span>
              <Avatar src={a.picture} name={a.name} className="size-14" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><Link to="/artist/$id" params={{ id: a.id }} className="text-lg font-semibold hover:text-lime">{a.name}</Link>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", TIER[tier].cls)}>{TIER[tier].label}</span>
                  {d && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{DEC[d.decision as keyof typeof DEC]}</span>}</div>
                <div className="text-xs text-muted-foreground">{a.country ?? "Country unverified"} · {fmt(a.nb_fan)} fans · {feat(a).growth30d == null ? "growth pending" : `${feat(a).growth30d}% / 30d`} · {j.genre}</div>
                <p className="mt-2 text-sm">{j.recommendation}</p>
                <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                  <div><b className="text-lime">Strengths:</b> <span className="text-muted-foreground">{j.strengths.slice(0, 3).join("; ")}</span></div>
                  <div><b className="text-amber">Risks:</b> <span className="text-muted-foreground">{j.risks.slice(0, 3).join("; ")}</span></div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input placeholder="Note (optional)" className="h-8 w-56" value={note[a.id] ?? ""} onChange={(e) => setNote({ ...note, [a.id]: e.target.value })} aria-label={`Note for ${a.name}`} />
                  {(Object.keys(DEC) as (keyof typeof DEC)[]).map((k) => <Button key={k} size="sm" variant={k === "pass" ? "ghost" : "outline"} onClick={() => decide.mutate({ artist_id: a.id, decision: k })}>{k === "shortlist" ? "Shortlist" : k === "meet" ? "Book meeting" : "Pass"}</Button>)}
                </div>
              </div>
              <div className="flex gap-3 text-center text-[10px] text-muted-foreground">
                <div><ScoreRing value={score} size={50} />Overall</div>
                <div><ScoreRing value={Number(an!.overall)} tone="violet" size={50} />Artistic</div>
                <div><ScoreRing value={Number(a.discovery_score)} tone="cyan" size={50} />Discovery</div>
              </div>
            </div>
          </Panel>); })}</div>
      )}
    </div>
  );
}
