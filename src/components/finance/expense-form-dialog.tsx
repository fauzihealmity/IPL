"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createExpenseTransaction, updateExpenseTransaction } from "@/actions/finance.actions";
import { EXPENSE_CATEGORIES } from "@/lib/validation/finance.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Pencil, Loader2 } from "lucide-react";

interface ExpenseFormDialogProps {
  expense?: {
    id: string;
    date: Date;
    category: string;
    description: string;
    amount: number | string;
    isPublic: boolean;
  };
}

export function ExpenseFormDialog({ expense }: ExpenseFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!expense;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = isEdit
        ? await updateExpenseTransaction(expense!.id, formData)
        : await createExpenseTransaction(formData);

      if (result.success) {
        toast.success(isEdit ? "Pengeluaran berhasil diperbarui." : "Pengeluaran berhasil dicatat.");
        setOpen(false);
        formRef.current?.reset();
        router.refresh();
      } else {
        toast.error(result.message ?? "Gagal menyimpan data pengeluaran.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Catat Pengeluaran
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Pengeluaran" : "Catat Pengeluaran"}</DialogTitle>
          <DialogDescription>
            Data akan langsung memengaruhi saldo dan laporan keuangan.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-4"
          encType="multipart/form-data"
          noValidate
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Tanggal</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={
                  expense ? expense.date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select name="category" defaultValue={expense?.category ?? EXPENSE_CATEGORIES[0]}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Input id="description" name="description" defaultValue={expense?.description} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Nominal (Rp)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="1"
              min="0"
              defaultValue={expense ? Number(expense.amount) : undefined}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt">Bukti/Nota (opsional, JPG/PNG/PDF, maks 5MB)</Label>
            <input
              id="receipt"
              name="receipt"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isPublic"
              value="true"
              defaultChecked={expense?.isPublic ?? true}
              className="h-4 w-4"
            />
            Tampilkan di halaman transparansi warga (agregat kategori saja, tanpa detail)
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
