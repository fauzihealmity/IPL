"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireResident } from "@/lib/permissions";
import { recordAuditLog } from "@/lib/services/audit.service";
import { getRequestContext } from "@/lib/utils/request-context";
import { saveUploadedFile, FileValidationError } from "@/lib/services/file-upload.service";
import { createNotification, notifyAdmins } from "@/lib/services/notification.service";
import { complaintSchema, complaintUpdateSchema } from "@/lib/validation/complaint.schema";
import type { ComplaintInput, ComplaintUpdateInput } from "@/lib/validation/complaint.schema";
import { ComplaintStatus, type Prisma } from "@prisma/client";

// ── Resident: submit + view own complaints ─────────────────────────
export async function createComplaint(input: ComplaintInput) {
  const session = await requireResident();
  const data = complaintSchema.parse(input);
  const { ipAddress, userAgent } = await getRequestContext();

  const resident = await prisma.resident.findUnique({ where: { id: session.user.residentId } });
  if (!resident) {
    return { success: false as const, message: "Data warga tidak ditemukan." };
  }

  const complaint = await prisma.$transaction(async (tx) => {
    const created = await tx.complaint.create({
      data: {
        residentId: resident.id,
        houseId: resident.houseId,
        title: data.title,
        description: data.description,
        category: data.category,
        location: data.location || null,
        priority: data.priority ?? null,
        status: ComplaintStatus.NEW,
      },
    });

    await notifyAdmins(
      {
        title: "Pengaduan Baru",
        message: `Pengaduan baru "${data.title}" dari ${resident.fullName}.`,
        type: "GENERAL",
      },
      tx
    );

    await recordAuditLog(
      {
        userId: session.user.id,
        action: "CREATE",
        module: "COMPLAINT",
        recordId: created.id,
        newValue: created,
        ipAddress,
        userAgent,
      },
      tx
    );

    return created;
  });

  revalidatePath("/resident/complaints");
  revalidatePath("/admin/complaints");
  return { success: true as const, data: complaint };
}

export async function listMyComplaints(params: { page?: number; pageSize?: number }) {
  const session = await requireResident();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));

  const where: Prisma.ComplaintWhereInput = { residentId: session.user.residentId };

  const [items, totalItems] = await prisma.$transaction([
    prisma.complaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.complaint.count({ where }),
  ]);

  return { items, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), page, pageSize };
}

export async function getMyComplaintDetail(id: string) {
  const session = await requireResident();
  // Ownership check — never fetch by ID alone (spec §39).
  return prisma.complaint.findFirst({
    where: { id, residentId: session.user.residentId },
    include: { updates: { orderBy: { createdAt: "asc" } }, house: { include: { block: true } } },
  });
}

// ── Admin: manage all complaints ────────────────────────────────────
export interface ListComplaintsParams {
  status?: ComplaintStatus;
  page?: number;
  pageSize?: number;
}

export async function listComplaints(params: ListComplaintsParams) {
  await requireAdmin();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));

  const where: Prisma.ComplaintWhereInput = params.status ? { status: params.status } : {};

  const [items, totalItems] = await prisma.$transaction([
    prisma.complaint.findMany({
      where,
      include: { resident: true, house: { include: { block: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.complaint.count({ where }),
  ]);

  return { items, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), page, pageSize };
}

export async function getComplaintDetail(id: string) {
  await requireAdmin();
  return prisma.complaint.findUnique({
    where: { id },
    include: {
      resident: true,
      house: { include: { block: true } },
      updates: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function addComplaintUpdate(complaintId: string, formData: FormData) {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const parsed = complaintUpdateSchema.safeParse({
    status: formData.get("status"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { success: false as const, message: "Data update tidak valid." };
  }
  const data: ComplaintUpdateInput = parsed.data;

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { resident: true },
  });
  if (!complaint) {
    return { success: false as const, message: "Pengaduan tidak ditemukan." };
  }

  let photoUrl: string | null = null;
  const photoFile = formData.get("photo");
  if (photoFile instanceof File && photoFile.size > 0) {
    try {
      const stored = await saveUploadedFile(photoFile, "complaint-photos");
      photoUrl = stored.fileUrl;
    } catch (err) {
      if (err instanceof FileValidationError) {
        return { success: false as const, message: err.message };
      }
      throw err;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.complaintUpdate.create({
      data: {
        complaintId,
        status: data.status,
        message: data.message,
        photoUrl,
      },
    });

    await tx.complaint.update({ where: { id: complaintId }, data: { status: data.status } });

    if (complaint.resident.userId) {
      await createNotification(
        {
          userId: complaint.resident.userId,
          title: "Update Pengaduan",
          message: `Pengaduan "${complaint.title}" diperbarui: ${data.message}`,
          type: "COMPLAINT_UPDATE",
        },
        tx
      );
    }

    await recordAuditLog(
      {
        userId: session.user.id,
        action: "UPDATE",
        module: "COMPLAINT",
        recordId: complaintId,
        oldValue: { status: complaint.status },
        newValue: { status: data.status, message: data.message },
        ipAddress,
        userAgent,
      },
      tx
    );
  });

  revalidatePath(`/admin/complaints/${complaintId}`);
  revalidatePath("/admin/complaints");
  revalidatePath("/resident/complaints");
  revalidatePath("/admin/dashboard");
  return { success: true as const };
}
