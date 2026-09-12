import { listMyInvoices } from "@/actions/invoice.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/shared/badge";
import { DataPagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { InvoiceStatus } from "@prisma/client";
import { FileText } from "lucide-react";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  UNPAID: "Belum Lunas",
  PENDING_VERIFICATION: "Menunggu Verifikasi",
  PAID: "Lunas",
  OVERDUE: "Terlambat",
  CANCELLED: "Dibatalkan",
};

const STATUS_VARIANTS: Record<InvoiceStatus, "success" | "warning" | "destructive" | "secondary"> = {
  UNPAID: "warning",
  PENDING_VERIFICATION: "secondary",
  PAID: "success",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default async function ResidentInvoicesPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const { items, totalItems, totalPages, page, pageSize } = await listMyInvoices({
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  return (
    <div className="space-y-4 pb-16 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold">Tagihan Saya</h1>
        <p className="text-sm text-muted-foreground">{totalItems} tagihan tercatat.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <EmptyState icon={FileText} title="Belum ada tagihan" description="Tagihan IPL Anda akan muncul di sini setelah diterbitkan admin." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.periodMonth}/{invoice.periodYear}</TableCell>
                      <TableCell>{formatRupiah(Number(invoice.totalAmount))}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invoice.dueDate.toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[invoice.status]}>
                          {STATUS_LABELS[invoice.status]}
                        </Badge>
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
