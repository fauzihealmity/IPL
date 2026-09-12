"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { recordAuditLog } from "@/lib/services/audit.service";
import { getRequestContext } from "@/lib/utils/request-context";
import { blockSchema, type BlockInput } from "@/lib/validation/block.schema";

export async function listBlocks() {
  await requireAdmin();
  return prisma.block.findMany({ orderBy: { name: "asc" } });
}

export async function createBlock(input: BlockInput) {
  const session = await requireAdmin();
  const data = blockSchema.parse(input);
  const { ipAddress, userAgent } = await getRequestContext();

  const existing = await prisma.block.findUnique({ where: { name: data.name } });
  if (existing) {
    return { success: false as const, message: "Nama blok sudah digunakan." };
  }

  const block = await prisma.block.create({ data });

  await recordAuditLog({
    userId: session.user.id,
    action: "CREATE",
    module: "BLOCK",
    recordId: block.id,
    newValue: block,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/houses");
  revalidatePath("/admin/ipl-rates");
  return { success: true as const, data: block };
}
