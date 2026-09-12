"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { importHouses } from "@/actions/house.actions";
import type { HouseImportRow } from "@/lib/validation/house.schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";

type PreviewResult = Awaited<ReturnType<typeof importHouses>>;

export function HouseImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<HouseImportRow[] | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetState() {
    setRows(null);
    setPreview(null);
  }

  async function handleFile(file: File) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      toast.error("File tidak memiliki sheet yang bisa dibaca.");
      return;
    }
    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) {
      toast.error("File tidak memiliki sheet yang bisa dibaca.");
      return;
    }
    const parsedRows = XLSX.utils.sheet_to_json<HouseImportRow>(sheet, { defval: "" });
    setRows(parsedRows);

    startTransition(async () => {
      const result = await importHouses(parsedRows, false);
      setPreview(result);
    });
  }

  function handleConfirm() {
    if (!rows) return;
    startTransition(async () => {
      const result = await importHouses(rows, true);
      setPreview(result);
      if ("success" in result && result.success) {
        toast.success(`${result.count} rumah berhasil diimpor.`);
        setOpen(false);
        resetState();
        router.refresh();
      } else {
        toast.error("message" in result ? result.message : "Import gagal.");
      }
    });
  }

  const previewResults = preview && "results" in preview ? preview.results : undefined;
  const invalidCount = previewResults?.filter((r) => !r.ok).length ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Data Rumah</DialogTitle>
          <DialogDescription>
            Kolom yang dibutuhkan: <code>blockName</code>, <code>houseNumber</code>,
            <code> propertyType</code>, <code>landArea</code>, <code>buildingArea</code>,{" "}
            <code>status</code>.
          </DialogDescription>
        </DialogHeader>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
        />

        {isPending && !preview && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memvalidasi data...
          </p>
        )}

        {previewResults && (
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3 text-sm">
            <p className="font-medium">
              {preview && "validCount" in preview
                ? `${preview.validCount} valid, ${invalidCount} bermasalah dari ${previewResults.length} baris.`
                : preview && "message" in preview
                  ? preview.message
                  : ""}
            </p>
            {previewResults.map((r) => (
              <div key={r.rowNumber} className="flex items-start gap-2">
                {r.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                )}
                <span>
                  Baris {r.rowNumber}:{" "}
                  {r.ok ? "valid" : Object.values(r.errors).flat().join(", ")}
                </span>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Batal
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || !preview || invalidCount > 0 || !rows?.length}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Konfirmasi Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
