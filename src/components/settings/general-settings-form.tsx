"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { generalSettingsSchema, type GeneralSettingsInput } from "@/lib/validation/general-settings.schema";
import { updateGeneralSettings } from "@/actions/settings.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function GeneralSettingsForm({
  settings,
  readOnly,
}: {
  settings: { residenceName: string; address: string; phone: string; email: string };
  readOnly: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GeneralSettingsInput>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: settings,
  });

  function onSubmit(values: GeneralSettingsInput) {
    startTransition(async () => {
      const result = await updateGeneralSettings(values);
      if (result.success) {
        toast.success("Informasi perumahan berhasil disimpan.");
        router.refresh();
      } else {
        toast.error("Gagal menyimpan pengaturan.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="residenceName">Nama Perumahan</Label>
        <Input id="residenceName" disabled={readOnly} {...register("residenceName")} />
        {errors.residenceName && (
          <p className="text-sm text-destructive">{errors.residenceName.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Alamat</Label>
        <Input id="address" disabled={readOnly} {...register("address")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telepon</Label>
          <Input id="phone" disabled={readOnly} {...register("phone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" disabled={readOnly} {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
      </div>
      {readOnly ? (
        <p className="text-xs text-muted-foreground">
          Hanya Super Admin yang dapat mengubah informasi ini.
        </p>
      ) : (
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan
        </Button>
      )}
    </form>
  );
}
