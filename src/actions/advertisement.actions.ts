"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/permissions";
import { recordAuditLog } from "@/lib/services/audit.service";
import { saveUploadedFile } from "@/lib/services/file-upload.service";
import { advertisementSchema } from "@/lib/validation/advertisement.schema";

function parseOptionalDate(
  value: FormDataEntryValue | null
): { value: Date | null; error?: string } {
  if (!value || typeof value !== "string" || !value.trim()) {
    return { value: null };
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return {
      value: null,
      error: "Format tanggal tidak valid.",
    };
  }

  return { value: date };
}

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "true" || value === "on";
}

function parseSortOrder(
  value: FormDataEntryValue | null
): { value: number; error?: string } {
  if (!value || typeof value !== "string" || !value.trim()) {
    return { value: 0 };
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return {
      value: 0,
      error: "Urutan tampil harus berupa angka.",
    };
  }

  return { value: number };
}

function getValidationError(
  input: unknown
): { success: true; data: ReturnType<typeof advertisementSchema.parse> } | {
  success: false;
  error: string;
} {
  const result = advertisementSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      error:
        result.error.issues[0]?.message ??
        "Data iklan tidak valid.",
    };
  }

  if (
    result.data.targetUrl &&
    !/^https?:\/\//i.test(result.data.targetUrl)
  ) {
    return {
      success: false,
      error:
        "URL tujuan harus diawali http:// atau https://.",
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

function parseAdvertisementFormData(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();

  const descriptionValue = String(
    formData.get("description") ?? ""
  ).trim();

  const targetUrlValue = String(
    formData.get("targetUrl") ?? ""
  ).trim();

  const startAt = parseOptionalDate(formData.get("startAt"));

  if (startAt.error) {
    return {
      success: false as const,
      error: startAt.error,
    };
  }

  const endAt = parseOptionalDate(formData.get("endAt"));

  if (endAt.error) {
    return {
      success: false as const,
      error: endAt.error,
    };
  }

  const sortOrder = parseSortOrder(
    formData.get("sortOrder")
  );

  if (sortOrder.error) {
    return {
      success: false as const,
      error: sortOrder.error,
    };
  }

  const validation = getValidationError({
    title,
    description: descriptionValue || null,
    targetUrl: targetUrlValue || null,
    isActive: parseBoolean(formData.get("isActive")),
    startAt: startAt.value,
    endAt: endAt.value,
    sortOrder: sortOrder.value,
  });

  if (!validation.success) {
    return validation;
  }

  return {
    success: true as const,
    data: validation.data,
  };
}

export async function listAdvertisements({
  page = 1,
  pageSize = 10,
}: {
  page?: number;
  pageSize?: number;
} = {}) {
  await requireSuperAdmin();

  const safePage = Math.max(1, page);
  const safePageSize = Math.max(
    1,
    Math.min(pageSize, 100)
  );

  const skip = (safePage - 1) * safePageSize;

  const [items, totalItems] = await Promise.all([
    prisma.advertisement.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
      skip,
      take: safePageSize,
    }),
    prisma.advertisement.count(),
  ]);

  return {
    items,
    totalItems,
    totalPages: Math.ceil(totalItems / safePageSize),
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function createAdvertisement(
  formData: FormData
) {
  const session = await requireSuperAdmin();

  const parsed = parseAdvertisementFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const {
    title,
    description,
    targetUrl,
    isActive,
    startAt,
    endAt,
    sortOrder,
  } = parsed.data;

  const imageFile = formData.get("image");

  let imageUrl: string | null = null;

  if (
    imageFile instanceof File &&
    imageFile.size > 0
  ) {
    const storedFile = await saveUploadedFile(
      imageFile,
      "advertisements"
    );

    imageUrl = storedFile.fileUrl;
  }

  const advertisement =
    await prisma.advertisement.create({
      data: {
        title,
        description,
        targetUrl,
        imageUrl,
        isActive,
        startAt,
        endAt,
        sortOrder,
      },
    });

  await recordAuditLog({
    userId: session.user.id,
    action: "CREATE",
    module: "ADVERTISEMENT",
    recordId: advertisement.id,
    newValue: {
      title: advertisement.title,
      isActive: advertisement.isActive,
      sortOrder: advertisement.sortOrder,
    },
  });

  revalidatePath("/admin/advertisements");
  revalidatePath("/resident/dashboard");

  return {
    success: true,
    advertisement,
  };
}

export async function updateAdvertisement(
  id: string,
  formData: FormData
) {
  const session = await requireSuperAdmin();

  const existing =
    await prisma.advertisement.findUnique({
      where: { id },
    });

  if (!existing) {
    return {
      success: false,
      error: "Iklan tidak ditemukan.",
    };
  }

  const parsed = parseAdvertisementFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const {
    title,
    description,
    targetUrl,
    isActive,
    startAt,
    endAt,
    sortOrder,
  } = parsed.data;

  let imageUrl = existing.imageUrl;

  const imageFile = formData.get("image");

  if (
    imageFile instanceof File &&
    imageFile.size > 0
  ) {
    const storedFile = await saveUploadedFile(
      imageFile,
      "advertisements"
    );

    imageUrl = storedFile.fileUrl;
  }

  const advertisement =
    await prisma.advertisement.update({
      where: { id },
      data: {
        title,
        description,
        targetUrl,
        imageUrl,
        isActive,
        startAt,
        endAt,
        sortOrder,
      },
    });

  await recordAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    module: "ADVERTISEMENT",
    recordId: advertisement.id,
    oldValue: {
      title: existing.title,
      isActive: existing.isActive,
      sortOrder: existing.sortOrder,
    },
    newValue: {
      title: advertisement.title,
      isActive: advertisement.isActive,
      sortOrder: advertisement.sortOrder,
    },
  });

  revalidatePath("/admin/advertisements");
  revalidatePath("/resident/dashboard");

  return {
    success: true,
    advertisement,
  };
}

export async function deleteAdvertisement(
  id: string
) {
  const session = await requireSuperAdmin();

  const existing =
    await prisma.advertisement.findUnique({
      where: { id },
    });

  if (!existing) {
    return {
      success: false,
      message: "Iklan tidak ditemukan.",
    };
  }

  await prisma.advertisement.delete({
    where: { id },
  });

  await recordAuditLog({
    userId: session.user.id,
    action: "DELETE",
    module: "ADVERTISEMENT",
    recordId: id,
    oldValue: {
      title: existing.title,
      isActive: existing.isActive,
      sortOrder: existing.sortOrder,
    },
  });

  revalidatePath("/admin/advertisements");
  revalidatePath("/resident/dashboard");

  return {
    success: true,
    message: "Iklan berhasil dihapus.",
  };
}