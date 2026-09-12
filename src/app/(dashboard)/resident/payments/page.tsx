import { listMyPayableInvoices, listMyPayments } from "@/actions/payment.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/shared/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PaymentFormDialog } from "@/components/payments/payment-form-dialog";
import { PaymentStatus } from "@prisma/client";
import { CreditCard } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Menunggu Verifikasi",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
};

const STATUS_VARIANTS: Record<PaymentStatus, "warning" | "success" | "destructive"> = {
  PENDING: "warning",
  VERIFIED: "success",
  REJECTED: "destructive",
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default async function ResidentPaymentsPage() {
  const [payableInvoices, { items: payments }] = await Promise.all([
    listMyPayableInvoices(),
    listMyPayments({}),
  ]);

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold">Pembayaran</h1>
        <p className="text-sm text-muted-foreground">
          Kirim bukti transfer untuk tagihan yang belum lunas. Pembayaran akan diverifikasi admin
          sebelum tagihan berubah menjadi lunas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tagihan Belum Lunas</CardTitle>
          <CardDescription>Pembayaran harus sesuai dengan total tagihan (tidak sebagian).</CardDescription>
        </CardHeader>
        <CardContent>
          {payableInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tidak ada tagihan yang perlu dibayar saat ini.
            </p>
          ) : (
            <div className="space-y-3">
              {payableInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      Periode {invoice.periodMonth}/{invoice.periodYear} — {formatRupiah(Number(invoice.totalAmount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Jatuh tempo {format(invoice.dueDate, "d MMMM yyyy", { locale: id })}
                      {invoice.status === "OVERDUE" && " · sudah termasuk denda keterlambatan"}
                    </p>
                  </div>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState icon={CreditCard} title="Belum ada riwayat pembayaran" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Pembayaran</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.paymentNumber}</TableCell>
                    <TableCell>{formatRupiah(Number(p.amount))}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(p.paidAt, "d MMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
