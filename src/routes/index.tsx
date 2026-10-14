import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Breakout Radar" },
      { name: "description", content: "Internal A&R intelligence workspace." },
      { property: "og:title", content: "Breakout Radar" },
      { property: "og:description", content: "Internal A&R intelligence workspace." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/radar" });
  },
});
