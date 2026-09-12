"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { recordAuditLog } from "@/lib/services/audit.service";
import { getRequestContext } from "@/lib/utils/request-context";
import {
  houseSchema,
  houseImportRowSchema,
  type HouseInput,
  type HouseImportRow,
} from "@/lib/validation/house.schema";
import { Prisma } from "@prisma/client";

export interface ListParams {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
}

const SORTABLE_FIELDS = ["houseNumber", "status", "createdAt"] as const;

export async function listHouses(params: ListParams) {
  await requireAdmin();

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));
  const sort = SORTABLE_FIELDS.includes(params.sort as (typeof SORTABLE_FIELDS)[number])
    ? (params.sort as (typeof SORTABLE_FIELDS)[number])
    : "createdAt";
  const order = params.order === "asc" ? "asc" : "desc";

  const where: Prisma.HouseWhereInput = params.q
    ? {
        OR: [
          { houseNumber: { contains: params.q, mode: "insensitive" } },
          { block: { name: { contains: params.q, mode: "insensitive" } } },
        ],
      }
    : {};

  const [items, totalItems] = await prisma.$transaction([
    prisma.house.findMany({
      where,
      include: { block: true, _count: { select: { residents: true } } },
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.house.count({ where }),
  ]);

  return {
    items,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    page,
    pageSize,
  };
}

export async function createHouse(input: HouseInput) {
  const session = await requireAdmin();
  const data = houseSchema.parse(input);
  const { ipAddress, userAgent } = await getRequestContext();

  const duplicate = await prisma.house.findUnique({
    where: { blockId_houseNumber: { blockId: data.blockId, houseNumber: data.houseNumber } },
  });
  if (duplicate) {
    return { success: false as const, message: "Nomor rumah sudah terdaftar di blok ini." };
  }

  const house = await prisma.house.create({
    data: {
      houseNumber: data.houseNumber,
      blockId: data.blockId,
      propertyType: data.propertyType || null,
      landArea: data.landArea ?? null,
      buildingArea: data.buildingArea ?? null,
      status: data.status,
    },
  });

  await recordAuditLog({
    userId: session.user.id,
    action: "CREATE",
    module: "HOUSE",
    recordId: house.id,
    newValue: house,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/houses");
  return { success: true as const, data: house };
}

export async function updateHouse(id: string, input: HouseInput) {
  const session = await requireAdmin();
  const data = houseSchema.parse(input);
  const { ipAddress, userAgent } = await getRequestContext();

  const existingHouse = await prisma.house.findUnique({ where: { id } });
  if (!existingHouse) {
    return { success: false as const, message: "Rumah tidak ditemukan." };
  }

  const duplicate = await prisma.house.findFirst({
    where: {
      blockId: data.blockId,
      houseNumber: data.houseNumber,
      NOT: { id },
    },
  });
  if (duplicate) {
    return { success: false as const, message: "Nomor rumah sudah terdaftar di blok ini." };
  }

  const updated = await prisma.house.update({
    where: { id },
    data: {
      houseNumber: data.houseNumber,
      blockId: data.blockId,
      propertyType: data.propertyType || null,
      landArea: data.landArea ?? null,
      buildingArea: data.buildingArea ?? null,
      status: data.status,
    },
  });

  await recordAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    module: "HOUSE",
    recordId: id,
    oldValue: existingHouse,
    newValue: updated,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/houses");
  return { success: true as const, data: updated };
}

export async function deleteHouse(id: string) {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const house = await prisma.house.findUnique({
    where: { id },
    include: { residents: true, invoices: true },
  });
  if (!house) {
    return { success: false as const, message: "Rumah tidak ditemukan." };
  }
  if (house.residents.length > 0) {
    return {
      success: false as const,
      message: "Rumah tidak dapat dihapus karena masih memiliki data warga.",
    };
  }
  if (house.invoices.length > 0) {
    return {
      success: false as const,
      message: "Rumah tidak dapat dihapus karena memiliki riwayat tagihan.",
    };
  }

  await prisma.house.delete({ where: { id } });

  await recordAuditLog({
    userId: session.user.id,
    action: "DELETE",
    module: "HOUSE",
    recordId: id,
    oldValue: house,
    ipAddress,
    userAgent,
  });

  revalidatePath("/admin/houses");
  return { success: true as const };
}

// ── Excel import (spec §35): upload → parse → validate → preview →
// confirm → transaction. `commit=false` returns a dry-run preview
// with per-row errors; `commit=true` actually writes inside a
// transaction and rolls back entirely on any fatal error. ──────────
export async function importHouses(rows: HouseImportRow[], commit: boolean) {
  const session = await requireAdmin();
  const { ipAddress, userAgent } = await getRequestContext();

  const blocks = await prisma.block.findMany();
  const blockByName = new Map(blocks.map((b) => [b.name.toLowerCase(), b]));

  const results = rows.map((row, index) => {
    const parsed = houseImportRowSchema.safeParse(row);
    if (!parsed.success) {
      return {
        rowNumber: index + 2, // +2: header row + 1-indexed
        ok: false as const,
        errors: parsed.error.flatten().fieldErrors,
      };
    }
    const block = blockByName.get(parsed.data.blockName.toLowerCase());
    if (!block) {
      return {
        rowNumber: index + 2,
        ok: false as const,
        errors: { blockName: [`Blok "${parsed.data.blockName}" tidak ditemukan`] },
      };
    }
    return { rowNumber: index + 2, ok: true as const, data: parsed.data, blockId: block.id };
  });

  const validRows = results.filter((r) => r.ok) as Array<
    Extract<(typeof results)[number], { ok: true }>
  >;
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
    const createdHouses = [];
    for (const row of validRows) {
      const existing = await tx.house.findUnique({
        where: {
          blockId_houseNumber: { blockId: row.blockId, houseNumber: row.data.houseNumber },
        },
      });
      if (existing) continue; // idempotent: skip duplicates rather than failing whole batch
      const house = await tx.house.create({
        data: {
          blockId: row.blockId,
          houseNumber: row.data.houseNumber,
          propertyType: row.data.propertyType || null,
          landArea: row.data.landArea ?? null,
          buildingArea: row.data.buildingArea ?? null,
          status: row.data.status,
        },
      });
      createdHouses.push(house);
    }

    await recordAuditLog(
      {
        userId: session.user.id,
        action: "IMPORT",
        module: "HOUSE",
        newValue: { count: createdHouses.length },
        ipAddress,
        userAgent,
      },
      tx
    );

    return createdHouses;
  });

  revalidatePath("/admin/houses");
  return { preview: false as const, success: true as const, count: created.length };
}
