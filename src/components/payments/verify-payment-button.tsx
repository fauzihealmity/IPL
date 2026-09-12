"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { verifyPayment } from "@/actions/payment.actions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

export function VerifyPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await verifyPayment(paymentId);
      if (result.success) {
        toast.success("Pembayaran diverifikasi. Kwitansi telah diterbitkan.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Gagal memverifikasi pembayaran.");
      }
    });
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      Verifikasi
    </Button>
  );
}
