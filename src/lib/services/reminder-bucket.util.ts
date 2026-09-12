// Pure logic extracted from reminder.service.ts specifically so it can
// be unit tested in isolation, with zero dependency on Prisma or any
// other I/O — importing this file never touches the database.

export type ReminderBucket = "H-7" | "H-3" | "H-1" | "HARI_H" | "OVERDUE";

export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const startOfA = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const startOfB = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((startOfB.getTime() - startOfA.getTime()) / msPerDay);
}

export function bucketFor(daysUntilDue: number): ReminderBucket | null {
  if (daysUntilDue === 7) return "H-7";
  if (daysUntilDue === 3) return "H-3";
  if (daysUntilDue === 1) return "H-1";
  if (daysUntilDue === 0) return "HARI_H";
  if (daysUntilDue < 0) return "OVERDUE";
  return null;
}

export const BUCKET_MESSAGE: Record<ReminderBucket, (invoiceNumber: string, dueDateLabel: string) => string> = {
  "H-7": (n, d) => `Tagihan ${n} jatuh tempo dalam 7 hari (${d}). Segera lakukan pembayaran.`,
  "H-3": (n, d) => `Tagihan ${n} jatuh tempo dalam 3 hari (${d}).`,
  "H-1": (n, d) => `Tagihan ${n} jatuh tempo besok (${d}).`,
  HARI_H: (n, d) => `Tagihan ${n} jatuh tempo hari ini (${d}).`,
  OVERDUE: (n, d) => `Tagihan ${n} sudah melewati jatuh tempo (${d}). Denda keterlambatan mungkin berlaku.`,
};
