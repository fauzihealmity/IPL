import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type DocumentPrefix = "IPL" | "PAY" | "KWT" | "INC" | "EXP";

/**
 * Generates document numbers like IPL/2026/09/0001.
 *
 * Concurrency safety (spec §34): this does NOT use `count() + 1`, which
 * is racy under concurrent requests (two requests can read the same
 * count before either writes, producing duplicates). Instead it uses
 * an atomic upsert against a per-period counter row
 * (`DocumentSequence`), relying on Postgres row-level locking: the
 * increment happens inside whatever transaction the caller passes in,
 * so two concurrent invoice-generation transactions serialize on the
 * same counter row rather than racing.
 */
export async function nextDocumentNumber(
  prefix: DocumentPrefix,
  date: Date,
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<string> {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const key = `${prefix}-${year}-${month}`;

  const sequence = await tx.documentSequence.upsert({
    where: { key },
    create: { key, lastSequence: 1 },
    update: { lastSequence: { increment: 1 } },
  });

  const sequenceNumber = String(sequence.lastSequence).padStart(4, "0");
  return `${prefix}/${year}/${month}/${sequenceNumber}`;
}
