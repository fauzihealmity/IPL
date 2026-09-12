"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireResident } from "@/lib/permissions";
import { recordAuditLog } from "@/lib/services/audit.service";
import { getRequestContext } from "@/lib/utils/request-context";
import {
  generateInvoicesForPeriod,
  applyOverduePenalties,
} from "@/lib/services/invoice.service";
import { getPenaltyConfig, setPenaltyConfig } from "@/lib/services/settings.service";
import {
  generateInvoicesSchema,
  penaltyConfigSchema,
  type GenerateInvoicesInput,
  type PenaltyConfigInput,
} from "@/lib/validation/invoice.schema";
import { InvoiceStatus, Prisma } from "@prisma/client";

export interface ListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
  status?: InvoiceStatus;
  periodMonth?: number;
  periodYear?: number;
}

const SORTABLE_FIELDS = ["dueDate", "totalAmount", "createdAt"] as const;

export async function listInvoices(params: ListParams) {
  await requireAdmin();

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));
  const sort = SORTABLE_FIELDS.includes(params.sort as (typeof SORTABLE_FIELDS)[number])
    ? (params.sort as (typeof SORTABLE_FIELDS)[number])
    : "createdAt";
  const order = params.order === "asc" ? "asc" : "desc";

  const where: Prisma.InvoiceWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.periodMonth ? { periodMonth: params.periodMonth } : {}),
    ...(params.periodYear ? { periodYear: params.periodYear } : {}),
    ...(params.q
      ? {
          OR: [
            { invoiceNumber: { contains: params.q, mode: "insensitive" as const } },
            { house: { houseNumber: { contains: params.q, mode: "insensitive" as const } } },
            { resident: { fullName: { contains: params.q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [items, totalItems] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      include: { house: { include: { block: true } }, resident: true },
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    items,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    page,
    pageSize,
  };
}

export async function getInvoiceDetail(id: string) {
  await requireAdmin();
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      house: { include: { block: true } },
      resident: true,
      iplRate: true,
      items: true,
      payments: true,
    },
  });
}

/** Resident-facing: scoped to the logged-in resident's own invoices only. */
export async function listMyInvoices(params: { page?: number; pageSize?: number }) {
  const session = await requireResident();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));

  const where: Prisma.InvoiceWhereInput = { residentId: session.user.residentId };

  const [items, totalItems] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { items, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), page, pageSize };
}

export async function generateInvoices(input: GenerateInvoicesInput) {
  const session = await requireAdmin();
  const data = generateInvoicesSchema.parse(input);
  const { ipAddress, userAgent } = await getRequestContext();

  const result = await generateInvoicesForPeriod(data.periodMonth, data.periodYear);

  await recordAuditLog({
    userId: session.user.id,
    action: "GENERATE",
    module: "INVOICE",
    newValue: { period: `${data.periodMonth}/${data.periodYear}`, ...result },
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/invoices");
  revalidatePath("/admin/dashboard");
  return { success: true as const, data: result };
}

export async function cancelInvoice(id: string, reason: string) {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    return { success: false as const, message: "Tagihan tidak ditemukan." };
  }
  if (invoice.status === InvoiceStatus.PAID) {
    return {
      success: false as const,
      message: "Tagihan yang sudah lunas tidak dapat dibatalkan.",
    };
  }
  if (invoice.status === InvoiceStatus.CANCELLED) {
    return { success: false as const, message: "Tagihan sudah dibatalkan sebelumnya." };
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: InvoiceStatus.CANCELLED },
  });

  await recordAuditLog({
    userId: session.user.id,
    action: "CANCEL",
    module: "INVOICE",
    recordId: id,
    oldValue: invoice,
    newValue: { ...updated, reason },
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/invoices");
  return { success: true as const, data: updated };
}

// ── Arrears (spec §49) ───────────────────────────────────────────
export interface ArrearsRow {
  invoiceId: string;
  houseLabel: string;
  residentName: string | null;
  totalAmount: number;
  dueDate: Date;
  monthsOverdue: number;
  agingBucket: "1_BULAN" | "2_BULAN" | "3_5_BULAN" | "LEBIH_5_BULAN";
}

export async function listArrears(): Promise<{
  rows: ArrearsRow[];
  totalOutstanding: number;
  byBucket: Record<ArrearsRow["agingBucket"], number>;
}> {
  await requireAdmin();
  const now = new Date();

  const invoices = await prisma.invoice.findMany({
    where: {
      status: { not: InvoiceStatus.PAID },
      dueDate: { lt: now },
    },
    include: { house: { include: { block: true } }, resident: true },
    orderBy: { dueDate: "asc" },
  });

  const rows: ArrearsRow[] = invoices
    .filter((inv) => inv.status !== InvoiceStatus.CANCELLED)
    .map((inv) => {
      const monthsOverdue = Math.max(
        1,
        Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
      );
      const agingBucket: ArrearsRow["agingBucket"] =
        monthsOverdue <= 1
          ? "1_BULAN"
          : monthsOverdue === 2
            ? "2_BULAN"
            : monthsOverdue <= 5
              ? "3_5_BULAN"
              : "LEBIH_5_BULAN";

      return {
        invoiceId: inv.id,
        houseLabel: `${inv.house.block.name}-${inv.house.houseNumber}`,
        residentName: inv.resident?.fullName ?? null,
        totalAmount: Number(inv.totalAmount),
        dueDate: inv.dueDate,
        monthsOverdue,
        agingBucket,
      };
    });

  const byBucket: Record<ArrearsRow["agingBucket"], number> = {
    "1_BULAN": 0,
    "2_BULAN": 0,
    "3_5_BULAN": 0,
    LEBIH_5_BULAN: 0,
  };
  let totalOutstanding = 0;
  for (const row of rows) {
    byBucket[row.agingBucket] += row.totalAmount;
    totalOutstanding += row.totalAmount;
  }

  return { rows, totalOutstanding, byBucket };
}

export async function runApplyOverduePenalties() {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const result = await applyOverduePenalties();

  await recordAuditLog({
    userId: session.user.id,
    action: "APPLY_PENALTY",
    module: "INVOICE",
    newValue: result,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/arrears");
  revalidatePath("/admin/invoices");
  return { success: true as const, data: result };
}

// ── Penalty configuration ────────────────────────────────────────
export async function getPenaltyConfigAction() {
  await requireAdmin();
  return getPenaltyConfig();
}

export async function updatePenaltyConfig(input: PenaltyConfigInput) {
  const session = await requireAdmin();
  const data = penaltyConfigSchema.parse(input);
  const { ipAddress, userAgent } = await getRequestContext();

  await setPenaltyConfig(data);

  await recordAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    module: "SETTINGS",
    newValue: data,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/arrears");
  revalidatePath("/admin/invoices");
  return { success: true as const };
}
