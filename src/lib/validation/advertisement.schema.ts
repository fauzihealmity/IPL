import { z } from "zod";

export const advertisementSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Judul wajib diisi.")
      .max(200, "Judul maksimal 200 karakter."),

    description: z
      .string()
      .trim()
      .max(1000, "Deskripsi maksimal 1000 karakter.")
      .nullable()
      .optional(),

    targetUrl: z
      .string()
      .trim()
      .url("URL tujuan tidak valid.")
      .max(500, "URL maksimal 500 karakter.")
      .nullable()
      .optional(),

    isActive: z.boolean(),

    startAt: z.date().nullable().optional(),

    endAt: z.date().nullable().optional(),

    sortOrder: z
      .number()
      .int()
      .min(0, "Urutan tidak boleh negatif.")
      .max(9999, "Urutan terlalu besar."),
  })
  .refine(
    (data) =>
      !data.startAt ||
      !data.endAt ||
      data.endAt >= data.startAt,
    {
      message: "Tanggal berakhir harus setelah atau sama dengan tanggal mulai.",
      path: ["endAt"],
    }
  );

export type AdvertisementInput = z.infer<typeof advertisementSchema>;