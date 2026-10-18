import { describe, it, expect } from "vitest";

describe("smoke test", () => {
  it("verifies vitest test runner is operational", () => {
    expect(1 + 1).toBe(2);
  });

  it("verifies basic object matching", () => {
    const payload = { project: "freelancer-finance-tracker", status: "active" };
    expect(payload).toEqual({
      project: "freelancer-finance-tracker",
      status: "active",
    });
  });
});
