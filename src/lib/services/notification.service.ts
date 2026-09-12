import { prisma } from "@/lib/prisma";
import { UserRole, type NotificationType, type Prisma } from "@prisma/client";

export async function createNotification(
  params: { userId: string; title: string; message: string; type: NotificationType },
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  await tx.notification.create({ data: params });
}

/** Notifies every active Admin/Super Admin — used when there's no single
 * "owner" for an event (e.g. a new payment submission to review). */
export async function notifyAdmins(
  params: { title: string; message: string; type: NotificationType },
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  const admins = await tx.user.findMany({
    where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] }, status: "ACTIVE" },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await tx.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      title: params.title,
      message: params.message,
      type: params.type,
    })),
  });
}
