import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

/**
 * Honest placeholder for a module not yet implemented.
 * Per project principle: never ship a page that looks functional but
 * isn't wired to real data/actions. This screen makes the current
 * status explicit instead of showing a fake table or dead buttons.
 */
export function PhasePlaceholder({
  title,
  phase,
}: {
  title: string;
  phase: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
            <Construction className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Modul ini belum dibangun.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Fitur <span className="font-medium text-foreground">{title}</span> akan
          diimplementasikan pada <span className="font-medium text-foreground">{phase}</span>{" "}
          sesuai roadmap pengembangan. Halaman ini sengaja tidak menampilkan data
          atau tombol palsu sampai fitur benar-benar terhubung ke database.
        </p>
      </CardContent>
    </Card>
  );
}
