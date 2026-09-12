"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addComplaintUpdate } from "@/actions/complaint.actions";
import { ComplaintStatus } from "@prisma/client";
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
import { MessageSquarePlus, Loader2 } from "lucide-react";

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  NEW: "Baru",
  IN_PROGRESS: "Diproses",
  FOLLOW_UP: "Tindak Lanjut",
  RESOLVED: "Selesai",
  REJECTED: "Ditolak",
};

export function ComplaintUpdateDialog({
  complaintId,
  currentStatus,
}: {
  complaintId: string;
  currentStatus: ComplaintStatus;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await addComplaintUpdate(complaintId, formData);
      if (result.success) {
        toast.success("Update pengaduan berhasil dikirim.");
        setOpen(false);
        formRef.current?.reset();
        router.refresh();
      } else {
        toast.error(result.message ?? "Gagal mengirim update.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <MessageSquarePlus className="h-4 w-4" />
          Update Status
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Pengaduan</DialogTitle>
          <DialogDescription>Warga akan menerima notifikasi atas update ini.</DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-4"
          encType="multipart/form-data"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="status">Status Baru</Label>
            <Select name="status" defaultValue={currentStatus}>
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
            <Label htmlFor="message">Pesan</Label>
            <textarea
              id="message"
              name="message"
              rows={3}
              required
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Jelaskan tindak lanjut yang dilakukan..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo">Foto (opsional)</Label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Kirim Update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
