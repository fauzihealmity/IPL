import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const submitPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  method: z.nativeEnum(PaymentMethod),
  amount: z.coerce.number().positive("Nominal harus lebih dari 0"),
  paidAt: z.coerce.date({ required_error: "Tanggal bayar wajib diisi" }),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;

export const rejectPaymentSchema = z.object({
  reason: z.string().trim().min(1, "Alasan penolakan wajib diisi").max(500),
});
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
