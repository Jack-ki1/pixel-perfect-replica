import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Review mode: these are callable without sign-in. Batch sizes are capped to bound cost.
export const discoverNow = createServerFn({ method: "POST" }).handler(async () => {
  const { runDiscovery } = await import("./radar.server");
  return runDiscovery("manual");
});

export const analyseNow = createServerFn({ method: "POST" }).handler(async () => {
  const { runWeeklyAnalysis } = await import("./radar.server");
  return runWeeklyAnalysis(3);
});

export const analyseOne = createServerFn({ method: "POST" })
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { analyseArtist } = await import("./radar.server");
    try { return { ok: true as const, ...(await analyseArtist(data.id)) }; }
    catch (e) { return { ok: false as const, error: (e as Error).message }; }
  });
