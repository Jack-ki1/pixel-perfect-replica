import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { runWeeklyAnalysis } = await import("@/lib/radar.server");
        try { return Response.json(await runWeeklyAnalysis(4)); }
        catch (e) { console.error(e); return Response.json({ error: "analysis failed" }, { status: 500 }); }
      },
    },
  },
});
