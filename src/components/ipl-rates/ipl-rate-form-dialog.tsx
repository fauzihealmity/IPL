"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { iplRateSchema, type IplRateInput } from "@/lib/validation/ipl-rate.schema";
import { createIplRate, updateIplRate } from "@/actions/ipl-rate.actions";
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

interface IplRateFormDialogProps {
  blocks: { id: string; name: string }[];
  rate?: {
    id: string;
    blockId: string;
    name: string;
    amount: number | string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
  };
}

export function IplRateFormDialog({ blocks, rate }: IplRateFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!rate;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<IplRateInput>({
    resolver: zodResolver(iplRateSchema),
    defaultValues: rate
      ? {
          blockId: rate.blockId,
          name: rate.name,
          amount: Number(rate.amount),
          effectiveFrom: rate.effectiveFrom,
          effectiveTo: rate.effectiveTo,
        }
      : undefined,
  });

  function onSubmit(values: IplRateInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateIplRate(rate!.id, values)
        : await createIplRate(values);

      if (result.success) {
        toast.success(isEdit ? "Tarif IPL berhasil diperbarui." : "Tarif IPL berhasil ditambahkan.");
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast.error(result.message ?? "Gagal menyimpan tarif IPL.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Tambah Tarif
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Tarif IPL" : "Tambah Tarif IPL"}</DialogTitle>
          <DialogDescription>
            Perubahan tarif tidak memengaruhi invoice yang sudah pernah diterbitkan —
            invoice menyimpan nominal snapshot saat dibuat.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="blockId">Blok</Label>
            <Select
              defaultValue={rate?.blockId}
              onValueChange={(val) => setValue("blockId", val, { shouldValidate: true })}
            >
              <SelectTrigger id="blockId">
                <SelectValue placeholder="Pilih blok" />
              </SelectTrigger>
              <SelectContent>
                {blocks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.blockId && <p className="text-sm text-destructive">{errors.blockId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nama Tarif</Label>
            <Input id="name" placeholder="mis. IPL Reguler" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Nominal (Rp)</Label>
            <Input id="amount" type="number" step="1" {...register("amount")} />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="effectiveFrom">Berlaku Mulai</Label>
              <Input
                id="effectiveFrom"
                type="date"
                defaultValue={rate ? format(rate.effectiveFrom, "yyyy-MM-dd") : undefined}
                {...register("effectiveFrom")}
              />
              {errors.effectiveFrom && (
                <p className="text-sm text-destructive">{errors.effectiveFrom.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectiveTo">Berlaku Sampai (opsional)</Label>
              <Input
                id="effectiveTo"
                type="date"
                defaultValue={rate?.effectiveTo ? format(rate.effectiveTo, "yyyy-MM-dd") : undefined}
                {...register("effectiveTo")}
              />
              {errors.effectiveTo && (
                <p className="text-sm text-destructive">{errors.effectiveTo.message}</p>
              )}
            </div>
          </div>

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
