import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SlidersHorizontal, RotateCcw, Save } from "lucide-react";
import { settingsQuery } from "@/lib/live";
import { updateSettings, reapplyFilters } from "@/lib/radar.functions";
import { DEFAULT_SETTINGS, AI_MODELS, type Settings } from "@/lib/settings";
import { Panel } from "@/components/br-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [
    { title: "Settings — Breakout Radar" },
    { name: "description", content: "Tune data sources, filters, scoring models and AI listening." },
    { property: "og:title", content: "Settings — Breakout Radar" },
    { property: "og:description", content: "Tune data sources, filters, scoring models and AI listening." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: SettingsPage,
});

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="grid gap-1 text-sm"><span className="font-medium">{label}</span>{children}{hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}</label>;
}

function SettingsPage() {
  const { data } = useSuspenseQuery(settingsQuery);
  const [s, setS] = useState<Settings>(data);
  const qc = useQueryClient();
  const save = useServerFn(updateSettings);
  const refilter = useServerFn(reapplyFilters);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });
  const num = (k: keyof Settings) => <Input type="number" value={s[k] as number} onChange={(e) => set(k, Number(e.target.value) as never)} />;
  const m = useMutation({
    mutationFn: async () => { await save({ data: s }); return refilter(); },
    onSuccess: (r) => { toast.success(`Saved · ${r.kept} emerging artists kept, ${r.excluded} filtered out`); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(`Could not save: ${e.message}`),
  });
  const wSum = Object.values(s.discoveryWeights).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-6">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-lime"><SlidersHorizontal className="size-3.5" /> Settings</div>
          <h1 className="text-3xl font-bold">Tune the radar</h1>
          <p className="mt-2 text-sm text-muted-foreground">Data sources, what counts as "already popular", scoring weights, recommendation rules and the AI listener. Saving re-checks every tracked artist.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setS(DEFAULT_SETTINGS)}><RotateCcw className="size-4" />Defaults</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}><Save className="size-4" />{m.isPending ? "Saving…" : "Save & apply"}</Button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Data sources" sub="All free, live public services">
          <div className="grid gap-3">
            {([["deezer", "Deezer", "Playlists, fans, releases, song previews (required)"], ["musicbrainz", "MusicBrainz", "Country of origin"], ["wikipedia", "Wikipedia", "Detects artists who are already famous"]] as const).map(([k, l, h]) => (
              <div key={k} className="flex items-center justify-between gap-4 rounded-lg border p-3"><div><div className="text-sm font-medium">{l}</div><div className="text-[11px] text-muted-foreground">{h}</div></div>
                <Switch checked={s.sources[k]} onCheckedChange={(v) => set("sources", { ...s.sources, [k]: v })} aria-label={l} /></div>))}
          </div>
        </Panel>

        <Panel title="Scan scope" sub="Which scenes are searched each run">
          <div className="grid gap-3">
            <Field label="Scenes / playlist searches" hint="One per line. Rotated across scans."><Textarea rows={6} value={s.seeds.join("\n")} onChange={(e) => set("seeds", e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Scenes per scan">{num("seedsPerRun")}</Field>
              <Field label="Playlists per scene">{num("playlistsPerSeed")}</Field>
              <Field label="Max artists checked">{num("maxCandidates")}</Field>
            </div>
            <Field label="Region focus"><select className="h-9 rounded-md border bg-background px-2 text-sm" value={s.regionFocus} onChange={(e) => set("regionFocus", e.target.value as Settings["regionFocus"])}><option value="east">East Africa first</option><option value="africa">All Africa</option></select></Field>
          </div>
        </Panel>

        <Panel title="Emerging-artist filter" sub="Anyone failing these is treated as already popular and removed">
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Minimum fans">{num("minFans")}</Field>
              <Field label="Maximum fans">{num("maxFans")}</Field>
              <Field label="Maximum releases" hint="Big catalogues = established">{num("maxCatalog")}</Field>
              <Field label="Max track popularity" hint="Deezer rank, 0–1,000,000">{num("maxTopRank")}</Field>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 text-sm">Exclude artists with a Wikipedia article<Switch checked={s.excludeWikipedia} onCheckedChange={(v) => set("excludeWikipedia", v)} aria-label="Exclude Wikipedia artists" /></div>
            <Field label="Always exclude" hint="One name per line"><Textarea rows={4} value={s.excludeNames.join("\n")} onChange={(e) => set("excludeNames", e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))} /></Field>
          </div>
        </Panel>

        <Panel title="Breakout model (Discovery)" sub={`Relative weights · total ${wSum}`}>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(s.discoveryWeights) as (keyof Settings["discoveryWeights"])[]).map((k) => (
              <Field key={k} label={{ traction: "Track traction", momentum: "Fan growth", breadth: "Playlist breadth", releases: "Release activity", headroom: "Headroom (smaller = better)" }[k]}>
                <Input type="number" value={s.discoveryWeights[k]} onChange={(e) => set("discoveryWeights", { ...s.discoveryWeights, [k]: Number(e.target.value) })} /></Field>))}
          </div>
        </Panel>

        <Panel title="Artistic model (Analyse)" sub="Relative weight of each craft dimension">
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(s.artisticWeights) as (keyof Settings["artisticWeights"])[]).map((k) => (
              <Field key={k} label={k[0]!.toUpperCase() + k.slice(1)}><Input type="number" step="0.5" value={s.artisticWeights[k]} onChange={(e) => set("artisticWeights", { ...s.artisticWeights, [k]: Number(e.target.value) })} /></Field>))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Applies to new reviews.</p>
        </Panel>

        <Panel title="Recommendation rules" sub="How artistic quality and momentum combine">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Artistic share %" hint={`Momentum gets ${100 - s.artisticShare}%`}>{num("artisticShare")}</Field>
            <Field label="Keep watching: min score"><Input type="number" value={s.tiers.watchScore} onChange={(e) => set("tiers", { ...s.tiers, watchScore: Number(e.target.value) })} /></Field>
            <Field label="Sign: min artistic"><Input type="number" value={s.tiers.signArtistic} onChange={(e) => set("tiers", { ...s.tiers, signArtistic: Number(e.target.value) })} /></Field>
            <Field label="Sign: min overall"><Input type="number" value={s.tiers.signScore} onChange={(e) => set("tiers", { ...s.tiers, signScore: Number(e.target.value) })} /></Field>
            <Field label="Meet: min artistic"><Input type="number" value={s.tiers.meetArtistic} onChange={(e) => set("tiers", { ...s.tiers, meetArtistic: Number(e.target.value) })} /></Field>
            <Field label="Meet: min overall"><Input type="number" value={s.tiers.meetScore} onChange={(e) => set("tiers", { ...s.tiers, meetScore: Number(e.target.value) })} /></Field>
          </div>
        </Panel>

        <Panel title="AI listener" sub="The model that listens to song previews" className="xl:col-span-2">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="AI model"><select className="h-9 rounded-md border bg-background px-2 text-sm" value={s.aiModel} onChange={(e) => set("aiModel", e.target.value)}>{AI_MODELS.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Artists per review batch">{num("analysisBatch")}</Field>
            <div className="md:col-span-3"><Field label="Extra guidance for the listener" hint="e.g. 'favour live vocal ability over production polish'"><Textarea rows={3} value={s.listenerNotes} onChange={(e) => set("listenerNotes", e.target.value)} /></Field></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
