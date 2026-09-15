import { notFound } from "next/navigation";
import { getMyProfile } from "@/actions/profile.actions";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileUpdateForm } from "@/components/profile/profile-update-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import {
  Home,
  LockKeyhole,
  Mail,
  UserRound,
  UserRoundCog,
} from "lucide-react";

export default async function ResidentProfilePage() {
  const resident = await getMyProfile();

  if (!resident) notFound();

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-primary">Portal Warga</p>

        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Profil
            </h1>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Kelola informasi kontak dan keamanan akun Anda.
            </p>
          </div>
        </div>
      </div>

      {/* Resident Identity */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="border-b bg-muted/20 px-5 py-4 md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserRoundCog className="h-4 w-4" />
            </div>

            <div>
              <h2 className="font-semibold">
                Informasi Warga
              </h2>

              <p className="text-xs leading-5 text-muted-foreground">
                Informasi identitas dan rumah Anda.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-5 md:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserRound className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Nama Lengkap
                  </p>

                  <p className="mt-1 truncate font-semibold">
                    {resident.fullName}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Home className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Rumah
                  </p>

                  <p className="mt-1 font-semibold">
                    {resident.house.block.name}-
                    {resident.house.houseNumber}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border/60 bg-muted/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Mail className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  Akun Login
                </p>

                <p className="mt-1 break-all text-sm font-medium">
                  {resident.user?.email ?? "Belum ada akun login"}
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Nama dan rumah hanya dapat diubah oleh admin.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="border-b bg-muted/20 px-5 py-4 md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </div>

            <div>
              <h2 className="font-semibold">
                Informasi Kontak
              </h2>

              <p className="text-xs leading-5 text-muted-foreground">
                Perbarui informasi kontak yang dapat digunakan
                pengurus untuk menghubungi Anda.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-5 md:p-6">
          <ProfileUpdateForm
            phone={resident.phone}
            email={resident.email}
          />
        </CardContent>
      </Card>

      {/* Password */}
      {resident.user && (
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <div className="border-b bg-muted/20 px-5 py-4 md:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LockKeyhole className="h-4 w-4" />
              </div>

              <div>
                <h2 className="font-semibold">
                  Keamanan Akun
                </h2>

                <p className="text-xs leading-5 text-muted-foreground">
                  Ubah password untuk menjaga keamanan akun Anda.
                </p>
              </div>
            </div>
          </div>

          <CardContent className="p-5 md:p-6">
            <ChangePasswordForm />
          </CardContent>
        </Card>
      )}
    </div>
  );
}