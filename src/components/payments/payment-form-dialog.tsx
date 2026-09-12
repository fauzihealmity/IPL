"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitPayment } from "@/actions/payment.actions";
import { PaymentMethod } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Loader2 } from "lucide-react";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Transfer Bank",
  QRIS: "QRIS",
  VIRTUAL_ACCOUNT: "Virtual Account",
  CASH: "Tunai",
  OTHER: "Lainnya",
};

// Phase 4 activates Manual Bank Transfer + Upload Bukti only (spec
// §26) — QRIS/VA are modeled in the schema for a future payment
// gateway but aren't wired to a real provider yet, so they're not
// offered here to avoid promising something that isn't real.
const AVAILABLE_METHODS: PaymentMethod[] = [PaymentMethod.BANK_TRANSFER, PaymentMethod.CASH];

interface PaymentFormDialogProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number | string;
    periodMonth: number;
    periodYear: number;
  };
}

export function PaymentFormDialog({ invoice }: PaymentFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("invoiceId", invoice.id);
    formData.set("amount", String(invoice.totalAmount));

    startTransition(async () => {
      const result = await submitPayment(formData);
      if (result.success) {
        toast.success("Bukti pembayaran berhasil dikirim. Menunggu verifikasi admin.");
        setOpen(false);
        formRef.current?.reset();
        router.refresh();
      } else {
        toast.error(result.message ?? "Gagal mengirim pembayaran.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CreditCard className="h-4 w-4" />
          Bayar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bayar Tagihan {invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            Periode {invoice.periodMonth}/{invoice.periodYear} — Total{" "}
            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
              Number(invoice.totalAmount)
            )}
            . Pembayaran harus sesuai dengan total tagihan (tidak menerima pembayaran sebagian).
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
          <div className="space-y-2">
            <Label htmlFor="method">Metode Pembayaran</Label>
            <Select name="method" defaultValue={PaymentMethod.BANK_TRANSFER}>
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAt">Tanggal Bayar</Label>
            <Input
              id="paidAt"
              name="paidAt"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proof">Bukti Pembayaran (JPG/PNG/PDF, maks 5MB)</Label>
            <input
              id="proof"
              name="proof"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              required
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (opsional)</Label>
            <Input id="notes" name="notes" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Kirim Bukti Pembayaran
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
