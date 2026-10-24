import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/discovery")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { runDiscovery } = await import("@/lib/radar.server");
        try { return Response.json(await runDiscovery("scheduled")); }
        catch (e) { console.error(e); return Response.json({ error: "discovery failed" }, { status: 500 }); }
      },
    },
  },
});
