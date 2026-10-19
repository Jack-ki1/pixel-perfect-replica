import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { artistsQuery } from "@/lib/artists";
import { tableQuery } from "@/lib/modules";
import { Panel } from "@/components/br-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({ meta: [{ title: "Artistic Review — Breakout Radar" }, { name: "description", content: "Score artists against the A&R rubric." }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(artistsQuery), context.queryClient.ensureQueryData(tableQuery("artistic_reviews"))]),
  component: Review,
});

const RUBRIC = ["Vocal / performance", "Songwriting", "Originality", "Live presence", "Visual identity", "Work ethic signals"];
const VERDICTS = ["Strong yes", "Promising", "Not yet", "Pass"];

function Review() {
  const { data: artists } = useSuspenseQuery(artistsQuery);
  const { data: reviews } = useSuspenseQuery(tableQuery("artistic_reviews"));
  const qc = useQueryClient();
  const [artistId, setArtistId] = useState(artists[0]?.id ?? "");
  const [scores, setScores] = useState<Record<string, number>>(Object.fromEntries(RUBRIC.map((r) => [r, 3])));
  const [verdict, setVerdict] = useState<string>("Promising");
  const [notes, setNotes] = useState("");
  const avg = Math.round((Object.values(scores).reduce((s, v) => s + v, 0) / RUBRIC.length) * 20);
  const submit = useMutation({
    mutationFn: async () => {
      const a = artists.find((x) => x.id === artistId)!;
      const { error } = await supabase.from("artistic_reviews").insert({ artist_id: artistId, scores, verdict, notes });
      if (error) throw error;
      const r = await supabase.from("artists").update({ artistic_status: verdict, scores: { ...(a.scores as object), artistic: avg } }).eq("id", artistId);
      if (r.error) throw r.error;
    },
    onSuccess: () => { toast.success("Review saved"); setNotes(""); ["artistic_reviews", "artists"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Panel title="Artistic Review rubric" sub="Rate 1–5 after listening. This is a human judgement; the radar never scores art.">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
          <select aria-label="Artist" value={artistId} onChange={(e) => setArtistId(e.target.value)} className="h-9 w-full rounded-lg border bg-panel px-2 text-sm">
            {artists.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.artistic_status}</option>)}
          </select>
          {RUBRIC.map((r) => (
            <div key={r} className="flex items-center gap-3 text-sm">
              <span className="w-44">{r}</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} aria-label={`${r} ${n}`} onClick={() => setScores({ ...scores, [r]: n })}
                  className={`size-8 rounded-lg border text-xs num ${scores[r] === n ? "border-lime bg-lime/15 text-lime" : ""}`}>{n}</button>
              ))}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">{VERDICTS.map((v) => <Button type="button" key={v} size="sm" variant={verdict === v ? "default" : "outline"} onClick={() => setVerdict(v)}>{v}</Button>)}</div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you hear? Reference tracks, live clips…" />
          <div className="flex items-center justify-between"><span className="text-sm">Artistic score: <b className="text-lime num">{avg}</b></span><Button type="submit" disabled={submit.isPending}>Save review</Button></div>
        </form>
      </Panel>
      <Panel title="Recent reviews">
        <ul className="space-y-3 text-sm">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border bg-panel-raised p-3">
              <div className="font-medium">{artists.find((a) => a.id === r.artist_id)?.name} · <span className="text-lime">{r.verdict}</span></div>
              <div className="text-xs text-muted-foreground">{r.reviewer} · {new Date(r.created_at).toLocaleDateString()}</div>
              {r.notes && <p className="mt-1 text-xs">{r.notes}</p>}
            </li>
          ))}
          {!reviews.length && <li className="text-xs text-muted-foreground">No reviews yet.</li>}
        </ul>
      </Panel>
    </div>
  );
}
