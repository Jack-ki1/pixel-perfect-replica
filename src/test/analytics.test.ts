import { describe, it, expect } from "vitest";
import { growthMultiplier, compareSegments, isSuppressed, isEligibleClean } from "@/lib/analytics";

describe("analytics", () => {
  it("multiplier 186 vs 42 is 4.4", () => expect(growthMultiplier(186, 42)).toBe(4.4));
  it("no multiplier when expected is 0", () => expect(growthMultiplier(10, 0)).toBeNull());
  it("share pp and absolute change are independent", () => {
    const s = compareSegments({ a: 50 }, 1000, { a: 40 }, 2000)[0]!;
    expect(s.ppChange).toBe(-10);
    expect(s.absChange).toBe(300);
  });
  it("suppresses groups under 50 people", () => {
    expect(isSuppressed(1, 1000)).toBe(true);
    expect(isSuppressed(10, 1000)).toBe(false);
  });
  it("suspicious artists are not clean candidates", () => {
    expect(isEligibleClean("suspicious")).toBe(false);
    expect(isEligibleClean("organic")).toBe(true);
  });
});
