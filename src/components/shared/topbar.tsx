"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/shared/notification-bell";
import { LogOut } from "lucide-react";

export function Topbar({
  userName,
  roleLabel,
}: {
  userName: string;
  roleLabel: string;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="text-sm text-muted-foreground">
        Mutiara Cahaya Residence — {roleLabel}
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <span className="mx-2 text-sm font-medium">{userName}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </Button>
      </div>
    </header>
  );
}
