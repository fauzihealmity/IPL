import { z } from "zod";

export const iplRateSchema = z
  .object({
    blockId: z.string().uuid("Blok wajib dipilih"),
    name: z.string().trim().min(1, "Nama tarif wajib diisi").max(150),
    amount: z.coerce.number().positive("Nominal harus lebih dari 0"),
    effectiveFrom: z.coerce.date({ required_error: "Tanggal mulai berlaku wajib diisi" }),
    effectiveTo: z.coerce.date().optional().nullable(),
  })
  .refine(
    (data) => !data.effectiveTo || data.effectiveTo > data.effectiveFrom,
    {
      message: "Tanggal berakhir harus setelah tanggal mulai berlaku",
      path: ["effectiveTo"],
    }
  );

export type IplRateInput = z.infer<typeof iplRateSchema>;

export const iplRateImportRowSchema = z.object({
  blockName: z.string().trim().min(1, "Nama blok wajib diisi"),
  name: z.string().trim().min(1, "Nama tarif wajib diisi"),
  amount: z.coerce.number().positive("Nominal harus lebih dari 0"),
  effectiveFrom: z.coerce.date({ required_error: "Tanggal mulai berlaku wajib diisi" }),
});

export type IplRateImportRow = z.infer<typeof iplRateImportRowSchema>;
