import { z } from "zod";
import { HouseStatus } from "@prisma/client";

export const houseSchema = z.object({
  houseNumber: z
    .string()
    .trim()
    .min(1, "Nomor rumah wajib diisi")
    .max(20, "Nomor rumah maksimal 20 karakter"),
  blockId: z.string().uuid("Blok wajib dipilih"),
  propertyType: z.string().trim().max(100).optional().or(z.literal("")),
  landArea: z.coerce.number().positive("Luas tanah harus lebih dari 0").optional().nullable(),
  buildingArea: z.coerce.number().positive("Luas bangunan harus lebih dari 0").optional().nullable(),
  status: z.nativeEnum(HouseStatus),
});

export type HouseInput = z.infer<typeof houseSchema>;

export const houseImportRowSchema = z.object({
  blockName: z.string().trim().min(1, "Nama blok wajib diisi"),
  houseNumber: z.string().trim().min(1, "Nomor rumah wajib diisi"),
  propertyType: z.string().trim().optional(),
  landArea: z.coerce.number().positive().optional(),
  buildingArea: z.coerce.number().positive().optional(),
  status: z.nativeEnum(HouseStatus).optional().default(HouseStatus.OWNER_OCCUPIED),
});

export type HouseImportRow = z.infer<typeof houseImportRowSchema>;
