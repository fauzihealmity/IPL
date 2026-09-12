import { listActiveAnnouncementsForResident } from "@/actions/announcement.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { DataPagination } from "@/components/shared/pagination";
import { Megaphone, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default async function ResidentAnnouncementsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const { items, totalItems, totalPages, page, pageSize } = await listActiveAnnouncementsForResident({
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  return (
    <div className="space-y-4 pb-16 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold">Pengumuman</h1>
        <p className="text-sm text-muted-foreground">{totalItems} pengumuman.</p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState icon={Megaphone} title="Belum ada pengumuman" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <CardTitle className="text-base">{a.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {format(a.publishAt, "d MMMM yyyy", { locale: id })}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="whitespace-pre-wrap text-sm">{a.content}</p>
                {a.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/files/${a.imageUrl}`}
                    alt={a.title}
                    className="max-h-80 rounded-md border object-cover"
                  />
                )}
                {a.attachmentUrl && (
                  <a
                    href={`/api/files/${a.attachmentUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Paperclip className="h-4 w-4" />
                    Lihat Lampiran
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
          <DataPagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} />
        </div>
      )}
    </div>
  );
}
