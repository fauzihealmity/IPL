import { z } from "zod";

export const blockSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama blok wajib diisi")
    .max(20, "Nama blok maksimal 20 karakter"),
});

export type BlockInput = z.infer<typeof blockSchema>;
