"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { rejectPayment } from "@/actions/payment.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { XCircle, Loader2 } from "lucide-react";

export function RejectPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!reason.trim()) {
      toast.error("Alasan penolakan wajib diisi.");
      return;
    }
    startTransition(async () => {
      const result = await rejectPayment(paymentId, { reason: reason.trim() });
      if (result.success) {
        toast.success("Pembayaran ditolak.");
        setOpen(false);
        setReason("");
        router.refresh();
      } else {
        toast.error(result.message ?? "Gagal menolak pembayaran.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <XCircle className="h-4 w-4 text-destructive" />
          Tolak
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tolak Pembayaran</DialogTitle>
          <DialogDescription>
            Tagihan akan kembali ke status belum lunas dan warga akan menerima notifikasi
            beserta alasan penolakan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason">Alasan Penolakan</Label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="mis. Nominal tidak sesuai / bukti tidak jelas"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Tolak Pembayaran
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
