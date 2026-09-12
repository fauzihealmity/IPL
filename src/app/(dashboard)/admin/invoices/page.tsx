import Link from "next/link";
import { listInvoices } from "@/actions/invoice.actions";
import { getPenaltyConfig } from "@/lib/services/settings.service";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/shared/badge";
import { SearchInput } from "@/components/shared/search-input";
import { SortableHeader } from "@/components/shared/sortable-header";
import { DataPagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { GenerateInvoiceDialog } from "@/components/invoices/generate-invoice-dialog";
import { PenaltyConfigDialog } from "@/components/invoices/penalty-config-dialog";
import { FileText } from "lucide-react";
import { InvoiceStatus } from "@prisma/client";

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

export default async function InvoicesPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; order?: "asc" | "desc"; status?: InvoiceStatus }>;
}) {
  const searchParams = await searchParamsPromise;
  const [{ items, totalItems, totalPages, page, pageSize }, penaltyConfig] = await Promise.all([
    listInvoices({
      q: searchParams.q,
      page: searchParams.page ? Number(searchParams.page) : 1,
      sort: searchParams.sort,
      order: searchParams.order,
      status: searchParams.status,
    }),
    getPenaltyConfig(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tagihan IPL</h1>
          <p className="text-sm text-muted-foreground">{totalItems} tagihan tercatat.</p>
        </div>
        <div className="flex gap-2">
          <PenaltyConfigDialog config={penaltyConfig} />
          <GenerateInvoiceDialog />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <SearchInput placeholder="Cari nomor tagihan, rumah, atau nama warga..." />
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Belum ada tagihan"
              description="Klik 'Generate Tagihan' untuk menerbitkan tagihan IPL periode berjalan."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Tagihan</TableHead>
                    <TableHead>Rumah</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>
                      <SortableHeader
                        field="totalAmount"
                        label="Total"
                        currentSort={searchParams.sort}
                        currentOrder={searchParams.order}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        field="dueDate"
                        label="Jatuh Tempo"
                        currentSort={searchParams.sort}
                        currentOrder={searchParams.order}
                      />
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-xs">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        {invoice.house.block.name}-{invoice.house.houseNumber}
                        {invoice.resident && (
                          <div className="text-xs text-muted-foreground">{invoice.resident.fullName}</div>
                        )}
                      </TableCell>
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
                      <TableCell className="text-right">
                        <Link href={`/admin/invoices/${invoice.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                            Detail
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
