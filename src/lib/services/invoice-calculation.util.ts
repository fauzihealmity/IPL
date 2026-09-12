// Pure calculation logic extracted from invoice.service.ts so it can
// be unit tested without pulling in prisma.ts (which instantiates a
// PrismaClient at import time and therefore requires `prisma
// generate` to have run). This module still needs the *type* and the
// *runtime* Decimal class from @prisma/client (spec §47 — never use
// JS floating point for money), so calculateInvoiceTotal itself still
// requires a generated client to execute; only the DB-connection
// dependency has been removed here.

import { Prisma } from "@prisma/client";

/**
 * Total = (IPL + Additional Fee) + Penalty - Discount, floored at 0
 * (spec §48). All money uses Prisma.Decimal — never JS floating point
 * (spec §47).
 */
export function calculateInvoiceTotal(params: {
  iplAmount: Prisma.Decimal | number;
  additionalFee: Prisma.Decimal | number;
  penalty: Prisma.Decimal | number;
  discount: Prisma.Decimal | number;
}): Prisma.Decimal {
  const subtotal = new Prisma.Decimal(params.iplAmount).plus(params.additionalFee);
  const total = subtotal.plus(params.penalty).minus(params.discount);
  return total.lessThan(0) ? new Prisma.Decimal(0) : total;
}

/**
 * Clamps the due-date day to the last day of the target month (e.g.
 * day 31 in February) — pure date math, no I/O.
 */
export function computeDueDate(periodMonth: number, periodYear: number, dueDateDay: number): Date {
  const lastDayOfMonth = new Date(periodYear, periodMonth, 0).getDate();
  const day = Math.min(dueDateDay, lastDayOfMonth);
  return new Date(periodYear, periodMonth - 1, day);
}
