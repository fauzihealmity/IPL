import { listActiveAnnouncementsForResident } from "@/actions/announcement.actions";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { DataPagination } from "@/components/shared/pagination";
import {
  CalendarDays,
  FileText,
  Megaphone,
  Paperclip,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default async function ResidentAnnouncementsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const searchParams = await searchParamsPromise;

  const { items, totalItems, totalPages, page, pageSize } =
    await listActiveAnnouncementsForResident({
      page: searchParams.page ? Number(searchParams.page) : 1,
    });

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-primary">Portal Warga</p>

        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Megaphone className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Pengumuman
            </h1>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Informasi dan pemberitahuan terbaru dari pengurus
              perumahan.
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Megaphone className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              Total Pengumuman
            </p>

            <p className="mt-1 text-2xl font-bold">
              {totalItems}
            </p>

            <p className="text-xs text-muted-foreground">
              pengumuman aktif
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Announcements */}
      {items.length === 0 ? (
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <CardContent className="p-6">
            <EmptyState
              icon={Megaphone}
              title="Belum ada pengumuman"
              description="Pengumuman terbaru dari pengurus akan muncul di sini."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <Card
              key={a.id}
              className="overflow-hidden border-border/60 shadow-sm"
            >
              {/* Announcement Header */}
              <div className="border-b bg-muted/20 px-5 py-4 md:px-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Megaphone className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-base font-semibold leading-6 md:text-lg">
                      {a.title}
                    </h2>

                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />

                      <span>
                        {format(a.publishAt, "d MMMM yyyy", {
                          locale: id,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="space-y-5 p-5 md:p-6">
                {/* Content */}
                <div>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                    {a.content}
                  </p>
                </div>

                {/* Image */}
                {a.imageUrl && (
                  <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/files/${a.imageUrl}`}
                      alt={a.title}
                      className="max-h-[420px] w-full object-contain"
                    />
                  </div>
                )}

                {/* Attachment */}
                {a.attachmentUrl && (
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
                          <FileText className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="text-sm font-medium">
                            Lampiran Pengumuman
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Dokumen terkait pengumuman
                          </p>
                        </div>
                      </div>

                      <a
                        href={`/api/files/${a.attachmentUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                      >
                        <Paperclip className="h-4 w-4" />
                        Lihat Lampiran
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          <div className="pt-2">
            <div className="min-w-0 overflow-x-auto">
              <DataPagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}