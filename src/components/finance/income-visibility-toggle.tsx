"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setIncomeVisibility } from "@/actions/finance.actions";
import { Badge } from "@/components/shared/badge";
import { Eye, EyeOff } from "lucide-react";

export function IncomeVisibilityToggle({ id, isPublic }: { id: string; isPublic: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await setIncomeVisibility(id, !isPublic);
      if (result.success) {
        toast.success(!isPublic ? "Ditampilkan di transparansi." : "Disembunyikan dari transparansi.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Gagal mengubah visibilitas.");
      }
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className="inline-flex">
      <Badge variant={isPublic ? "success" : "outline"} className="cursor-pointer gap-1">
        {isPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        {isPublic ? "Publik" : "Privat"}
      </Badge>
    </button>
  );
}
