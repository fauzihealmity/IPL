"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { recordAuditLog } from "@/lib/services/audit.service";
import { getRequestContext } from "@/lib/utils/request-context";
import { iplRateSchema, type IplRateInput } from "@/lib/validation/ipl-rate.schema";

export async function listIplRates() {
  await requireAdmin();
  return prisma.iplRate.findMany({
    include: { block: true },
    orderBy: [{ block: { name: "asc" } }, { effectiveFrom: "desc" }],
  });
}

/**
 * Tarif yang berubah TIDAK BOLEH mengubah invoice lama (spec §11, §28) —
 * invoice menyimpan snapshot nominal saat generate. Fungsi ini hanya
 * mengelola master data tarif itu sendiri; invoice generation (Phase 3)
 * yang membaca tarif aktif pada saat itu dan menyalinnya sebagai snapshot.
 */
export async function createIplRate(input: IplRateInput) {
  const session = await requireAdmin();
  const data = iplRateSchema.parse(input);
  const { ipAddress, userAgent } = await getRequestContext();

  const block = await prisma.block.findUnique({ where: { id: data.blockId } });
  if (!block) {
    return { success: false as const, message: "Blok tidak ditemukan." };
  }

  const rate = await prisma.iplRate.create({
    data: {
      blockId: data.blockId,
      name: data.name,
      amount: data.amount,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo ?? null,
    },
  });

  await recordAuditLog({
    userId: session.user.id,
    action: "CREATE",
    module: "IPL_RATE",
    recordId: rate.id,
    newValue: rate,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/ipl-rates");
  return { success: true as const, data: rate };
}

export async function updateIplRate(id: string, input: IplRateInput) {
  const session = await requireAdmin();
  const data = iplRateSchema.parse(input);
  const { ipAddress, userAgent } = await getRequestContext();

  const existing = await prisma.iplRate.findUnique({ where: { id } });
  if (!existing) {
    return { success: false as const, message: "Tarif tidak ditemukan." };
  }

  // Editing an IplRate row only changes the master-data record itself.
  // Invoices already generated against it keep their own snapshot
  // values (iplAmount/totalAmount) untouched — see Invoice model.
  const updated = await prisma.iplRate.update({
    where: { id },
    data: {
      blockId: data.blockId,
      name: data.name,
      amount: data.amount,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo ?? null,
    },
  });

  await recordAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    module: "IPL_RATE",
    recordId: id,
    oldValue: existing,
    newValue: updated,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/ipl-rates");
  return { success: true as const, data: updated };
}

export async function deleteIplRate(id: string) {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const rate = await prisma.iplRate.findUnique({ where: { id }, include: { invoices: true } });
  if (!rate) {
    return { success: false as const, message: "Tarif tidak ditemukan." };
  }
  if (rate.invoices.length > 0) {
    return {
      success: false as const,
      message: "Tarif tidak dapat dihapus karena sudah dipakai pada tagihan.",
    };
  }

  await prisma.iplRate.delete({ where: { id } });

  await recordAuditLog({
    userId: session.user.id,
    action: "DELETE",
    module: "IPL_RATE",
    recordId: id,
    oldValue: rate,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/ipl-rates");
  return { success: true as const };
}
