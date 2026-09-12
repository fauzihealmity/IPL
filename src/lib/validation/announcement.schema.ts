import { z } from "zod";
import { UserRole } from "@prisma/client";

export const announcementSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(200),
  content: z.string().trim().min(1, "Isi pengumuman wajib diisi").max(5000),
  publishAt: z.coerce.date({ required_error: "Tanggal publikasi wajib diisi" }),
  expiresAt: z.coerce.date().nullable().optional(),
  // null/undefined = shown to everyone; RESIDENT restricts to residents only.
  targetAudience: z.nativeEnum(UserRole).nullable().optional(),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;
