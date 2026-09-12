import Link from "next/link";
import { listMyComplaints } from "@/actions/complaint.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/shared/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DataPagination } from "@/components/shared/pagination";
import { ComplaintFormDialog } from "@/components/complaints/complaint-form-dialog";
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

export default async function ResidentComplaintsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const { items, totalItems, totalPages, page, pageSize } = await listMyComplaints({
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  return (
    <div className="space-y-4 pb-16 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pengaduan</h1>
          <p className="text-sm text-muted-foreground">{totalItems} pengaduan yang pernah Anda kirim.</p>
        </div>
        <ComplaintFormDialog />
      </div>

      <Card>
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <EmptyState
              icon={MessageSquareWarning}
              title="Belum ada pengaduan"
              description="Sampaikan keluhan atau masukan Anda kepada pengurus perumahan."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
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
                      <TableCell>{c.category}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(c.createdAt, "d MMM yyyy", { locale: id })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[c.status]}>{STATUS_LABELS[c.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/resident/complaints/${c.id}`}>
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
