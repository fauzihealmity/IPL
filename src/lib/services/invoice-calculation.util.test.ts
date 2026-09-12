import { describe, it, expect } from "vitest";
import { computeDueDate, calculateInvoiceTotal } from "@/lib/services/invoice-calculation.util";
import { Prisma } from "@prisma/client";

describe("computeDueDate (pure date math — no Prisma runtime dependency)", () => {
  it("returns the given day of the month", () => {
    const date = computeDueDate(9, 2026, 10);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(8); // 0-indexed: September
    expect(date.getDate()).toBe(10);
  });

  it("clamps to the last day of a short month (e.g. day 31 in February)", () => {
    const date = computeDueDate(2, 2026, 31);
    expect(date.getMonth()).toBe(1); // February
    expect(date.getDate()).toBe(28); // 2026 is not a leap year
  });

  it("clamps correctly on a leap year February", () => {
    const date = computeDueDate(2, 2028, 31);
    expect(date.getDate()).toBe(29);
  });
});

// NOTE: calculateInvoiceTotal requires the real Prisma.Decimal class,
// which only exists after `npx prisma generate` has run against the
// schema. In this sandbox that command is blocked (see README), so
// this suite is expected to fail here with "Prisma.Decimal is not a
// constructor" — the same root cause documented for every phase of
// this project. It will pass once you run `prisma generate` in your
// own environment.
describe("calculateInvoiceTotal (spec §48 — Total = IPL + Fee + Penalty - Discount, floored at 0)", () => {
  it("sums IPL and additional fee, adds penalty, subtracts discount", () => {
    const total = calculateInvoiceTotal({
      iplAmount: 150000,
      additionalFee: 10000,
      penalty: 5000,
      discount: 2000,
    });
    expect(total.toNumber()).toBe(163000);
  });

  it("never returns a negative total even if discount exceeds the subtotal", () => {
    const total = calculateInvoiceTotal({
      iplAmount: 100000,
      additionalFee: 0,
      penalty: 0,
      discount: 999999,
    });
    expect(total.toNumber()).toBe(0);
  });

  it("handles Prisma.Decimal inputs (not just plain numbers)", () => {
    const total = calculateInvoiceTotal({
      iplAmount: new Prisma.Decimal("150000.50"),
      additionalFee: new Prisma.Decimal(0),
      penalty: new Prisma.Decimal(0),
      discount: new Prisma.Decimal(0),
    });
    expect(total.toString()).toBe("150000.5");
  });
});
