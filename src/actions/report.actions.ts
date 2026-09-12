"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { InvoiceStatus, PaymentStatus, PaymentMethod } from "@prisma/client";

export interface InvoiceReport {
  totalCount: number;
  totalAmount: number;
  paidCount: number;
  paidAmount: number;
  unpaidCount: number;
  unpaidAmount: number;
  overdueCount: number;
  overdueAmount: number;
}

/** Laporan Tagihan (spec §50). */
export async function getInvoiceReport(periodMonth?: number, periodYear?: number): Promise<InvoiceReport> {
  await requireAdmin();
  const where = periodMonth && periodYear ? { periodMonth, periodYear } : {};

  const [all, paid, unpaid, overdue] = await Promise.all([
    prisma.invoice.aggregate({ where, _count: true, _sum: { totalAmount: true } }),
    prisma.invoice.aggregate({
      where: { ...where, status: InvoiceStatus.PAID },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.invoice.aggregate({
      where: { ...where, status: InvoiceStatus.UNPAID },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.invoice.aggregate({
      where: { ...where, status: InvoiceStatus.OVERDUE },
      _count: true,
      _sum: { totalAmount: true },
    }),
  ]);

  return {
    totalCount: all._count,
    totalAmount: Number(all._sum.totalAmount ?? 0),
    paidCount: paid._count,
    paidAmount: Number(paid._sum.totalAmount ?? 0),
    unpaidCount: unpaid._count,
    unpaidAmount: Number(unpaid._sum.totalAmount ?? 0),
    overdueCount: overdue._count,
    overdueAmount: Number(overdue._sum.totalAmount ?? 0),
  };
}

export interface MonthlyTrendPoint {
  label: string; // "Apr 2026"
  income: number;
  expense: number;
}

/** Last N months of income vs expense, for the reports dashboard chart. */
export async function getMonthlyTrend(months = 6): Promise<MonthlyTrendPoint[]> {
  await requireAdmin();
  const now = new Date();
  const points: MonthlyTrendPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.incomeTransaction.aggregate({ where: { date: { gte: start, lt: end } }, _sum: { amount: true } }),
      prisma.expenseTransaction.aggregate({ where: { date: { gte: start, lt: end } }, _sum: { amount: true } }),
    ]);

    points.push({
      label: start.toLocaleDateString("id-ID", { month: "short", year: "numeric" }),
      income: Number(incomeAgg._sum.amount ?? 0),
      expense: Number(expenseAgg._sum.amount ?? 0),
    });
  }

  return points;
}

export interface PaymentReport {
  totalCount: number;
  totalAmount: number;
  byMethod: { method: PaymentMethod; count: number; amount: number }[];
}

/** Laporan Pembayaran (spec §50) — verified payments only, since those
 * are the ones that actually count as realized income. */
export async function getPaymentReport(dateFrom?: Date, dateTo?: Date): Promise<PaymentReport> {
  await requireAdmin();
  const where = {
    status: PaymentStatus.VERIFIED,
    ...(dateFrom || dateTo
      ? { paidAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } }
      : {}),
  };

  const [totals, byMethodRaw] = await Promise.all([
    prisma.payment.aggregate({ where, _count: true, _sum: { amount: true } }),
    prisma.payment.groupBy({ by: ["method"], where, _count: true, _sum: { amount: true } }),
  ]);

  return {
    totalCount: totals._count,
    totalAmount: Number(totals._sum.amount ?? 0),
    byMethod: byMethodRaw.map((row) => ({
      method: row.method,
      count: row._count,
      amount: Number(row._sum.amount ?? 0),
    })),
  };
}
