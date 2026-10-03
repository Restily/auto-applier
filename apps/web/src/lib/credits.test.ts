import { describe, expect, it } from "vitest";

import { creditsView } from "@/lib/credits";

describe("creditsView", () => {
  it("treats null as 0 and empty", () => {
    expect(creditsView(null)).toEqual({ count: 0, tone: "empty" });
  });
  it("0 is empty", () => {
    expect(creditsView(0)).toEqual({ count: 0, tone: "empty" });
  });
  it("4 is low", () => {
    expect(creditsView(4)).toEqual({ count: 4, tone: "low" });
  });
  it("5 is normal", () => {
    expect(creditsView(5).tone).toBe("normal");
  });
  it("20 is normal", () => {
    expect(creditsView(20)).toEqual({ count: 20, tone: "normal" });
  });
});
