"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { runApplyOverduePenalties } from "@/actions/invoice.actions";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

export function ApplyPenaltiesButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await runApplyOverduePenalties();
      if (result.success) {
        toast.success(`${result.data.updatedCount} tagihan diperbarui menjadi TERLAMBAT dengan denda.`);
        router.refresh();
      } else {
        toast.error("Gagal memproses denda.");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
      Cek & Terapkan Denda
    </Button>
  );
}
