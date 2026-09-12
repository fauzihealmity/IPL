"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "bg-background border text-foreground",
          success: "!text-emerald-700",
          error: "!text-destructive",
        },
      }}
    />
  );
}
