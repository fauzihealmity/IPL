"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { recordAuditLog } from "@/lib/services/audit.service";
import { getRequestContext } from "@/lib/utils/request-context";
import {
  residentSchema,
  residentImportRowSchema,
  type ResidentInput,
  type ResidentImportRow,
} from "@/lib/validation/resident.schema";
import { UserRole, Prisma } from "@prisma/client";

export interface ListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
}

const SORTABLE_FIELDS = ["fullName", "createdAt"] as const;

export async function listResidents(params: ListParams) {
  await requireAdmin();

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));
  const sort = SORTABLE_FIELDS.includes(params.sort as (typeof SORTABLE_FIELDS)[number])
    ? (params.sort as (typeof SORTABLE_FIELDS)[number])
    : "createdAt";
  const order = params.order === "asc" ? "asc" : "desc";

  const where: Prisma.ResidentWhereInput = params.q
    ? {
        OR: [
          { fullName: { contains: params.q, mode: "insensitive" } },
          { email: { contains: params.q, mode: "insensitive" } },
          { phone: { contains: params.q, mode: "insensitive" } },
          { house: { houseNumber: { contains: params.q, mode: "insensitive" } } },
        ],
      }
    : {};

  const [items, totalItems] = await prisma.$transaction([
    prisma.resident.findMany({
      where,
      include: { house: { include: { block: true } }, user: { select: { id: true, status: true } } },
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.resident.count({ where }),
  ]);

  return {
    items,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    page,
    pageSize,
  };
}

/** For populating the "Rumah" select in the resident form. */
export async function listHousesForSelect() {
  await requireAdmin();
  return prisma.house.findMany({
    // Narrowed to exactly what the resident-form dropdown needs —
    // deliberately excludes Decimal fields (landArea/buildingArea),
    // which can't be passed as props to the "use client" dialog that
    // renders this list (see README's Decimal serialization fix).
    select: {
      id: true,
      houseNumber: true,
      block: { select: { name: true } },
    },
    orderBy: [{ block: { name: "asc" } }, { houseNumber: "asc" }],
  });
}

export async function createResident(input: ResidentInput) {
  const session = await requireAdmin();
  const data = residentSchema.parse(input);
  const { ipAddress, userAgent } = await getRequestContext();

  const house = await prisma.house.findUnique({ where: { id: data.houseId } });
  if (!house) {
    return { success: false as const, message: "Rumah tidak ditemukan." };
  }

  if (data.email) {
    const emailInUse = await prisma.resident.findFirst({ where: { email: data.email } });
    if (emailInUse) {
      return { success: false as const, message: "Email sudah digunakan oleh warga lain." };
    }
  }

  if (data.createLoginAccount && !data.email) {
    return {
      success: false as const,
      message: "Email wajib diisi jika membuat akun login.",
    };
  }

  const resident = await prisma.$transaction(async (tx) => {
    let userId: string | null = null;

    if (data.createLoginAccount) {
  if (!data.email) {
    throw new Error("EMAIL_REQUIRED");
  }

  const existingUser = await tx.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error("EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(data.loginPassword as string, 12);

  const user = await tx.user.create({
    data: {
      name: data.fullName,
      email: data.email,
      passwordHash,
      role: UserRole.RESIDENT,
    },
  });

  userId = user.id;
  }

    const created = await tx.resident.create({
      data: {
        fullName: data.fullName,
        houseId: data.houseId,
        phone: data.phone || null,
        email: data.email || null,
        joinedAt: data.joinedAt ?? null,
        userId,
      },
    });

    await recordAuditLog(
      {
        userId: session.user.id,
        action: "CREATE",
        module: "RESIDENT",
        recordId: created.id,
        // Never write password hashes into the audit log (spec §22).
        newValue: { ...created },
        ipAddress,
        userAgent,
      },
      tx
    );

    return created;
  }).catch((err) => {
    if (err instanceof Error && err.message === "EMAIL_TAKEN") return null;

    if (err instanceof Error && err.message === "EMAIL_REQUIRED") {
      return "EMAIL_REQUIRED";
    }

    throw err;
  });

  if (resident === null) {
    return {
      success: false as const,
      message: "Email sudah digunakan untuk akun lain.",
    };
  }

  if (resident === "EMAIL_REQUIRED") {
    return {
      success: false as const,
      message: "Email wajib diisi jika membuat akun login.",
    };
  }

  revalidatePath("/admin/residents");
  revalidatePath("/admin/houses");
  return { success: true as const, data: resident };
}

export async function updateResident(id: string, input: ResidentInput) {
  const session = await requireAdmin();
  const data = residentSchema.parse(input);
  const { ipAddress, userAgent } = await getRequestContext();

  const existing = await prisma.resident.findUnique({ where: { id } });
  if (!existing) {
    return { success: false as const, message: "Warga tidak ditemukan." };
  }

  const house = await prisma.house.findUnique({ where: { id: data.houseId } });
  if (!house) {
    return { success: false as const, message: "Rumah tidak ditemukan." };
  }

  const updated = await prisma.resident.update({
    where: { id },
    data: {
      fullName: data.fullName,
      houseId: data.houseId,
      phone: data.phone || null,
      email: data.email || null,
      joinedAt: data.joinedAt ?? null,
    },
  });

  await recordAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    module: "RESIDENT",
    recordId: id,
    oldValue: existing,
    newValue: updated,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/residents");
  return { success: true as const, data: updated };
}

export async function deleteResident(id: string) {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const resident = await prisma.resident.findUnique({
    where: { id },
    include: { invoices: true, payments: true, complaints: true },
  });
  if (!resident) {
    return { success: false as const, message: "Warga tidak ditemukan." };
  }
  if (resident.invoices.length > 0 || resident.payments.length > 0) {
    return {
      success: false as const,
      message: "Warga tidak dapat dihapus karena memiliki riwayat tagihan/pembayaran.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.resident.delete({ where: { id } });
    // Deactivate rather than delete the linked login account, if any,
    // to preserve audit-log referential integrity.
    if (resident.userId) {
      await tx.user.update({ where: { id: resident.userId }, data: { status: "INACTIVE" } });
    }
    await recordAuditLog(
      {
        userId: session.user.id,
        action: "DELETE",
        module: "RESIDENT",
        recordId: id,
        oldValue: resident,
        ipAddress,
        userAgent,
      },
      tx
    );
  });

  revalidatePath("/admin/residents");
  return { success: true as const };
}

// ── Excel import (spec §35) ─────────────────────────────────────
export async function importResidents(rows: ResidentImportRow[], commit: boolean) {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const houses = await prisma.house.findMany({ include: { block: true } });
  const houseByKey = new Map(
    houses.map((h) => [`${h.block.name.toLowerCase()}::${h.houseNumber.toLowerCase()}`, h])
  );

  const results = rows.map((row, index) => {
    const parsed = residentImportRowSchema.safeParse(row);
    if (!parsed.success) {
      return { rowNumber: index + 2, ok: false as const, errors: parsed.error.flatten().fieldErrors };
    }
    const key = `${parsed.data.blockName.toLowerCase()}::${parsed.data.houseNumber.toLowerCase()}`;
    const house = houseByKey.get(key);
    if (!house) {
      return {
        rowNumber: index + 2,
        ok: false as const,
        errors: { houseNumber: [`Rumah ${parsed.data.blockName}-${parsed.data.houseNumber} tidak ditemukan`] },
      };
    }
    return { rowNumber: index + 2, ok: true as const, data: parsed.data, houseId: house.id };
  });

  const validRows = results.filter((r) => r.ok) as Array<Extract<(typeof results)[number], { ok: true }>>;
  const invalidRows = results.filter((r) => !r.ok);

  if (!commit) {
    return { preview: true as const, validCount: validRows.length, results };
  }
  if (invalidRows.length > 0) {
    return {
      preview: false as const,
      success: false as const,
      message: "Import dibatalkan karena masih ada baris tidak valid.",
      results,
    };
  }

  const created = await prisma.$transaction(async (tx) => {
    const createdResidents = [];
    for (const row of validRows) {
      const resident = await tx.resident.create({
        data: {
          fullName: row.data.fullName,
          houseId: row.houseId,
          phone: row.data.phone || null,
          email: row.data.email || null,
        },
      });
      createdResidents.push(resident);
    }
    await recordAuditLog(
      {
        userId: session.user.id,
        action: "IMPORT",
        module: "RESIDENT",
        newValue: { count: createdResidents.length },
        ipAddress,
        userAgent,
      },
      tx
    );
    return createdResidents;
  });

  revalidatePath("/admin/residents");
  return { preview: false as const, success: true as const, count: created.length };
}
