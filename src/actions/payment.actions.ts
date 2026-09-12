"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireResident } from "@/lib/permissions";
import { recordAuditLog } from "@/lib/services/audit.service";
import { getRequestContext } from "@/lib/utils/request-context";
import { nextDocumentNumber } from "@/lib/services/document-number.service";
import { saveUploadedFile, FileValidationError } from "@/lib/services/file-upload.service";
import { generateReceiptPdf } from "@/lib/services/receipt.service";
import { createNotification, notifyAdmins } from "@/lib/services/notification.service";
import { submitPaymentSchema, rejectPaymentSchema } from "@/lib/validation/payment.schema";
import { InvoiceStatus, PaymentStatus, Prisma } from "@prisma/client";

// ── Resident: submit payment ──────────────────────────────────────
export async function submitPayment(formData: FormData) {
  const session = await requireResident();

  const parsed = submitPaymentSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    method: formData.get("method"),
    amount: formData.get("amount"),
    paidAt: formData.get("paidAt"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { success: false as const, message: "Data pembayaran tidak valid." };
  }
  const data = parsed.data;

  const proofFile = formData.get("proof");
  if (!(proofFile instanceof File) || proofFile.size === 0) {
    return { success: false as const, message: "Bukti pembayaran wajib diupload." };
  }

  // Ownership check — never trust an invoiceId without verifying it
  // belongs to the logged-in resident (spec §39).
  const invoice = await prisma.invoice.findFirst({
    where: { id: data.invoiceId, residentId: session.user.residentId },
    include: { house: { include: { block: true } } },
  });
  if (!invoice) {
    return { success: false as const, message: "Tagihan tidak ditemukan." };
  }
  if (invoice.status === InvoiceStatus.PAID) {
    return { success: false as const, message: "Tagihan ini sudah lunas." };
  }
  if (invoice.status === InvoiceStatus.CANCELLED) {
    return { success: false as const, message: "Tagihan ini sudah dibatalkan." };
  }
  if (invoice.status === InvoiceStatus.PENDING_VERIFICATION) {
    return {
      success: false as const,
      message: "Pembayaran untuk tagihan ini sedang menunggu verifikasi admin.",
    };
  }

  // Spec §25: no partial payment in this version — amount must equal
  // the invoice total exactly.
  if (Number(data.amount) !== Number(invoice.totalAmount)) {
    return {
      success: false as const,
      message: `Nominal pembayaran harus sama dengan total tagihan (${invoice.totalAmount}).`,
    };
  }

  let storedFile;
  try {
    storedFile = await saveUploadedFile(proofFile, "payment-proofs");
  } catch (err) {
    if (err instanceof FileValidationError) {
      return { success: false as const, message: err.message };
    }
    throw err;
  }

  const { ipAddress, userAgent } = await getRequestContext();

  const payment = await prisma.$transaction(async (tx) => {
    const paymentNumber = await nextDocumentNumber("PAY", new Date(), tx);

    const created = await tx.payment.create({
      data: {
        paymentNumber,
        invoiceId: invoice.id,
        residentId: session.user.residentId,
        amount: data.amount,
        method: data.method,
        paidAt: data.paidAt,
        notes: data.notes || null,
        status: PaymentStatus.PENDING,
        proof: {
          create: storedFile,
        },
      },
    });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.PENDING_VERIFICATION },
    });

    await notifyAdmins(
      {
        title: "Pembayaran Baru Menunggu Verifikasi",
        message: `${invoice.house.block.name}-${invoice.house.houseNumber} mengirim bukti pembayaran untuk tagihan ${invoice.invoiceNumber}.`,
        type: "PAYMENT_SUBMITTED",
      },
      tx
    );

    await recordAuditLog(
      {
        userId: session.user.id,
        action: "CREATE",
        module: "PAYMENT",
        recordId: created.id,
        newValue: created,
        ipAddress,
        userAgent,
      },
      tx
    );

    return created;
  });

  revalidatePath("/resident/invoices");
  revalidatePath("/resident/payments");
  revalidatePath("/admin/payments");
  return { success: true as const, data: payment };
}

// ── Admin: list / detail ──────────────────────────────────────────
export interface ListPaymentsParams {
  status?: PaymentStatus;
  page?: number;
  pageSize?: number;
}

export async function listPayments(params: ListPaymentsParams) {
  await requireAdmin();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));

  const where: Prisma.PaymentWhereInput = params.status ? { status: params.status } : {};

  const [items, totalItems] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      include: {
        invoice: { include: { house: { include: { block: true } } } },
        resident: true,
        proof: true,
        receipt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return { items, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), page, pageSize };
}

export async function getPaymentDetail(id: string) {
  await requireAdmin();
  return prisma.payment.findUnique({
    where: { id },
    include: {
      invoice: { include: { house: { include: { block: true } } } },
      resident: true,
      proof: true,
    },
  });
}

// ── Admin: verify payment (spec §25 — the critical transaction) ───
export async function verifyPayment(id: string) {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const payment = await prisma.payment.findUnique({
    where: { id },
      include: {
        invoice: {
          include: {
            house: {
              include: {
                block: true,
              },
            },
          },
        },
        resident: true,
      },
  });

  if (!payment) {
    return { success: false as const, message: "Pembayaran tidak ditemukan." };
  }

  if (payment.status !== PaymentStatus.PENDING) {
    return { success: false as const, message: "Pembayaran ini sudah diproses sebelumnya." };
  }

  // Re-check amount == invoice total at verification time too (defense
  // in depth — spec §25), not just at submission time.
  if (Number(payment.amount) !== Number(payment.invoice.totalAmount)) {
    return {
      success: false as const,
      message: "Nominal pembayaran tidak sesuai dengan total tagihan. Tolak pembayaran ini.",
    };
  }

  const now = new Date();

  // Everything below is one transaction: verify payment → update
  // invoice → create income transaction → create receipt →
  // notification. If any step fails, all of it rolls back (spec §25,
  // §45) — nothing is marked PAID without the matching income entry
  // and receipt record existing too.
  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.VERIFIED,
        verifiedAt: now,
        verifiedBy: session.user.id,
      },
    });

    const updatedInvoice = await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: InvoiceStatus.PAID, paidAt: now },
    });

    const incomeNumber = await nextDocumentNumber("INC", now, tx);
    await tx.incomeTransaction.create({
      data: {
        transactionNumber: incomeNumber,
        date: now,
        category: "IPL",
        description: `Pembayaran IPL ${payment.invoice.house.block.name}-${payment.invoice.house.houseNumber} periode ${payment.invoice.periodMonth}/${payment.invoice.periodYear}`,
        amount: payment.amount,
        referenceId: payment.invoiceId,
      },
    });

    const receiptNumber = await nextDocumentNumber("KWT", now, tx);
    const receipt = await tx.receipt.create({
      data: {
        receiptNumber,
        paymentId: payment.id,
        invoiceId: payment.invoiceId,
        issuedAt: now,
        // pdfUrl filled in just after the transaction commits (file
        // I/O doesn't belong inside a DB transaction) — see below.
        pdfUrl: null,
      },
    });

    if (payment.resident?.userId) {
      await createNotification(
        {
          userId: payment.resident.userId,
          title: "Pembayaran Terverifikasi",
          message: `Pembayaran untuk tagihan ${payment.invoice.invoiceNumber} telah diverifikasi. Kwitansi ${receiptNumber} telah diterbitkan.`,
          type: "PAYMENT_VERIFIED",
        },
        tx
      );
    }

    await recordAuditLog(
      {
        userId: session.user.id,
        action: "VERIFY",
        module: "PAYMENT",
        recordId: payment.id,
        oldValue: payment,
        newValue: updatedPayment,
        ipAddress,
        userAgent,
      },
      tx
    );

    return { updatedPayment, updatedInvoice, receipt };
  });

  // Generate the actual PDF file after the transaction has committed.
  // If this step fails, the verification itself has already
  // succeeded and is not rolled back — the receipt DB row exists with
  // pdfUrl null and can be regenerated; this keeps the money-critical
  // transaction from depending on filesystem I/O.
  try {
    const pdfPath = await generateReceiptPdf({
      receiptNumber: result.receipt.receiptNumber,
      invoiceNumber: payment.invoice.invoiceNumber,
      houseLabel: `${payment.invoice.house.block.name}-${payment.invoice.house.houseNumber}`,
      residentName: payment.resident?.fullName ?? "-",
      periodMonth: payment.invoice.periodMonth,
      periodYear: payment.invoice.periodYear,
      iplAmount: Number(payment.invoice.iplAmount),
      additionalFee: Number(payment.invoice.additionalFee),
      penalty: Number(payment.invoice.penalty),
      discount: Number(payment.invoice.discount),
      totalAmount: Number(payment.invoice.totalAmount),
      paymentMethod: payment.method,
      paidAt: payment.paidAt,
      issuedAt: now,
    });
    await prisma.receipt.update({ where: { id: result.receipt.id }, data: { pdfUrl: pdfPath } });
  } catch (err) {
    console.error("[RECEIPT_PDF_GENERATION_FAILED]", err);

    return {
      success: false as const,
      message:
        err instanceof Error
          ? `Pembayaran terverifikasi, tetapi PDF kwitansi gagal dibuat: ${err.message}`
          : "Pembayaran terverifikasi, tetapi PDF kwitansi gagal dibuat.",
    };
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/dashboard");
  revalidatePath("/resident/invoices");
  revalidatePath("/resident/receipts");
  return { success: true as const };
}

// ── Admin: reject payment ─────────────────────────────────────────
export async function rejectPayment(id: string, input: { reason: string }) {
  const session = await requireAdmin();
  const data = rejectPaymentSchema.parse(input);
  const { ipAddress, userAgent } = await getRequestContext();

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { 
      invoice: true,
      resident: true, 
    },
  });
  if (!payment) {
    return { success: false as const, message: "Pembayaran tidak ditemukan." };
  }
  if (payment.status !== PaymentStatus.PENDING) {
    return { success: false as const, message: "Pembayaran ini sudah diproses sebelumnya." };
  }

  const now = new Date();
  // Revert the invoice back to its pre-submission state: still
  // unpaid, and OVERDUE if it's already past due.
  const revertedStatus =
    payment.invoice.dueDate < now ? InvoiceStatus.OVERDUE : InvoiceStatus.UNPAID;

  await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id },
      data: { status: PaymentStatus.REJECTED, notes: data.reason, verifiedBy: session.user.id, verifiedAt: now },
    });

    await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: revertedStatus },
    });

    if (payment.resident?.userId) {
      await createNotification(
        {
          userId: payment.resident.userId,
          title: "Pembayaran Ditolak",
          message: `Bukti pembayaran Anda ditolak: ${data.reason}. Silakan ajukan pembayaran ulang.`,
          type: "PAYMENT_REJECTED",
        },
        tx
      );
    }

    await recordAuditLog(
      {
        userId: session.user.id,
        action: "REJECT",
        module: "PAYMENT",
        recordId: id,
        oldValue: payment,
        newValue: updated,
        ipAddress,
        userAgent,
      },
      tx
    );
  });

  revalidatePath("/admin/payments");
  revalidatePath("/admin/invoices");
  revalidatePath("/resident/invoices");
  return { success: true as const };
}

// ── Resident: own payments/receipts ───────────────────────────────
export async function listMyPayments(params: { page?: number; pageSize?: number }) {
  const session = await requireResident();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));

  const where: Prisma.PaymentWhereInput = { residentId: session.user.residentId };

  const [items, totalItems] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      include: { invoice: true, receipt: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return { items, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), page, pageSize };
}

export async function listMyReceipts(params: { page?: number; pageSize?: number }) {
  const session = await requireResident();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));

  const where: Prisma.ReceiptWhereInput = { payment: { residentId: session.user.residentId } };

  const [items, totalItems] = await prisma.$transaction([
    prisma.receipt.findMany({
      where,
      include: { invoice: { include: { house: { include: { block: true } } } }, payment: true },
      orderBy: { issuedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.receipt.count({ where }),
  ]);

  return { items, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), page, pageSize };
}

/** Only the invoices a resident may currently pay against. */
export async function listMyPayableInvoices() {
  const session = await requireResident();
  return prisma.invoice.findMany({
    where: {
      residentId: session.user.residentId,
      status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE] },
    },
    orderBy: { dueDate: "asc" },
  });
}
// ── Admin: regenerate receipt PDF ────────────────────────────────
export async function regenerateReceiptPdf(receiptId: string) {
  await requireAdmin();

  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: {
      invoice: {
        include: {
          house: {
            include: {
              block: true,
            },
          },
        },
      },
      payment: {
        include: {
          resident: true,
        },
      },
    },
  });

  if (!receipt) {
    return {
      success: false as const,
      message: "Kwitansi tidak ditemukan.",
    };
  }

  if (receipt.payment.status !== PaymentStatus.VERIFIED) {
    return {
      success: false as const,
      message:
        "Kwitansi hanya dapat dibuat untuk pembayaran yang sudah diverifikasi.",
    };
  }

  try {
    const pdfPath = await generateReceiptPdf({
      receiptNumber: receipt.receiptNumber,
      invoiceNumber: receipt.invoice.invoiceNumber,
      houseLabel: `${receipt.invoice.house.block.name}-${receipt.invoice.house.houseNumber}`,
      residentName: receipt.payment.resident?.fullName ?? "-",
      periodMonth: receipt.invoice.periodMonth,
      periodYear: receipt.invoice.periodYear,
      iplAmount: Number(receipt.invoice.iplAmount),
      additionalFee: Number(receipt.invoice.additionalFee),
      penalty: Number(receipt.invoice.penalty),
      discount: Number(receipt.invoice.discount),
      totalAmount: Number(receipt.invoice.totalAmount),
      paymentMethod: receipt.payment.method,
      paidAt: receipt.payment.paidAt,
      issuedAt: receipt.issuedAt,
    });

    await prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        pdfUrl: pdfPath,
      },
    });

    revalidatePath("/admin/payments");
    revalidatePath("/resident/receipts");

    return {
      success: true as const,
      message: `PDF kwitansi ${receipt.receiptNumber} berhasil dibuat.`,
      pdfUrl: pdfPath,
    };
  } catch (err) {
    console.error("[REGENERATE_RECEIPT_PDF_FAILED]", err);

    return {
      success: false as const,
      message:
        err instanceof Error
          ? `Gagal membuat PDF kwitansi: ${err.message}`
          : "Gagal membuat PDF kwitansi.",
    };
  }
}

