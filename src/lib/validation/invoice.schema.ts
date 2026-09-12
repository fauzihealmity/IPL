import { z } from "zod";

export const generateInvoicesSchema = z.object({
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodYear: z.coerce.number().int().min(2020).max(2100),
});
export type GenerateInvoicesInput = z.infer<typeof generateInvoicesSchema>;

export const penaltyConfigSchema = z.object({
  dueDateDay: z.coerce.number().int().min(1).max(28),
  gracePeriodDays: z.coerce.number().int().min(0).max(30),
  penaltyType: z.enum(["FIXED", "PERCENTAGE"]),
  penaltyAmount: z.coerce.number().min(0),
});
export type PenaltyConfigInput = z.infer<typeof penaltyConfigSchema>;
