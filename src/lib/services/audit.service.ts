import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface RecordAuditLogInput {
  userId: string | null;
  action: string; // e.g. "CREATE", "UPDATE", "DELETE"
  module: string; // e.g. "HOUSE", "RESIDENT", "IPL_RATE"
  recordId?: string | null;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Writes one audit log entry. Never pass password hashes or other
 * sensitive fields in oldValue/newValue (spec §22) — callers are
 * responsible for stripping those before calling this.
 */
export async function recordAuditLog(
  input: RecordAuditLogInput,
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  await tx.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      module: input.module,
      recordId: input.recordId ?? null,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
