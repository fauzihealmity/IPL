import Link from "next/link";
import { listComplaints } from "@/actions/complaint.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/shared/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DataPagination } from "@/components/shared/pagination";
import { ComplaintStatus } from "@prisma/client";
import { MessageSquareWarning } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  NEW: "Baru",
  IN_PROGRESS: "Diproses",
  FOLLOW_UP: "Tindak Lanjut",
  RESOLVED: "Selesai",
  REJECTED: "Ditolak",
};

const STATUS_VARIANTS: Record<ComplaintStatus, "warning" | "secondary" | "success" | "destructive"> = {
  NEW: "warning",
  IN_PROGRESS: "secondary",
  FOLLOW_UP: "secondary",
  RESOLVED: "success",
  REJECTED: "destructive",
};

export default async function AdminComplaintsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ page?: string; status?: ComplaintStatus }>;
}) {
  const searchParams = await searchParamsPromise;
  const status = searchParams.status;
  const { items, totalItems, totalPages, page, pageSize } = await listComplaints({
    status,
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  const filters: { label: string; value: ComplaintStatus | undefined }[] = [
    { label: "Semua", value: undefined },
    { label: "Baru", value: ComplaintStatus.NEW },
    { label: "Diproses", value: ComplaintStatus.IN_PROGRESS },
    { label: "Selesai", value: ComplaintStatus.RESOLVED },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pengaduan</h1>
        <p className="text-sm text-muted-foreground">{totalItems} pengaduan tercatat.</p>
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <Link key={f.label} href={f.value ? `/admin/complaints?status=${f.value}` : "/admin/complaints"}>
            <Badge variant={status === f.value ? "default" : "outline"} className="cursor-pointer">
              {f.label}
            </Badge>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <EmptyState icon={MessageSquareWarning} title="Belum ada pengaduan" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Rumah / Warga</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.title}</TableCell>
                      <TableCell>
                        {c.house.block.name}-{c.house.houseNumber}
                        <div className="text-xs text-muted-foreground">{c.resident.fullName}</div>
                      </TableCell>
                      <TableCell>{c.category}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(c.createdAt, "d MMM yyyy", { locale: id })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[c.status]}>{STATUS_LABELS[c.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/complaints/${c.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                            Lihat
                          </Badge>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
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
