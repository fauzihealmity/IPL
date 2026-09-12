"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { runDueDateReminders } from "@/actions/notification.actions";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

export function SendRemindersButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await runDueDateReminders();
      if (result.success) {
        toast.success(`${result.data.sentCount} pengingat berhasil dikirim.`);
        router.refresh();
      } else {
        toast.error("Gagal mengirim pengingat.");
      }
    });
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      Kirim Pengingat Jatuh Tempo
    </Button>
  );
}
