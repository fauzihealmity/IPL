"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { houseSchema, type HouseInput } from "@/lib/validation/house.schema";
import { createHouse, updateHouse } from "@/actions/house.actions";
import { HouseStatus } from "@prisma/client";
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

const STATUS_LABELS: Record<HouseStatus, string> = {
  OWNER_OCCUPIED: "Dihuni Pemilik",
  RENTED: "Disewakan",
  VACANT: "Kosong",
  UNSOLD: "Belum Terjual",
};

interface HouseFormDialogProps {
  blocks: { id: string; name: string }[];
  house?: {
    id: string;
    houseNumber: string;
    blockId: string;
    propertyType: string | null;
    landArea: number | string | null;
    buildingArea: number | string | null;
    status: HouseStatus;
  };
}

export function HouseFormDialog({ blocks, house }: HouseFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!house;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<HouseInput>({
    resolver: zodResolver(houseSchema),
    defaultValues: house
      ? {
          houseNumber: house.houseNumber,
          blockId: house.blockId,
          propertyType: house.propertyType ?? "",
          landArea: house.landArea ? Number(house.landArea) : undefined,
          buildingArea: house.buildingArea ? Number(house.buildingArea) : undefined,
          status: house.status,
        }
      : { status: HouseStatus.OWNER_OCCUPIED },
  });

  function onSubmit(values: HouseInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateHouse(house!.id, values)
        : await createHouse(values);

      if (result.success) {
        toast.success(isEdit ? "Rumah berhasil diperbarui." : "Rumah berhasil ditambahkan.");
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast.error(result.message ?? "Gagal menyimpan data rumah.");
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
            Tambah Rumah
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Rumah" : "Tambah Rumah"}</DialogTitle>
          <DialogDescription>
            Data unit rumah akan tersimpan langsung ke database.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="blockId">Blok</Label>
              <Select
                defaultValue={house?.blockId}
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
              <Label htmlFor="houseNumber">Nomor Rumah</Label>
              <Input id="houseNumber" {...register("houseNumber")} />
              {errors.houseNumber && (
                <p className="text-sm text-destructive">{errors.houseNumber.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              defaultValue={house?.status ?? HouseStatus.OWNER_OCCUPIED}
              onValueChange={(val) => setValue("status", val as HouseStatus, { shouldValidate: true })}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="propertyType">Tipe Properti</Label>
            <Input id="propertyType" placeholder="mis. 36/72" {...register("propertyType")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="landArea">Luas Tanah (m²)</Label>
              <Input id="landArea" type="number" step="0.01" {...register("landArea")} />
              {errors.landArea && <p className="text-sm text-destructive">{errors.landArea.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="buildingArea">Luas Bangunan (m²)</Label>
              <Input id="buildingArea" type="number" step="0.01" {...register("buildingArea")} />
              {errors.buildingArea && (
                <p className="text-sm text-destructive">{errors.buildingArea.message}</p>
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
