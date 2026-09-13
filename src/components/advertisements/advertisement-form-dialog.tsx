"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

import {
  createAdvertisement,
  updateAdvertisement,
} from "@/actions/advertisement.actions";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdvertisementData = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  targetUrl: string | null;
  isActive: boolean;
  startAt: Date | null;
  endAt: Date | null;
  sortOrder: number;
};

type Props = {
  advertisement?: AdvertisementData;
};

function formatDateForInput(date: Date | null) {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function AdvertisementFormDialog({ advertisement }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isEdit = Boolean(advertisement);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateAdvertisement(advertisement!.id, formData)
        : await createAdvertisement(formData);

      if (!result.success) {
        toast.error(result.error || "Gagal menyimpan iklan.");
        return;
      }

      toast.success(
        isEdit
          ? "Iklan berhasil diperbarui."
          : "Iklan berhasil dibuat."
      );

      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Iklan
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Iklan" : "Tambah Iklan"}
          </DialogTitle>

          <DialogDescription>
            Atur banner iklan yang akan ditampilkan kepada warga.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={handleSubmit}
          encType="multipart/form-data"
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Judul Iklan *</Label>

            <Input
              id="title"
              name="title"
              required
              maxLength={150}
              defaultValue={advertisement?.title ?? ""}
              placeholder="Contoh: Promo Pembayaran IPL"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>

            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={500}
              defaultValue={advertisement?.description ?? ""}
              placeholder="Deskripsi singkat iklan..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetUrl">URL Tujuan</Label>

            <Input
              id="targetUrl"
              name="targetUrl"
              type="url"
              defaultValue={advertisement?.targetUrl ?? ""}
              placeholder="https://contoh.com"
            />

            <p className="text-xs text-muted-foreground">
              Opsional. Warga akan diarahkan ke URL ini ketika banner
              diklik.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Banner / Gambar</Label>

            <Input
              id="image"
              name="image"
              type="file"
              accept=".jpg,.jpeg,.png"
            />

            <p className="text-xs text-muted-foreground">
              Format JPG, JPEG, atau PNG. Maksimal 5MB.
            </p>
          </div>

          {advertisement?.imageUrl && (
            <div className="rounded-md border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Banner saat ini
              </p>

              <p className="text-xs text-muted-foreground">
                Gambar tersimpan di storage. Upload gambar baru jika
                ingin menggantinya.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startAt">Mulai Tampil</Label>

              <Input
                id="startAt"
                name="startAt"
                type="date"
                defaultValue={formatDateForInput(
                  advertisement?.startAt ?? null
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endAt">Berakhir Tampil</Label>

              <Input
                id="endAt"
                name="endAt"
                type="date"
                defaultValue={formatDateForInput(
                  advertisement?.endAt ?? null
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">Urutan Tampil</Label>

            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              max={9999}
              defaultValue={advertisement?.sortOrder ?? 0}
            />

            <p className="text-xs text-muted-foreground">
              Angka lebih kecil akan ditampilkan lebih dahulu.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-md border p-3">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              value="true"
              defaultChecked={advertisement?.isActive ?? true}
              className="h-4 w-4 rounded border-gray-300"
            />

            <div>
              <Label htmlFor="isActive" className="cursor-pointer">
                Aktif
              </Label>

              <p className="text-xs text-muted-foreground">
                Iklan aktif dan berada dalam periode tampil akan muncul
                di dashboard warga.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>

            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Menyimpan..."
                : isEdit
                  ? "Simpan Perubahan"
                  : "Buat Iklan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}