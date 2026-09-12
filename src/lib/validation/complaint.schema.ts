import { z } from "zod";
import { ComplaintStatus } from "@prisma/client";

export const COMPLAINT_CATEGORIES = [
  "Keamanan",
  "Kebersihan",
  "Fasilitas Umum",
  "Kebisingan",
  "Parkir",
  "Lainnya",
] as const;

export const complaintSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(200),
  description: z.string().trim().min(1, "Deskripsi wajib diisi").max(2000),
  category: z.enum(COMPLAINT_CATEGORIES, { required_error: "Kategori wajib dipilih" }),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});
export type ComplaintInput = z.infer<typeof complaintSchema>;

export const complaintUpdateSchema = z.object({
  status: z.nativeEnum(ComplaintStatus),
  message: z.string().trim().min(1, "Pesan update wajib diisi").max(1000),
});
export type ComplaintUpdateInput = z.infer<typeof complaintUpdateSchema>;
