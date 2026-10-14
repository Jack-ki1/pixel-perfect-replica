import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import portraitsA from "@/assets/portraits-a.jpg";
import portraitsB from "@/assets/portraits-b.jpg";

export type Artist = Database["public"]["Tables"]["artists"]["Row"];
export type Snapshot = Database["public"]["Tables"]["audience_snapshots"]["Row"];
export type PipelineStage = Database["public"]["Enums"]["pipeline_stage"];

export type Scores = Partial<Record<
  "momentum" | "fan_depth" | "ugc_impact" | "audience_evolution" | "catalogue" | "artistic" |
  "market_expansion" | "organic" | "data_confidence" | "priority", number | null>>;
export type SeriesPoint = { m: string; a: number; e: number };
export type ArtistEvent = { d: string; type: string; label: string };
export type Evidence = { facts?: string[]; hypotheses?: string[]; limitations?: string[]; actions?: string[] };

export const STAGES: { id: PipelineStage; label: string }[] = [
  { id: "identified", label: "Identified" },
  { id: "watchlist", label: "Watchlist" },
  { id: "investigation", label: "Investigation" },
  { id: "artistic_review", label: "Artistic Review" },
  { id: "contact", label: "Contact" },
  { id: "live_audition", label: "Live Audition" },
  { id: "development", label: "Development" },
  { id: "negotiation", label: "Negotiation" },
  { id: "signed", label: "Signed" },
  { id: "passed", label: "Passed" },
];
export const stageLabel = (s: PipelineStage) => STAGES.find((x) => x.id === s)?.label ?? s;

export const INTEGRITY_LABEL: Record<string, string> = {
  organic: "Organic",
  paid_promo: "Paid promo (disclosed)",
  unknown: "Unknown",
  suspicious: "Needs review",
  confirmed_invalid: "Confirmed invalid",
};

export function portraitStyle(seed: number) {
  const i = (seed - 1) % 8;
  const sheet = i < 4 ? portraitsA : portraitsB;
  const pos = ["0% 0%", "100% 0%", "0% 100%", "100% 100%"][i % 4];
  return { backgroundImage: `url(${sheet})`, backgroundSize: "200% 200%", backgroundPosition: pos };
}

export const artistsQuery = queryOptions({
  queryKey: ["artists"],
  queryFn: async () => {
    const { data, error } = await supabase.from("artists").select("*").order("growth_30d", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const artistQuery = (id: string) =>
  queryOptions({
    queryKey: ["artist", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("artists").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const snapshotsQuery = queryOptions({
  queryKey: ["snapshots"],
  queryFn: async () => {
    const { data, error } = await supabase.from("audience_snapshots").select("*").order("reference_date");
    if (error) throw error;
    return data;
  },
});

export const notesQuery = (artistId: string) =>
  queryOptions({
    queryKey: ["notes", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("artist_notes").select("*").eq("artist_id", artistId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const auditQuery = queryOptions({
  queryKey: ["audit"],
  queryFn: async () => {
    const { data, error } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(12);
    if (error) throw error;
    return data;
  },
});

export const myRolesQuery = queryOptions({
  queryKey: ["my-roles"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return { email: "", roles: [] as string[] };
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    return { email: u.user.email ?? "", roles: (data ?? []).map((r) => r.role as string) };
  },
});

export const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);
