"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export interface ListAuditLogParams {
  page?: number;
  pageSize?: number;
  module?: string;
  action?: string;
  q?: string; // matches recordId or actor name/email
}

export async function listAuditLogs(params: ListAuditLogParams) {
  await requireAdmin();

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20));

  const where: Prisma.AuditLogWhereInput = {
    ...(params.module ? { module: params.module } : {}),
    ...(params.action ? { action: params.action } : {}),
    ...(params.q
      ? {
          OR: [
            { recordId: { contains: params.q, mode: "insensitive" as const } },
            { user: { name: { contains: params.q, mode: "insensitive" as const } } },
            { user: { email: { contains: params.q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [items, totalItems, modules, actions] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      distinct: ["module"],
      select: { module: true },
      orderBy: { module: "asc" },
    }),
    prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
  ]);

  return {
    items,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    page,
    pageSize,
    availableModules: modules.map((m) => m.module),
    availableActions: actions.map((a) => a.action),
  };
}
