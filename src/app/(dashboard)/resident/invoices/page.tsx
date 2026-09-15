import { listMyInvoices } from "@/actions/invoice.actions";
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
import { DataPagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { InvoiceStatus } from "@prisma/client";
import {
  CalendarDays,
  CircleAlert,
  FileText,
  ReceiptText,
  WalletCards,
} from "lucide-react";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  UNPAID: "Belum Lunas",
  PENDING_VERIFICATION: "Menunggu Verifikasi",
  PAID: "Lunas",
  OVERDUE: "Terlambat",
  CANCELLED: "Dibatalkan",
};

const STATUS_VARIANTS: Record<
  InvoiceStatus,
  "success" | "warning" | "destructive" | "secondary"
> = {
  UNPAID: "warning",
  PENDING_VERIFICATION: "secondary",
  PAID: "success",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPeriod(month: number, year: number) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function formatDate(date: Date) {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ResidentInvoicesPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const searchParams = await searchParamsPromise;

  const { items, totalItems, totalPages, page, pageSize } =
    await listMyInvoices({
      page: searchParams.page ? Number(searchParams.page) : 1,
    });

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-primary">Portal Warga</p>

        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ReceiptText className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Tagihan Saya
            </h1>
            <p className="text-sm text-muted-foreground">
              Riwayat tagihan IPL Anda tercatat di halaman ini.
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                Total Tagihan
              </p>
              <p className="mt-1 text-2xl font-bold">{totalItems}</p>
              <p className="text-xs text-muted-foreground">
                tagihan tercatat
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <WalletCards className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                Daftar Tagihan
              </p>
              <p className="mt-1 text-2xl font-bold">{items.length}</p>
              <p className="text-xs text-muted-foreground">
                ditampilkan di halaman ini
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="border-b bg-muted/20 px-5 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ReceiptText className="h-4 w-4" />
            </div>

            <div>
              <h2 className="font-semibold">Daftar Tagihan</h2>
              <p className="text-xs text-muted-foreground">
                Informasi periode, nominal, jatuh tempo, dan status.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FileText}
                title="Belum ada tagihan"
                description="Tagihan IPL Anda akan muncul di sini setelah diterbitkan admin."
              />
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead className="pl-6">Periode</TableHead>
                      <TableHead className="whitespace-nowrap">
                        Total
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Jatuh Tempo
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {items.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className="transition-colors"
                      >
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <CalendarDays className="h-4 w-4" />
                            </div>

                            <div>
                              <p className="font-semibold capitalize">
                                {formatPeriod(
                                  invoice.periodMonth,
                                  invoice.periodYear
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Periode IPL
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <p className="font-semibold">
                            {formatRupiah(Number(invoice.totalAmount))}
                          </p>
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarDays className="h-4 w-4 shrink-0" />
                            <span>{formatDate(invoice.dueDate)}</span>
                          </div>
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <Badge variant={STATUS_VARIANTS[invoice.status]}>
                            {STATUS_LABELS[invoice.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile */}
              <div className="divide-y md:hidden">
                {items.map((invoice) => {
                  const isOverdue = invoice.status === "OVERDUE";
                  const isUnpaid = invoice.status === "UNPAID";

                  return (
                    <div
                      key={invoice.id}
                      className="p-5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <CalendarDays className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <p className="font-semibold capitalize">
                              {formatPeriod(
                                invoice.periodMonth,
                                invoice.periodYear
                              )}
                            </p>

                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Periode IPL
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant={STATUS_VARIANTS[invoice.status]}
                          className="shrink-0"
                        >
                          {STATUS_LABELS[invoice.status]}
                        </Badge>
                      </div>

                      <div className="mt-5 rounded-xl bg-muted/30 p-4">
                        <p className="text-xs text-muted-foreground">
                          Total Tagihan
                        </p>

                        <p className="mt-1 text-xl font-bold">
                          {formatRupiah(Number(invoice.totalAmount))}
                        </p>
                      </div>

                      <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                        {isOverdue || isUnpaid ? (
                          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
                        )}

                        <span className="leading-5">
                          Jatuh tempo: {formatDate(invoice.dueDate)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="border-t px-4 py-4 md:px-6">
                <div className="min-w-0 overflow-x-auto">
                  <DataPagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageSize={pageSize}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}