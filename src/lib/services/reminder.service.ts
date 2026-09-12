import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/services/notification.service";
import { InvoiceStatus } from "@prisma/client";
import { daysBetween, bucketFor, BUCKET_MESSAGE } from "@/lib/services/reminder-bucket.util";

export { daysBetween, bucketFor } from "@/lib/services/reminder-bucket.util";

/**
 * Prepared for spec §51's cron/scheduler (Vercel Cron, external
 * scheduler, or server cron all call this same function — nothing
 * here depends on a specific scheduler). Currently exposed as an
 * admin-triggered action on /admin/notifications until a real
 * scheduler is wired up.
 *
 * Idempotent per calendar day: before creating a reminder it checks
 * whether the same resident already got a DUE_REMINDER/OVERDUE
 * notification for that exact invoice today, so re-running this
 * multiple times in one day never spams the resident.
 */
export async function checkAndSendDueReminders(): Promise<{ sentCount: number }> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE] },
    },
    include: { resident: { include: { user: true } } },
  });

  let sentCount = 0;

  for (const invoice of invoices) {
    if (!invoice.resident?.userId) continue; // no login account to notify

    const daysUntilDue = daysBetween(now, invoice.dueDate);
    const bucket = bucketFor(daysUntilDue);
    if (!bucket) continue;

    const notificationType = bucket === "OVERDUE" ? "OVERDUE" : "DUE_REMINDER";
    const title =
      bucket === "OVERDUE" ? `Tagihan Terlambat: ${invoice.invoiceNumber}` : `Pengingat Jatuh Tempo (${bucket})`;

    const alreadySentToday = await prisma.notification.findFirst({
      where: {
        userId: invoice.resident.userId,
        type: notificationType,
        title,
        createdAt: { gte: startOfToday },
      },
    });
    if (alreadySentToday) continue;

    await createNotification({
      userId: invoice.resident.userId,
      title,
      message: BUCKET_MESSAGE[bucket](
        invoice.invoiceNumber,
        invoice.dueDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      ),
      type: notificationType,
    });
    sentCount += 1;
  }

  return { sentCount };
}
