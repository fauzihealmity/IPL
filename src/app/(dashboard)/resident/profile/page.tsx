import { notFound } from "next/navigation";
import { getMyProfile } from "@/actions/profile.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileUpdateForm } from "@/components/profile/profile-update-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";

export default async function ResidentProfilePage() {
  const resident = await getMyProfile();
  if (!resident) notFound();

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-sm text-muted-foreground">
          {resident.fullName} · Rumah {resident.house.block.name}-{resident.house.houseNumber}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Kontak</CardTitle>
          <CardDescription>
            Nama dan rumah hanya dapat diubah oleh admin. Login: {resident.user?.email ?? "belum ada akun login"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileUpdateForm phone={resident.phone} email={resident.email} />
        </CardContent>
      </Card>

      {resident.user && (
        <Card>
          <CardHeader>
            <CardTitle>Ubah Password</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
