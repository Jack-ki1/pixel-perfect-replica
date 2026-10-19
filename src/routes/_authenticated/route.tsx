import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, Compass, Gauge, Users, Kanban, Search, PieChart, Video, ShieldAlert, Star, TrendingUp, FlaskConical, Sprout, FileText, Database, Settings } from "lucide-react";
import { Logo } from "@/components/br-ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Shell,
});

const NAV = [
  { to: "/radar", label: "Command Centre", icon: Gauge },
  { to: "/artists", label: "Artists", icon: Users },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/audience", label: "Audience", icon: PieChart },
  { to: "/ugc", label: "UGC Intelligence", icon: Video },
  { to: "/integrity", label: "Growth Integrity", icon: ShieldAlert },
  { to: "/review", label: "Artistic Review", icon: Star },
  { to: "/pipeline", label: "A&R Pipeline", icon: Kanban },
  { to: "/predictions", label: "Predictions", icon: TrendingUp },
  { to: "/backtesting", label: "Backtesting", icon: FlaskConical },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/development", label: "Artist Development", icon: Sprout },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/sources", label: "Data Sources", icon: Database },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;


function Shell() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Logo className="mb-8 px-2" />
        <nav className="space-y-0.5 overflow-y-auto" aria-label="Main">
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
        <div className="mt-auto rounded-lg bg-sidebar-accent p-3 text-xs">
          <div className="font-medium">A&R Team</div>
          <div className="text-muted-foreground">Internal use only</div>
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
          <ThemeToggle />
          <Link to="/alerts" aria-label="Alerts" className="relative rounded-lg p-2 hover:bg-accent"><Bell className="size-4" /></Link>
          <nav className="flex gap-1 overflow-x-auto md:hidden">
            {NAV.map((n) => <Link key={n.to} to={n.to} aria-label={n.label} className="rounded-lg p-2 hover:bg-accent"><n.icon className="size-4" /></Link>)}
          </nav>
        </header>
        <main className="flex-1 p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
