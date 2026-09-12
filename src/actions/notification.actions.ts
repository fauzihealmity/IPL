"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/permissions";
import { checkAndSendDueReminders } from "@/lib/services/reminder.service";
import { recordAuditLog } from "@/lib/services/audit.service";
import { getRequestContext } from "@/lib/utils/request-context";

/** Any authenticated user (admin or resident) reading their own inbox. */
export async function listMyNotifications(params: { page?: number; pageSize?: number; unreadOnly?: boolean }) {
  const session = await requireAuth();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20));

  const where = { userId: session.user.id, ...(params.unreadOnly ? { isRead: false } : {}) };

  const [items, totalItems, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ]);

  return { items, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), page, pageSize, unreadCount };
}

export async function getUnreadNotificationCount() {
  const session = await requireAuth();
  return prisma.notification.count({ where: { userId: session.user.id, isRead: false } });
}

export async function markNotificationRead(id: string) {
  const session = await requireAuth();

  // Ownership check — never mark someone else's notification as read.
  const notification = await prisma.notification.findFirst({ where: { id, userId: session.user.id } });
  if (!notification) return { success: false as const, message: "Notifikasi tidak ditemukan." };

  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  revalidatePath("/admin/notifications");
  return { success: true as const };
}

export async function markAllNotificationsRead() {
  const session = await requireAuth();
  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/admin/notifications");
  return { success: true as const };
}

/** Admin-triggered reminder sweep (spec §51/§52 — same function a
 * future cron job will call). */
export async function runDueDateReminders() {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const result = await checkAndSendDueReminders();

  await recordAuditLog({
    userId: session.user.id,
    action: "SEND_REMINDERS",
    module: "NOTIFICATION",
    newValue: result,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/notifications");
  return { success: true as const, data: result };
}
