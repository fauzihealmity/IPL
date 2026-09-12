import { describe, it, expect } from "vitest";
import { daysBetween, bucketFor } from "@/lib/services/reminder-bucket.util";

describe("daysBetween", () => {
  it("returns 0 for the same day", () => {
    const a = new Date(2026, 8, 10, 3, 0, 0);
    const b = new Date(2026, 8, 10, 22, 0, 0);
    expect(daysBetween(a, b)).toBe(0);
  });

  it("returns a positive number when b is after a", () => {
    const a = new Date(2026, 8, 10);
    const b = new Date(2026, 8, 17);
    expect(daysBetween(a, b)).toBe(7);
  });

  it("returns a negative number when b is before a", () => {
    const a = new Date(2026, 8, 10);
    const b = new Date(2026, 8, 5);
    expect(daysBetween(a, b)).toBe(-5);
  });
});

describe("bucketFor (reminder timing — spec §52: H-7/H-3/H-1/Hari H/Overdue)", () => {
  it("returns H-7 exactly 7 days before due date", () => {
    expect(bucketFor(7)).toBe("H-7");
  });

  it("returns H-3 exactly 3 days before due date", () => {
    expect(bucketFor(3)).toBe("H-3");
  });

  it("returns H-1 exactly 1 day before due date", () => {
    expect(bucketFor(1)).toBe("H-1");
  });

  it("returns HARI_H on the due date itself", () => {
    expect(bucketFor(0)).toBe("HARI_H");
  });

  it("returns OVERDUE for any day past the due date", () => {
    expect(bucketFor(-1)).toBe("OVERDUE");
    expect(bucketFor(-30)).toBe("OVERDUE");
  });

  it("returns null for days that don't match any reminder bucket (e.g. 5, 6, 2 days out)", () => {
    expect(bucketFor(5)).toBeNull();
    expect(bucketFor(6)).toBeNull();
    expect(bucketFor(2)).toBeNull();
    expect(bucketFor(10)).toBeNull();
  });
});
