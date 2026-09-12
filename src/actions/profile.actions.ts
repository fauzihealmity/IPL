"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireResident } from "@/lib/permissions";
import { recordAuditLog } from "@/lib/services/audit.service";
import { getRequestContext } from "@/lib/utils/request-context";
import {
  updateProfileSchema,
  changePasswordSchema,
  type UpdateProfileInput,
  type ChangePasswordInput,
} from "@/lib/validation/profile.schema";

/** A resident only ever reads/writes their own record — residentId
 * comes from the session, never from client input (spec §39). */
export async function getMyProfile() {
  const session = await requireResident();
  return prisma.resident.findUnique({
    where: { id: session.user.residentId },
    include: { house: { include: { block: true } }, user: { select: { email: true, status: true } } },
  });
}

export async function updateMyProfile(input: UpdateProfileInput) {
  const session = await requireResident();
  const data = updateProfileSchema.parse(input);
  const { ipAddress, userAgent } = await getRequestContext();

  const existing = await prisma.resident.findUnique({ where: { id: session.user.residentId } });
  if (!existing) return { success: false as const, message: "Data warga tidak ditemukan." };

  const updated = await prisma.resident.update({
    where: { id: session.user.residentId },
    data: {
      phone: data.phone || null,
      email: data.email || null,
    },
  });

  await recordAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    module: "PROFILE",
    recordId: session.user.residentId,
    oldValue: { phone: existing.phone, email: existing.email },
    newValue: { phone: updated.phone, email: updated.email },
    ipAddress,
    userAgent,
  });

  revalidatePath("/resident/profile");
  return { success: true as const };
}

export async function changeMyPassword(input: ChangePasswordInput) {
  const session = await requireResident();
  const data = changePasswordSchema.parse(input);
  const { ipAddress, userAgent } = await getRequestContext();

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { success: false as const, message: "Akun tidak ditemukan." };

  const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!isValid) {
    return { success: false as const, message: "Password saat ini salah." };
  }

  const newHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

  // Never write password hashes into the audit log (spec §22) — only
  // record that a change happened.
  await recordAuditLog({
    userId: session.user.id,
    action: "CHANGE_PASSWORD",
    module: "PROFILE",
    recordId: user.id,
    ipAddress,
    userAgent,
  });

  return { success: true as const };
}
