import { listAdvertisements, deleteAdvertisement } from "@/actions/advertisement.actions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/shared/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { AdvertisementFormDialog } from "@/components/advertisements/advertisement-form-dialog";
import { Megaphone } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { id } from "date-fns/locale";

function formatDate(date: Date | null) {
  if (!date) return "-";

  return format(date, "dd MMM yyyy", {
    locale: id,
  });
}

function getPeriodText(startAt: Date | null, endAt: Date | null) {
  if (!startAt && !endAt) {
    return "Selalu tampil";
  }

  if (startAt && endAt) {
    return `${formatDate(startAt)} – ${formatDate(endAt)}`;
  }

  if (startAt) {
    return `Mulai ${formatDate(startAt)}`;
  }

  return `Sampai ${formatDate(endAt)}`;
}

function getAdvertisementImageUrl(imageUrl: string) {
  const path = imageUrl
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/files/${path}`;
}

export default async function AdminAdvertisementsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const searchParams = await searchParamsPromise;

  const { items, totalItems, totalPages, page, pageSize } =
    await listAdvertisements({
      page: searchParams.page ? Number(searchParams.page) : 1,
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Iklan</h1>
          <p className="text-sm text-muted-foreground">
            {totalItems} iklan tercatat.
          </p>
        </div>

        <AdvertisementFormDialog />
      </div>

      <Card>
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="Belum ada iklan"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banner</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Urutan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {items.map((advertisement) => (
                    <TableRow key={advertisement.id}>
                      <TableCell>
                        {advertisement.imageUrl ? (
                          <Image
                            src={getAdvertisementImageUrl(
                              advertisement.imageUrl
                            )}
                            alt={advertisement.title}
                            width={96}
                            height={48}
                            className="h-12 w-24 rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-24 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                            Tanpa gambar
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="font-medium">
                          {advertisement.title}
                        </div>

                        {advertisement.description && (
                          <div className="mt-1 max-w-xs truncate text-xs text-muted-foreground">
                            {advertisement.description}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-sm">
                        {getPeriodText(
                          advertisement.startAt,
                          advertisement.endAt
                        )}
                      </TableCell>

                      <TableCell>
                        {advertisement.sortOrder}
                      </TableCell>

                      <TableCell>
                        {advertisement.isActive ? (
                          <Badge variant="success">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <AdvertisementFormDialog
                            advertisement={advertisement}
                          />

                          <ConfirmDeleteButton
                            itemLabel={advertisement.title}
                            onConfirm={deleteAdvertisement.bind(null, advertisement.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}