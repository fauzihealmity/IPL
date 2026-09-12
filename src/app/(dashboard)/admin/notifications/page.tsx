import { listMyNotifications } from "@/actions/notification.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/shared/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DataPagination } from "@/components/shared/pagination";
import { SendRemindersButton } from "@/components/notifications/send-reminders-button";
import { Bell } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default async function AdminNotificationsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const { items, totalItems, totalPages, page, pageSize } = await listMyNotifications({
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifikasi</h1>
          <p className="text-sm text-muted-foreground">{totalItems} notifikasi untuk akun Anda.</p>
        </div>
        <SendRemindersButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Notifikasi Saya</CardTitle>
          <CardDescription>
            Notifikasi ini bersifat per-akun. Tombol &quot;Kirim Pengingat&quot; di atas memicu
            pengiriman pengingat jatuh tempo (H-7/H-3/H-1/Hari H/Terlambat) ke seluruh warga
            yang tagihannya memenuhi kriteria — hanya lewat notifikasi in-app untuk saat ini;
            channel WhatsApp/Email/Push sudah disiapkan strukturnya tapi belum terhubung ke
            provider sungguhan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState icon={Bell} title="Belum ada notifikasi" />
          ) : (
            <>
              <div className="divide-y">
                {items.map((n) => (
                  <div key={n.id} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <p className={n.isRead ? "text-sm text-muted-foreground" : "text-sm font-medium"}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(n.createdAt, "d MMM yyyy HH:mm", { locale: id })}
                      </p>
                    </div>
                    {!n.isRead && <Badge variant="warning">Baru</Badge>}
                  </div>
                ))}
              </div>
              <DataPagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
