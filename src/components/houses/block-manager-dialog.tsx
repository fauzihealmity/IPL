"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBlock } from "@/actions/block.actions";
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
import { Settings2, Loader2 } from "lucide-react";

export function BlockManagerDialog({ blocks }: { blocks: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createBlock({ name: name.trim() });
      if (result.success) {
        toast.success(`Blok "${name}" berhasil ditambahkan.`);
        setName("");
        router.refresh();
      } else {
        toast.error(result.message ?? "Gagal menambah blok.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4" />
          Kelola Blok
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kelola Blok</DialogTitle>
          <DialogDescription>
            Blok digunakan untuk mengelompokkan rumah dan tarif IPL.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="blockName">Tambah Blok Baru</Label>
          <div className="flex gap-2">
            <Input
              id="blockName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. B"
            />
            <Button onClick={handleAdd} disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Tambah
            </Button>
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto rounded-md border">
          {blocks.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Belum ada blok.</p>
          ) : (
            <ul className="divide-y">
              {blocks.map((b) => (
                <li key={b.id} className="px-3 py-2 text-sm">
                  Blok {b.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
