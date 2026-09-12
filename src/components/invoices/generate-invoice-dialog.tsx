"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { generateInvoices } from "@/actions/invoice.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilePlus2, Loader2 } from "lucide-react";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function GenerateInvoiceDialog() {
  const router = useRouter();
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [isPending, startTransition] = useTransition();
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  function handleGenerate() {
    setResultMessage(null);
    startTransition(async () => {
      const result = await generateInvoices({ periodMonth: month, periodYear: year });
      if (result.success) {
        const { createdCount, skippedExisting, skippedNoRate } = result.data;
        setResultMessage(
          `${createdCount} tagihan baru dibuat. ${skippedExisting} rumah sudah punya tagihan periode ini.` +
            (skippedNoRate.length > 0
              ? ` ${skippedNoRate.length} rumah dilewati karena bloknya belum punya tarif IPL aktif: ${skippedNoRate.join(", ")}.`
              : "")
        );
        toast.success(`${createdCount} tagihan berhasil diterbitkan.`);
        router.refresh();
      } else {
        toast.error("Gagal menerbitkan tagihan.");
      }
    });
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setResultMessage(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <FilePlus2 className="h-4 w-4" />
          Generate Tagihan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Tagihan IPL</DialogTitle>
          <DialogDescription>
            Sistem akan menerbitkan tagihan UNPAID untuk setiap rumah aktif yang belum
            punya tagihan pada periode ini, menggunakan tarif IPL aktif per blok.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Bulan</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tahun</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {resultMessage && (
          <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
            {resultMessage}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Tutup
          </Button>
          <Button onClick={handleGenerate} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
