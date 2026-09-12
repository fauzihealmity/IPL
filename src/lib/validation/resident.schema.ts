import { z } from "zod";

export const residentSchema = z
  .object({
    fullName: z.string().trim().min(1, "Nama lengkap wajib diisi").max(150),
    houseId: z.string().uuid("Rumah wajib dipilih"),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s]{6,20}$/, "Format nomor telepon tidak valid")
      .optional()
      .or(z.literal("")),
    email: z.string().trim().email("Format email tidak valid").optional().or(z.literal("")),
    joinedAt: z.coerce.date().optional().nullable(),
    // Whether to also create a login account for this resident.
    createLoginAccount: z.boolean().default(false),
    loginPassword: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => !data.createLoginAccount || (data.loginPassword && data.loginPassword.length >= 8),
    {
      message: "Password minimal 8 karakter wajib diisi jika membuat akun login",
      path: ["loginPassword"],
    }
  )
  .refine((data) => !data.createLoginAccount || !!data.email, {
    message: "Email wajib diisi jika membuat akun login",
    path: ["email"],
  });

export type ResidentInput = z.infer<typeof residentSchema>;

export const residentImportRowSchema = z.object({
  fullName: z.string().trim().min(1, "Nama lengkap wajib diisi"),
  blockName: z.string().trim().min(1, "Nama blok wajib diisi"),
  houseNumber: z.string().trim().min(1, "Nomor rumah wajib diisi"),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
});

export type ResidentImportRow = z.infer<typeof residentImportRowSchema>;
