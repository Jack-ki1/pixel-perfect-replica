import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "@/components/br-ui";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Breakout Radar" }, { name: "description", content: "Team roles and app settings." }] }),
  component: Settings,
});

const ROLES = [
  { role: "Admin", can: "Everything, including managing team roles and marking Signed" },
  { role: "Head of A&R", can: "Move artists to any stage, including Signed" },
  { role: "Scout", can: "Move artists, add notes, open integrity cases" },
  { role: "Analyst", can: "Read data, run backtests and reports" },
  { role: "Artist Development", can: "Manage development plans" },
];

function Settings() {
  return (
    <div className="space-y-4">
      <Panel title="Access" sub="Sign-in is paused for review. Anyone with the link can use the app.">
        <p className="text-sm text-muted-foreground">Team members and role changes become available here once sign-in is switched back on.</p>
      </Panel>
      <Panel title="Roles">
        <ul className="divide-y text-sm">{ROLES.map((r) => <li key={r.role} className="flex gap-4 py-2.5"><b className="w-40 shrink-0">{r.role}</b><span className="text-muted-foreground">{r.can}</span></li>)}</ul>
      </Panel>
      <Panel title="Scoring policy">
        <p className="text-sm text-muted-foreground">All scores are 0–100 ranking indices, never probabilities. Synthetic records always carry a Demo badge.</p>
      </Panel>
    </div>
  );
}
