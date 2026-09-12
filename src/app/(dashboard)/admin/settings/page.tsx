import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGeneralSettingsAction, listAdminUsers } from "@/actions/settings.actions";
import { getPenaltyConfig } from "@/lib/services/settings.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/shared/badge";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { AdminUserStatusToggle } from "@/components/settings/admin-user-status-toggle";
import { PenaltyConfigDialog } from "@/components/invoices/penalty-config-dialog";
import { UserRole } from "@prisma/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user.role === UserRole.SUPER_ADMIN;

  const [generalSettings, penaltyConfig] = await Promise.all([
    getGeneralSettingsAction(),
    getPenaltyConfig(),
  ]);
  const adminUsers = isSuperAdmin ? await listAdminUsers() : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Konfigurasi identitas perumahan, tarif keterlambatan, dan akun pengurus.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Perumahan</CardTitle>
          <CardDescription>
            Digunakan sebagai kop pada invoice, kwitansi, dan laporan PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GeneralSettingsForm settings={generalSettings} readOnly={!isSuperAdmin} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jatuh Tempo &amp; Denda</CardTitle>
          <CardDescription>
            Berlaku untuk tagihan yang diterbitkan setelah perubahan — tagihan lama yang
            sudah dibayar tidak berubah.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="grid flex-1 grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Jatuh Tempo</p>
              <p className="font-medium">Tanggal {penaltyConfig.dueDateDay}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Masa Tenggang</p>
              <p className="font-medium">{penaltyConfig.gracePeriodDays} hari</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Jenis Denda</p>
              <p className="font-medium">{penaltyConfig.penaltyType === "FIXED" ? "Nominal Tetap" : "Persentase"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Besaran</p>
              <p className="font-medium">
                {penaltyConfig.penaltyType === "FIXED"
                  ? formatRupiah(penaltyConfig.penaltyAmount)
                  : `${penaltyConfig.penaltyAmount}%`}
              </p>
            </div>
          </div>
          <PenaltyConfigDialog config={penaltyConfig} />
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Akun Pengurus</CardTitle>
            <CardDescription>Aktifkan/nonaktifkan akun Admin dan Super Admin.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {adminUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.email} · {u.role === UserRole.SUPER_ADMIN ? "Super Admin" : "Admin"} · Bergabung{" "}
                      {format(u.createdAt, "d MMM yyyy", { locale: id })}
                    </p>
                  </div>
                  <AdminUserStatusToggle
                    userId={u.id}
                    status={u.status}
                    disabled={u.id === session?.user.id}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
