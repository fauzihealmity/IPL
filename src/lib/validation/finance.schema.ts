import { z } from "zod";

// Kategori pengeluaran sesuai spesifikasi §31.
export const EXPENSE_CATEGORIES = [
  "Keamanan",
  "Kebersihan",
  "Sampah",
  "PJU",
  "Taman",
  "Perbaikan",
  "Administrasi",
  "Lainnya",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const expenseSchema = z.object({
  date: z.coerce.date({ required_error: "Tanggal wajib diisi" }),
  category: z.enum(EXPENSE_CATEGORIES, { required_error: "Kategori wajib dipilih" }),
  description: z.string().trim().min(1, "Deskripsi wajib diisi").max(500),
  amount: z.coerce.number().positive("Nominal harus lebih dari 0"),
  isPublic: z.coerce.boolean().default(true),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const visibilitySchema = z.object({
  isPublic: z.boolean(),
});
