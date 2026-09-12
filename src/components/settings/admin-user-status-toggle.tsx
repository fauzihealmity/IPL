"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setAdminUserStatus } from "@/actions/settings.actions";
import { Badge } from "@/components/shared/badge";
import { Loader2 } from "lucide-react";

export function AdminUserStatusToggle({
  userId,
  status,
  disabled,
}: {
  userId: string;
  status: "ACTIVE" | "INACTIVE";
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (disabled) return;
    const next = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      const result = await setAdminUserStatus(userId, next);
      if (result.success) {
        toast.success(next === "ACTIVE" ? "Akun diaktifkan." : "Akun dinonaktifkan.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Gagal mengubah status akun.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isPending}
      className="inline-flex disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Badge variant={status === "ACTIVE" ? "success" : "outline"} className="cursor-pointer gap-1">
        {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
        {status === "ACTIVE" ? "Aktif" : "Nonaktif"}
      </Badge>
    </button>
  );
}
