import { describe, it, expect } from "vitest";
import { isEmerging, fanGrowth30d, artisticOverall, recommend, weekStart, discoveryIndex } from "@/lib/scoring";

describe("scoring rules", () => {
  it("emerging means 100 to 300,000 fans", () => {
    expect(isEmerging(99)).toBe(false);
    expect(isEmerging(100)).toBe(true);
    expect(isEmerging(300_000)).toBe(true);
    expect(isEmerging(300_001)).toBe(false);
  });
  it("no growth figure from a single snapshot", () => expect(fanGrowth30d([{ captured_at: "2026-10-01T00:00:00Z", nb_fan: 100 }])).toBeNull());
  it("doubling over 30 days is +100%", () =>
    expect(fanGrowth30d([{ captured_at: "2026-10-01T00:00:00Z", nb_fan: 100 }, { captured_at: "2026-10-31T00:00:00Z", nb_fan: 200 }])).toBe(100));
  it("songwriting and vocals count double", () => {
    expect(artisticOverall({ songwriting: 10, vocals: 10, melody: 0, production: 0, originality: 0, commercial: 0 })).toBe(44);
  });
  it("no artistic review means hold", () => expect(recommend(90, null).tier).toBe("hold"));
  it("sign needs artistic ≥ 75 and combined ≥ 70", () => {
    expect(recommend(70, 80).tier).toBe("sign");
    expect(recommend(100, 70).tier).toBe("meet");
  });
  it("weeks start on Monday", () => expect(weekStart(new Date("2026-10-22T10:00:00Z"))).toBe("2026-10-19"));
  it("missing growth lowers confidence", () => {
    const f = { fans: 1000, topRank: 300000, playlistHits: 2, daysSinceRelease: 30, releases12m: 2, growth30d: null };
    expect(discoveryIndex(f).confidence).toBe(75);
    expect(discoveryIndex({ ...f, growth30d: 10 }).confidence).toBe(100);
  });
});
