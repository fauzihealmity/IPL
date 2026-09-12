"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { penaltyConfigSchema, type PenaltyConfigInput } from "@/lib/validation/invoice.schema";
import { updatePenaltyConfig } from "@/actions/invoice.actions";
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
import { Settings2, Loader2 } from "lucide-react";
import type { PenaltyConfig } from "@/lib/services/settings.service";

export function PenaltyConfigDialog({ config }: { config: PenaltyConfig }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PenaltyConfigInput>({
    resolver: zodResolver(penaltyConfigSchema),
    defaultValues: config,
  });

  const penaltyType = watch("penaltyType");

  function onSubmit(values: PenaltyConfigInput) {
    startTransition(async () => {
      const result = await updatePenaltyConfig(values);
      if (result.success) {
        toast.success("Konfigurasi denda berhasil disimpan.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Gagal menyimpan konfigurasi.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4" />
          Konfigurasi Denda
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfigurasi Jatuh Tempo & Denda</DialogTitle>
          <DialogDescription>
            Berlaku untuk tagihan yang diterbitkan setelah perubahan ini. Tagihan lama
            yang sudah dibayar tidak akan berubah.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="dueDateDay">Tanggal Jatuh Tempo (tanggal ke- setiap bulan)</Label>
            <Input id="dueDateDay" type="number" min={1} max={28} {...register("dueDateDay")} />
            {errors.dueDateDay && (
              <p className="text-sm text-destructive">{errors.dueDateDay.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gracePeriodDays">Masa Tenggang (hari)</Label>
            <Input id="gracePeriodDays" type="number" min={0} max={30} {...register("gracePeriodDays")} />
            {errors.gracePeriodDays && (
              <p className="text-sm text-destructive">{errors.gracePeriodDays.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="penaltyType">Jenis Denda</Label>
            <Select
              defaultValue={config.penaltyType}
              onValueChange={(val) => setValue("penaltyType", val as "FIXED" | "PERCENTAGE")}
            >
              <SelectTrigger id="penaltyType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FIXED">Nominal Tetap (Rp)</SelectItem>
                <SelectItem value="PERCENTAGE">Persentase dari IPL (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="penaltyAmount">
              {penaltyType === "PERCENTAGE" ? "Persentase Denda (%)" : "Nominal Denda (Rp)"}
            </Label>
            <Input id="penaltyAmount" type="number" min={0} step="1" {...register("penaltyAmount")} />
            {errors.penaltyAmount && (
              <p className="text-sm text-destructive">{errors.penaltyAmount.message}</p>
            )}
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
