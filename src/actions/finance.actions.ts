"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireResident } from "@/lib/permissions";
import { recordAuditLog } from "@/lib/services/audit.service";
import { getRequestContext } from "@/lib/utils/request-context";
import { nextDocumentNumber } from "@/lib/services/document-number.service";
import { saveUploadedFile, FileValidationError } from "@/lib/services/file-upload.service";
import { expenseSchema, EXPENSE_CATEGORIES } from "@/lib/validation/finance.schema";
import type { Prisma } from "@prisma/client";

export interface ListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// ── Admin: Income (read + visibility toggle only — rows are created
// automatically by payment verification in Phase 4, never entered by
// hand) ────────────────────────────────────────────────────────────
export async function listIncomeTransactions(params: ListParams) {
  await requireAdmin();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));

  const where: Prisma.IncomeTransactionWhereInput = {
    ...(params.dateFrom || params.dateTo
      ? { date: { ...(params.dateFrom ? { gte: params.dateFrom } : {}), ...(params.dateTo ? { lte: params.dateTo } : {}) } }
      : {}),
  };

  const [items, totalItems, sumAgg] = await prisma.$transaction([
    prisma.incomeTransaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.incomeTransaction.count({ where }),
    prisma.incomeTransaction.aggregate({ where, _sum: { amount: true } }),
  ]);

  return {
    items,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    page,
    pageSize,
    totalAmount: Number(sumAgg._sum.amount ?? 0),
  };
}

export async function setIncomeVisibility(id: string, isPublic: boolean) {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const existing = await prisma.incomeTransaction.findUnique({ where: { id } });
  if (!existing) return { success: false as const, message: "Transaksi tidak ditemukan." };

  const updated = await prisma.incomeTransaction.update({ where: { id }, data: { isPublic } });

  await recordAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    module: "INCOME_VISIBILITY",
    recordId: id,
    oldValue: { isPublic: existing.isPublic },
    newValue: { isPublic: updated.isPublic },
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/finance");
  revalidatePath("/resident/transparency");
  return { success: true as const };
}

// ── Admin: Expense (full CRUD — manually entered) ──────────────────
export async function listExpenseTransactions(params: ListParams) {
  await requireAdmin();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));

  const where: Prisma.ExpenseTransactionWhereInput = {
    ...(params.category ? { category: params.category } : {}),
    ...(params.dateFrom || params.dateTo
      ? { date: { ...(params.dateFrom ? { gte: params.dateFrom } : {}), ...(params.dateTo ? { lte: params.dateTo } : {}) } }
      : {}),
  };

  const [items, totalItems, sumAgg] = await prisma.$transaction([
    prisma.expenseTransaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expenseTransaction.count({ where }),
    prisma.expenseTransaction.aggregate({ where, _sum: { amount: true } }),
  ]);

  return {
    items,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    page,
    pageSize,
    totalAmount: Number(sumAgg._sum.amount ?? 0),
  };
}

export async function createExpenseTransaction(formData: FormData) {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const parsed = expenseSchema.safeParse({
    date: formData.get("date"),
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    isPublic: formData.get("isPublic") === "true",
  });
  if (!parsed.success) {
    return { success: false as const, message: "Data pengeluaran tidak valid." };
  }
  const data = parsed.data;

  let receiptUrl: string | null = null;
  const receiptFile = formData.get("receipt");
  if (receiptFile instanceof File && receiptFile.size > 0) {
    try {
      const stored = await saveUploadedFile(receiptFile, "expense-receipts");
      receiptUrl = stored.fileUrl;
    } catch (err) {
      if (err instanceof FileValidationError) {
        return { success: false as const, message: err.message };
      }
      throw err;
    }
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const transactionNumber = await nextDocumentNumber("EXP", data.date, tx);
    const created = await tx.expenseTransaction.create({
      data: {
        transactionNumber,
        date: data.date,
        category: data.category,
        description: data.description,
        amount: data.amount,
        receiptUrl,
        isPublic: data.isPublic,
      },
    });

    await recordAuditLog(
      {
        userId: session.user.id,
        action: "CREATE",
        module: "EXPENSE",
        recordId: created.id,
        newValue: created,
        ipAddress,
        userAgent,
      },
      tx
    );

    return created;
  });

  revalidatePath("/admin/finance");
  revalidatePath("/admin/dashboard");
  revalidatePath("/resident/transparency");
  return { success: true as const, data: transaction };
}

export async function updateExpenseTransaction(id: string, formData: FormData) {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const existing = await prisma.expenseTransaction.findUnique({ where: { id } });
  if (!existing) return { success: false as const, message: "Data pengeluaran tidak ditemukan." };

  const parsed = expenseSchema.safeParse({
    date: formData.get("date"),
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    isPublic: formData.get("isPublic") === "true",
  });
  if (!parsed.success) {
    return { success: false as const, message: "Data pengeluaran tidak valid." };
  }
  const data = parsed.data;

  let receiptUrl = existing.receiptUrl;
  const receiptFile = formData.get("receipt");
  if (receiptFile instanceof File && receiptFile.size > 0) {
    try {
      const stored = await saveUploadedFile(receiptFile, "expense-receipts");
      receiptUrl = stored.fileUrl;
    } catch (err) {
      if (err instanceof FileValidationError) {
        return { success: false as const, message: err.message };
      }
      throw err;
    }
  }

  const updated = await prisma.expenseTransaction.update({
    where: { id },
    data: {
      date: data.date,
      category: data.category,
      description: data.description,
      amount: data.amount,
      receiptUrl,
      isPublic: data.isPublic,
    },
  });

  await recordAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    module: "EXPENSE",
    recordId: id,
    oldValue: existing,
    newValue: updated,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/finance");
  revalidatePath("/resident/transparency");
  return { success: true as const, data: updated };
}

export async function deleteExpenseTransaction(id: string) {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const existing = await prisma.expenseTransaction.findUnique({ where: { id } });
  if (!existing) return { success: false as const, message: "Data pengeluaran tidak ditemukan." };

  await prisma.expenseTransaction.delete({ where: { id } });

  await recordAuditLog({
    userId: session.user.id,
    action: "DELETE",
    module: "EXPENSE",
    recordId: id,
    oldValue: existing,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/finance");
  revalidatePath("/admin/dashboard");
  revalidatePath("/resident/transparency");
  return { success: true as const };
}

// ── Financial report (spec §50: Opening/Income/Expense/Closing) ────
export async function getFinanceSummary(periodMonth: number, periodYear: number) {
  await requireAdmin();

  const periodStart = new Date(periodYear, periodMonth - 1, 1);
  const periodEnd = new Date(periodYear, periodMonth, 1); // exclusive upper bound

  const [openingIncome, openingExpense, periodIncome, periodExpense] = await prisma.$transaction([
    prisma.incomeTransaction.aggregate({ where: { date: { lt: periodStart } }, _sum: { amount: true } }),
    prisma.expenseTransaction.aggregate({ where: { date: { lt: periodStart } }, _sum: { amount: true } }),
    prisma.incomeTransaction.aggregate({
      where: { date: { gte: periodStart, lt: periodEnd } },
      _sum: { amount: true },
    }),
    prisma.expenseTransaction.aggregate({
      where: { date: { gte: periodStart, lt: periodEnd } },
      _sum: { amount: true },
    }),
  ]);

  const openingBalance = Number(openingIncome._sum.amount ?? 0) - Number(openingExpense._sum.amount ?? 0);
  const income = Number(periodIncome._sum.amount ?? 0);
  const expense = Number(periodExpense._sum.amount ?? 0);
  const closingBalance = openingBalance + income - expense;

  return { openingBalance, income, expense, closingBalance };
}

// ── Resident: public transparency (spec §31 — aggregates only, no
// per-transaction detail that could reveal a specific house/resident,
// and only rows the admin has marked isPublic) ──────────────────────
export async function getPublicTransparency() {
  await requireResident();

  const [incomeAgg, expenseAgg, expenseByCategory] = await prisma.$transaction([
    prisma.incomeTransaction.aggregate({
      where: { isPublic: true },
      _sum: { amount: true },
    }),

    prisma.expenseTransaction.aggregate({
      where: { isPublic: true },
      _sum: { amount: true },
    }),

    prisma.expenseTransaction.groupBy({
      by: ["category"],
      where: { isPublic: true },
      _sum: { amount: true },
      orderBy: {
        category: "asc",
      },
    }),
  ]);

  const totalIncome = Number(incomeAgg._sum.amount ?? 0);
  const totalExpense = Number(expenseAgg._sum.amount ?? 0);

  const byCategory = EXPENSE_CATEGORIES.map((category) => {
    const row = expenseByCategory.find((r) => r.category === category);

    return {
      category,
      amount: Number(row?._sum?.amount ?? 0),
    };
  }).filter((row) => row.amount > 0);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    byCategory,
  };
}