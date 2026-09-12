"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertOctagon } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log full detail server-side/console only — never render the
    // stack trace to the user (spec §41).
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <html lang="id">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <AlertOctagon className="h-12 w-12 text-destructive" />
          <h1 className="text-xl font-bold">Terjadi kesalahan</h1>
          <p className="text-sm text-muted-foreground">
            Maaf, terjadi kesalahan pada sistem. Silakan coba lagi.
          </p>
          <Button onClick={() => reset()}>Coba Lagi</Button>
        </div>
      </body>
    </html>
  );
}
