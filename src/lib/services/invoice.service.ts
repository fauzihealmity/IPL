import { Prisma, InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextDocumentNumber } from "@/lib/services/document-number.service";
import { getPenaltyConfig } from "@/lib/services/settings.service";
import { calculateInvoiceTotal, computeDueDate } from "@/lib/services/invoice-calculation.util";

export { calculateInvoiceTotal, computeDueDate } from "@/lib/services/invoice-calculation.util";

/** Finds the IplRate in effect for a block on a given date. */
export async function getActiveRateForBlock(blockId: string, onDate: Date) {
  return prisma.iplRate.findFirst({
    where: {
      blockId,
      effectiveFrom: { lte: onDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: onDate } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
}

export interface GenerateInvoicesResult {
  createdCount: number;
  skippedExisting: number;
  skippedNoRate: string[]; // house labels with no active rate
}

/**
 * Generates one UNPAID invoice per active house for the given period,
 * using each house's block's currently-active IplRate as a snapshot
 * (spec §11, §23, §28: invoice values never change again even if the
 * rate later changes). Runs inside a single transaction so a bulk
 * generate either fully succeeds or fully rolls back (spec §45), and
 * relies on the houseId+periodMonth+periodYear unique constraint to
 * make re-running the same period a safe no-op for already-generated
 * houses rather than a duplicate (spec §23).
 */
export async function generateInvoicesForPeriod(
  periodMonth: number,
  periodYear: number
): Promise<GenerateInvoicesResult> {
  const config = await getPenaltyConfig();
  const dueDate = computeDueDate(periodMonth, periodYear, config.dueDateDay);
  const periodStart = new Date(periodYear, periodMonth - 1, 1);

  // "Rumah aktif": occupied units, i.e. not vacant/unsold — spec §23
  // ("sistem mengambil rumah aktif").
  const houses = await prisma.house.findMany({
    where: { status: { in: ["OWNER_OCCUPIED", "RENTED"] } },
    include: {
      block: true,
      residents: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  const existing = await prisma.invoice.findMany({
    where: { periodMonth, periodYear },
    select: { houseId: true },
  });
  const existingHouseIds = new Set(existing.map((e) => e.houseId));

  const skippedNoRate: string[] = [];
  let createdCount = 0;
  let skippedExisting = 0;

  await prisma.$transaction(async (tx) => {
    for (const house of houses) {
      if (existingHouseIds.has(house.id)) {
        skippedExisting += 1;
        continue;
      }

      const rate = await getActiveRateForBlock(house.blockId, periodStart);
      if (!rate) {
        skippedNoRate.push(`${house.block.name}-${house.houseNumber}`);
        continue;
      }

      const totalAmount = calculateInvoiceTotal({
        iplAmount: rate.amount,
        additionalFee: 0,
        penalty: 0,
        discount: 0,
      });

      const invoiceNumber = await nextDocumentNumber("IPL", new Date(), tx);

      await tx.invoice.create({
        data: {
          invoiceNumber,
          houseId: house.id,
          residentId: house.residents[0]?.id ?? null,
          iplRateId: rate.id,
          periodMonth,
          periodYear,
          iplAmount: rate.amount,
          additionalFee: 0,
          penalty: 0,
          discount: 0,
          totalAmount,
          dueDate,
          status: InvoiceStatus.UNPAID,
        },
      });
      createdCount += 1;
    }
  });

  return { createdCount, skippedExisting, skippedNoRate };
}

/**
 * Applies penalty + flips status to OVERDUE for invoices past their
 * due date that are still unpaid. Never touches invoices that are
 * already PAID/CANCELLED, and never rewrites historical amounts on
 * invoices that are already marked OVERDUE with a penalty already
 * applied (idempotent re-run — spec §28: "jangan mengubah nilai
 * historis invoice yang sudah dibayar").
 *
 * This is the function a future cron job (spec §51) will call; for
 * now it's exposed as an admin-triggered action on the Arrears page.
 */
export async function applyOverduePenalties(): Promise<{ updatedCount: number }> {
  const config = await getPenaltyConfig();
  const now = new Date();
  const graceDeadline = new Date(now);
  graceDeadline.setDate(graceDeadline.getDate() - config.gracePeriodDays);

  const candidates = await prisma.invoice.findMany({
    where: {
      status: InvoiceStatus.UNPAID,
      dueDate: { lt: graceDeadline },
    },
  });

  let updatedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const invoice of candidates) {
      const penaltyAmount =
        config.penaltyType === "PERCENTAGE"
          ? new Prisma.Decimal(invoice.iplAmount).times(config.penaltyAmount).dividedBy(100)
          : new Prisma.Decimal(config.penaltyAmount);

      const totalAmount = calculateInvoiceTotal({
        iplAmount: invoice.iplAmount,
        additionalFee: invoice.additionalFee,
        penalty: penaltyAmount,
        discount: invoice.discount,
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          penalty: penaltyAmount,
          totalAmount,
          status: InvoiceStatus.OVERDUE,
        },
      });
      updatedCount += 1;
    }
  });

  return { updatedCount };
}
