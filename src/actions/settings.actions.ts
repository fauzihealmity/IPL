"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin } from "@/lib/permissions";
import { recordAuditLog } from "@/lib/services/audit.service";
import { getRequestContext } from "@/lib/utils/request-context";
import { getGeneralSettings, setGeneralSettings } from "@/lib/services/settings.service";
import { generalSettingsSchema, type GeneralSettingsInput } from "@/lib/validation/general-settings.schema";

export async function getGeneralSettingsAction() {
  await requireAdmin();
  return getGeneralSettings();
}

/**
 * Residence identity (name/address/contact) affects every invoice,
 * receipt, and report header — restricted to SUPER_ADMIN so a
 * regular ADMIN can't silently change what the organization's
 * documents say it is.
 */
export async function updateGeneralSettings(input: GeneralSettingsInput) {
  const session = await requireSuperAdmin();
  const data = generalSettingsSchema.parse(input);
  const { ipAddress, userAgent } = await getRequestContext();

  const existing = await getGeneralSettings();
  await setGeneralSettings({
    residenceName: data.residenceName,
    address: data.address || "",
    phone: data.phone || "",
    email: data.email || "",
  });

  await recordAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    module: "SETTINGS_GENERAL",
    oldValue: { ...existing },
    newValue: { ...data },
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/settings");
  return { success: true as const };
}

/** Admin/user account overview — status only, no password data ever
 * leaves the server (spec §22 — never log/expose sensitive data). */
export async function listAdminUsers() {
  await requireSuperAdmin();
  return prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function setAdminUserStatus(userId: string, status: "ACTIVE" | "INACTIVE") {
  const session = await requireSuperAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  if (userId === session.user.id && status === "INACTIVE") {
    return { success: false as const, message: "Anda tidak dapat menonaktifkan akun Anda sendiri." };
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return { success: false as const, message: "Akun tidak ditemukan." };

  const updated = await prisma.user.update({ where: { id: userId }, data: { status } });

  await recordAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    module: "USER_STATUS",
    recordId: userId,
    oldValue: { status: existing.status },
    newValue: { status: updated.status },
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/settings");
  return { success: true as const };
}
