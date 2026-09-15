import { listMyPayableInvoices, listMyPayments } from "@/actions/payment.actions";
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
import { PaymentFormDialog } from "@/components/payments/payment-form-dialog";
import { PaymentStatus } from "@prisma/client";
import {
  CalendarDays,
  CreditCard,
  FileText,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Menunggu Verifikasi",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
};

const STATUS_VARIANTS: Record<
  PaymentStatus,
  "warning" | "success" | "destructive"
> = {
  PENDING: "warning",
  VERIFIED: "success",
  REJECTED: "destructive",
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

export default async function ResidentPaymentsPage() {
  const [payableInvoices, { items: payments }] = await Promise.all([
    listMyPayableInvoices(),
    listMyPayments({}),
  ]);

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-primary">Portal Warga</p>

        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Pembayaran
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Kirim bukti transfer untuk tagihan yang belum lunas.
              Pembayaran akan diverifikasi admin sebelum tagihan berubah
              menjadi lunas.
            </p>
          </div>
        </div>
      </div>

      {/* Payable Invoices */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="border-b bg-muted/20 px-5 py-4 md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <WalletCards className="h-4 w-4" />
            </div>

            <div>
              <h2 className="font-semibold">Tagihan Belum Lunas</h2>
              <p className="text-xs leading-5 text-muted-foreground">
                Pembayaran harus sesuai dengan total tagihan (tidak
                sebagian).
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-5 md:p-6">
          {payableInvoices.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/10 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ReceiptText className="h-5 w-5" />
              </div>

              <p className="mt-3 font-medium">
                Tidak ada tagihan yang perlu dibayar
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Saat ini semua tagihan Anda sudah lunas atau belum ada
                tagihan yang dapat dibayar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payableInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="rounded-xl border border-border/70 bg-background p-4 shadow-sm transition-colors hover:bg-muted/10"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <CalendarDays className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold">
                          {formatPeriod(
                            invoice.periodMonth,
                            invoice.periodYear
                          )}
                        </p>

                        <p className="mt-1 text-lg font-bold">
                          {formatRupiah(Number(invoice.totalAmount))}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            Jatuh tempo{" "}
                            {format(invoice.dueDate, "d MMMM yyyy", {
                              locale: id,
                            })}
                          </span>

                          {invoice.status === "OVERDUE" && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-destructive">
                                Termasuk denda keterlambatan
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 lg:pl-4">
                      <PaymentFormDialog
                        invoice={{
                          id: invoice.id,
                          invoiceNumber: invoice.invoiceNumber,
                          totalAmount: Number(invoice.totalAmount),
                          periodMonth: invoice.periodMonth,
                          periodYear: invoice.periodYear,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="border-b bg-muted/20 px-5 py-4 md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ReceiptText className="h-4 w-4" />
            </div>

            <div>
              <h2 className="font-semibold">Riwayat Pembayaran</h2>
              <p className="text-xs leading-5 text-muted-foreground">
                Daftar pembayaran yang pernah Anda kirimkan.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CreditCard}
                title="Belum ada riwayat pembayaran"
              />
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead className="pl-6 whitespace-nowrap">
                        No. Pembayaran
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Nominal
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Tanggal
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {payments.map((p) => (
                      <TableRow
                        key={p.id}
                        className="transition-colors"
                      >
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                              <FileText className="h-4 w-4" />
                            </div>

                            <span className="font-mono text-xs">
                              {p.paymentNumber}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="whitespace-nowrap font-semibold">
                          {formatRupiah(Number(p.amount))}
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarDays className="h-4 w-4 shrink-0" />
                            <span>
                              {format(p.paidAt, "d MMM yyyy", {
                                locale: id,
                              })}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <Badge variant={STATUS_VARIANTS[p.status]}>
                            {STATUS_LABELS[p.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile */}
              <div className="divide-y md:hidden">
                {payments.map((p) => (
                  <div key={p.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <FileText className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="font-mono text-xs font-medium break-all">
                            {p.paymentNumber}
                          </p>

                          <p className="mt-1 text-lg font-bold">
                            {formatRupiah(Number(p.amount))}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={STATUS_VARIANTS[p.status]}
                        className="shrink-0"
                      >
                        {STATUS_LABELS[p.status]}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      <span>
                        {format(p.paidAt, "d MMMM yyyy", {
                          locale: id,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}