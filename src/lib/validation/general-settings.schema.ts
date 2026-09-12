import { z } from "zod";

export const generalSettingsSchema = z.object({
  residenceName: z.string().trim().min(1, "Nama perumahan wajib diisi").max(200),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Format email tidak valid").max(200).optional().or(z.literal("")),
});
export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
