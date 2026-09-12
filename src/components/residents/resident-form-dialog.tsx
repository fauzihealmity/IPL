"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { residentSchema, type ResidentInput } from "@/lib/validation/resident.schema";
import { createResident, updateResident } from "@/actions/resident.actions";
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

interface ResidentFormDialogProps {
  houses: { id: string; houseNumber: string; block: { name: string } }[];
  resident?: {
    id: string;
    fullName: string;
    houseId: string;
    phone: string | null;
    email: string | null;
    hasLoginAccount: boolean;
  };
}

export function ResidentFormDialog({ houses, resident }: ResidentFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!resident;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ResidentInput>({
    resolver: zodResolver(residentSchema),
    defaultValues: resident
      ? {
          fullName: resident.fullName,
          houseId: resident.houseId,
          phone: resident.phone ?? "",
          email: resident.email ?? "",
          createLoginAccount: false,
        }
      : { createLoginAccount: false },
  });

  const createLoginAccount = watch("createLoginAccount");

  function onSubmit(values: ResidentInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateResident(resident!.id, values)
        : await createResident(values);

      if (result.success) {
        toast.success(isEdit ? "Data warga berhasil diperbarui." : "Warga berhasil ditambahkan.");
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast.error(result.message ?? "Gagal menyimpan data warga.");
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
            Tambah Warga
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Warga" : "Tambah Warga"}</DialogTitle>
          <DialogDescription>Data warga akan tersimpan langsung ke database.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="fullName">Nama Lengkap</Label>
            <Input id="fullName" {...register("fullName")} />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="houseId">Rumah</Label>
            <Select
              defaultValue={resident?.houseId}
              onValueChange={(val) => setValue("houseId", val, { shouldValidate: true })}
            >
              <SelectTrigger id="houseId">
                <SelectValue placeholder="Pilih rumah" />
              </SelectTrigger>
              <SelectContent>
                {houses.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.block.name}-{h.houseNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.houseId && <p className="text-sm text-destructive">{errors.houseId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">No. Telepon</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-3 rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" {...register("createLoginAccount")} className="h-4 w-4" />
                Buat akun login untuk warga ini
              </label>
              {createLoginAccount && (
                <div className="space-y-2">
                  <Label htmlFor="loginPassword">Password Awal</Label>
                  <Input id="loginPassword" type="password" {...register("loginPassword")} />
                  {errors.loginPassword && (
                    <p className="text-sm text-destructive">{errors.loginPassword.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Email di atas akan menjadi username login. Warga sebaiknya mengganti password
                    setelah login pertama.
                  </p>
                </div>
              )}
            </div>
          )}

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
