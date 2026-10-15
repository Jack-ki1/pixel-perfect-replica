import { createFileRoute, redirect, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Compass, Gauge, Users, Kanban, Search, LogOut, PieChart, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/br-ui";
import { myRolesQuery } from "@/lib/artists";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // REVIEW MODE: sign-in gate temporarily disabled so the team can review demo screens.
  beforeLoad: async () => {
    if (!REVIEW_MODE) {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw redirect({ to: "/auth" });
    }
  },
  component: Shell,
});

const REVIEW_MODE = true;

const NAV = [
  { to: "/radar", label: "Command Centre", icon: Gauge },
  { to: "/artists", label: "Artists", icon: Users },
  { to: "/audience", label: "Audience", icon: PieChart },
  { to: "/pipeline", label: "A&R Pipeline", icon: Kanban },
] as const;
const NEXT = ["Discover", "UGC Intelligence", "Growth Integrity", "Artistic Review", "Predictions", "Backtesting", "Alerts", "Artist Development", "Reports", "Data Sources", "Settings"];

const ROLE_LABEL: Record<string, string> = { admin: "Admin", head_of_ar: "Head of A&R", scout: "Scout", analyst: "Analyst", artist_dev: "Artist Development" };

function Shell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: me } = useQuery(myRolesQuery);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Logo className="mb-8 px-2" />
        <nav className="space-y-1" aria-label="Main">
          {NAV.map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "bg-sidebar-primary text-sidebar-primary-foreground glow" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
                <n.icon className="size-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Next phase</div>
        <ul className="mt-2 space-y-0.5 overflow-y-auto">
          {NEXT.map((l) => (
            <li key={l} className="flex items-center gap-3 px-3 py-1.5 text-xs text-muted-foreground/60" title="Coming in the next build phase">
              <Lock className="size-3" /> {l}
            </li>
          ))}
        </ul>
        <div className="mt-auto rounded-lg bg-sidebar-accent p-3 text-xs">
          {REVIEW_MODE && !me?.email && <div className="mb-1 font-semibold text-amber">Review mode · sign-in paused</div>}
          <div className="truncate font-medium">{me?.email}</div>
          <div className="text-muted-foreground">{me?.roles.map((r) => ROLE_LABEL[r] ?? r).join(", ") || "No role assigned"}</div>
          <button onClick={signOut} className="mt-2 flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><LogOut className="size-3" /> Sign out</button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background/85 px-4 backdrop-blur md:px-6">
          <form className="relative max-w-md flex-1" onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q") as string; navigate({ to: "/artists", search: { q } }); }}>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input name="q" aria-label="Search artists" placeholder="Search artists, genres, cities…" className="h-9 w-full rounded-lg border bg-panel pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </form>
          <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <Compass className="size-3.5" /> Africa · 6 markets
            <span className="mx-2 h-4 w-px bg-border" />
            Data as of 14 Sep 2026 · demo fixtures
          </div>
          <Link to="/pipeline" aria-label="Recent activity" className="relative rounded-lg p-2 hover:bg-accent"><Bell className="size-4" /></Link>
          <nav className="flex gap-1 md:hidden">
            {NAV.map((n) => <Link key={n.to} to={n.to} aria-label={n.label} className="rounded-lg p-2 hover:bg-accent"><n.icon className="size-4" /></Link>)}
          </nav>
        </header>
        <main className="flex-1 p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
