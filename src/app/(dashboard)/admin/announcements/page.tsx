import { listAnnouncements, deleteAnnouncement } from "@/actions/announcement.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/shared/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DataPagination } from "@/components/shared/pagination";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { AnnouncementFormDialog } from "@/components/announcements/announcement-form-dialog";
import { Megaphone } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default async function AdminAnnouncementsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const { items, totalItems, totalPages, page, pageSize } = await listAnnouncements({
    page: searchParams.page ? Number(searchParams.page) : 1,
  });
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pengumuman</h1>
          <p className="text-sm text-muted-foreground">{totalItems} pengumuman tercatat.</p>
        </div>
        <AnnouncementFormDialog />
      </div>

      <Card>
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <EmptyState icon={Megaphone} title="Belum ada pengumuman" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Publikasi</TableHead>
                    <TableHead>Berakhir</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((a) => {
                    const isLive = a.publishAt <= now && (!a.expiresAt || a.expiresAt >= now);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.title}</TableCell>
                        <TableCell>{a.targetAudience ? "Warga" : "Semua"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(a.publishAt, "d MMM yyyy", { locale: id })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.expiresAt ? format(a.expiresAt, "d MMM yyyy", { locale: id }) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isLive ? "success" : "secondary"}>
                            {isLive ? "Tayang" : "Tidak Tayang"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <AnnouncementFormDialog
                              announcement={{
                                id: a.id,
                                title: a.title,
                                content: a.content,
                                publishAt: a.publishAt,
                                expiresAt: a.expiresAt,
                                targetAudience: a.targetAudience,
                              }}
                            />
                            <ConfirmDeleteButton
                              itemLabel={`Pengumuman "${a.title}"`}
                              onConfirm={deleteAnnouncement.bind(null, a.id)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <DataPagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
