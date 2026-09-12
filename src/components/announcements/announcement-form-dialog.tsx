"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createAnnouncement, updateAnnouncement } from "@/actions/announcement.actions";
import { UserRole } from "@prisma/client";
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

interface AnnouncementFormDialogProps {
  announcement?: {
    id: string;
    title: string;
    content: string;
    publishAt: Date;
    expiresAt: Date | null;
    targetAudience: UserRole | null;
  };
}

export function AnnouncementFormDialog({ announcement }: AnnouncementFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!announcement;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = isEdit
        ? await updateAnnouncement(announcement!.id, formData)
        : await createAnnouncement(formData);

      if (result.success) {
        toast.success(isEdit ? "Pengumuman berhasil diperbarui." : "Pengumuman berhasil dipublikasikan.");
        setOpen(false);
        formRef.current?.reset();
        router.refresh();
      } else {
        toast.error(result.message ?? "Gagal menyimpan pengumuman.");
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
            Buat Pengumuman
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Pengumuman" : "Buat Pengumuman"}</DialogTitle>
          <DialogDescription>Pengumuman akan tampil ke warga sesuai target audiens.</DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-4"
          encType="multipart/form-data"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="title">Judul</Label>
            <Input id="title" name="title" defaultValue={announcement?.title} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Isi Pengumuman</Label>
            <textarea
              id="content"
              name="content"
              rows={4}
              required
              defaultValue={announcement?.content}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="publishAt">Tanggal Publikasi</Label>
              <Input
                id="publishAt"
                name="publishAt"
                type="date"
                required
                defaultValue={
                  announcement ? announcement.publishAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Berakhir (opsional)</Label>
              <Input
                id="expiresAt"
                name="expiresAt"
                type="date"
                defaultValue={announcement?.expiresAt ? announcement.expiresAt.toISOString().slice(0, 10) : undefined}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audiens</Label>
            <Select name="targetAudience" defaultValue={announcement?.targetAudience ?? "ALL"}>
              <SelectTrigger id="targetAudience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                <SelectItem value={UserRole.RESIDENT}>Warga Saja</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Gambar (opsional)</Label>
            <input
              id="image"
              name="image"
              type="file"
              accept=".jpg,.jpeg,.png"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachment">Lampiran (opsional, PDF)</Label>
            <input
              id="attachment"
              name="attachment"
              type="file"
              accept=".pdf"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
            />
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
