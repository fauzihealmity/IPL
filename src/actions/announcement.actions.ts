"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireResident } from "@/lib/permissions";
import { recordAuditLog } from "@/lib/services/audit.service";
import { getRequestContext } from "@/lib/utils/request-context";
import { saveUploadedFile, FileValidationError } from "@/lib/services/file-upload.service";
import { announcementSchema } from "@/lib/validation/announcement.schema";
import { UserRole, type Prisma } from "@prisma/client";

export async function listAnnouncements(params: { page?: number; pageSize?: number }) {
  await requireAdmin();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));

  const [items, totalItems] = await prisma.$transaction([
    prisma.announcement.findMany({
      orderBy: { publishAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.announcement.count(),
  ]);

  return { items, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), page, pageSize };
}

async function parseAnnouncementForm(formData: FormData) {
  const expiresAtRaw = formData.get("expiresAt");
  const targetAudienceRaw = formData.get("targetAudience");

  return announcementSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    publishAt: formData.get("publishAt"),
    expiresAt: expiresAtRaw ? expiresAtRaw : null,
    targetAudience: targetAudienceRaw && targetAudienceRaw !== "ALL" ? targetAudienceRaw : null,
  });
}

export async function createAnnouncement(formData: FormData) {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const parsed = await parseAnnouncementForm(formData);
  if (!parsed.success) {
    return { success: false as const, message: "Data pengumuman tidak valid." };
  }
  const data = parsed.data;

  let imageUrl: string | null = null;
  let attachmentUrl: string | null = null;

  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      const stored = await saveUploadedFile(imageFile, "announcements");
      imageUrl = stored.fileUrl;
    } catch (err) {
      if (err instanceof FileValidationError) return { success: false as const, message: err.message };
      throw err;
    }
  }

  const attachmentFile = formData.get("attachment");
  if (attachmentFile instanceof File && attachmentFile.size > 0) {
    try {
      const stored = await saveUploadedFile(attachmentFile, "announcements");
      attachmentUrl = stored.fileUrl;
    } catch (err) {
      if (err instanceof FileValidationError) return { success: false as const, message: err.message };
      throw err;
    }
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: data.title,
      content: data.content,
      publishAt: data.publishAt,
      expiresAt: data.expiresAt ?? null,
      targetAudience: data.targetAudience ?? null,
      imageUrl,
      attachmentUrl,
    },
  });

  await recordAuditLog({
    userId: session.user.id,
    action: "CREATE",
    module: "ANNOUNCEMENT",
    recordId: announcement.id,
    newValue: announcement,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/resident/announcements");
  revalidatePath("/resident/dashboard");
  return { success: true as const, data: announcement };
}

export async function updateAnnouncement(id: string, formData: FormData) {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) return { success: false as const, message: "Pengumuman tidak ditemukan." };

  const parsed = await parseAnnouncementForm(formData);
  if (!parsed.success) {
    return { success: false as const, message: "Data pengumuman tidak valid." };
  }
  const data = parsed.data;

  let imageUrl = existing.imageUrl;
  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      const stored = await saveUploadedFile(imageFile, "announcements");
      imageUrl = stored.fileUrl;
    } catch (err) {
      if (err instanceof FileValidationError) return { success: false as const, message: err.message };
      throw err;
    }
  }

  let attachmentUrl = existing.attachmentUrl;
  const attachmentFile = formData.get("attachment");
  if (attachmentFile instanceof File && attachmentFile.size > 0) {
    try {
      const stored = await saveUploadedFile(attachmentFile, "announcements");
      attachmentUrl = stored.fileUrl;
    } catch (err) {
      if (err instanceof FileValidationError) return { success: false as const, message: err.message };
      throw err;
    }
  }

  const updated = await prisma.announcement.update({
    where: { id },
    data: {
      title: data.title,
      content: data.content,
      publishAt: data.publishAt,
      expiresAt: data.expiresAt ?? null,
      targetAudience: data.targetAudience ?? null,
      imageUrl,
      attachmentUrl,
    },
  });

  await recordAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    module: "ANNOUNCEMENT",
    recordId: id,
    oldValue: existing,
    newValue: updated,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/resident/announcements");
  revalidatePath("/resident/dashboard");
  return { success: true as const, data: updated };
}

export async function deleteAnnouncement(id: string) {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) return { success: false as const, message: "Pengumuman tidak ditemukan." };

  await prisma.announcement.delete({ where: { id } });

  await recordAuditLog({
    userId: session.user.id,
    action: "DELETE",
    module: "ANNOUNCEMENT",
    recordId: id,
    oldValue: existing,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/resident/announcements");
  return { success: true as const };
}

// ── Resident: view active announcements targeted at them ───────────
export async function listActiveAnnouncementsForResident(params: { page?: number; pageSize?: number }) {
  await requireResident();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));
  const now = new Date();

  const where: Prisma.AnnouncementWhereInput = {
    publishAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    AND: [{ OR: [{ targetAudience: null }, { targetAudience: UserRole.RESIDENT }] }],
  };

  const [items, totalItems] = await prisma.$transaction([
    prisma.announcement.findMany({
      where,
      orderBy: { publishAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.announcement.count({ where }),
  ]);

  return { items, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), page, pageSize };
}
