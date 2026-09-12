import { notFound } from "next/navigation";
import Link from "next/link";
import { getInvoiceDetail } from "@/actions/invoice.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/ui/button";
import { CancelInvoiceButton } from "@/components/invoices/cancel-invoice-button";
import { InvoiceStatus } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: invoiceId } = await params;
  const invoice = await getInvoiceDetail(invoiceId);
  if (!invoice) notFound();

  const canCancel = invoice.status === InvoiceStatus.UNPAID || invoice.status === InvoiceStatus.OVERDUE;

  return (
    <div className="space-y-4">
      <Link href="/admin/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Daftar Tagihan
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {invoice.house.block.name}-{invoice.house.houseNumber}
            {invoice.resident && ` · ${invoice.resident.fullName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANTS[invoice.status]}>{STATUS_LABELS[invoice.status]}</Badge>
          {canCancel && <CancelInvoiceButton invoiceId={invoice.id} />}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rincian Tagihan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Periode" value={`${invoice.periodMonth}/${invoice.periodYear}`} />
            <Row label="IPL" value={formatRupiah(Number(invoice.iplAmount))} />
            <Row label="Biaya Tambahan" value={formatRupiah(Number(invoice.additionalFee))} />
            <Row label="Denda" value={formatRupiah(Number(invoice.penalty))} />
            <Row label="Diskon" value={`- ${formatRupiah(Number(invoice.discount))}`} />
            <div className="my-2 border-t" />
            <Row label="Total" value={formatRupiah(Number(invoice.totalAmount))} bold />
            <Row label="Jatuh Tempo" value={format(invoice.dueDate, "d MMMM yyyy", { locale: id })} />
            {invoice.paidAt && (
              <Row label="Dibayar Pada" value={format(invoice.paidAt, "d MMMM yyyy", { locale: id })} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            {invoice.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada pembayaran untuk tagihan ini.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="flex justify-between border-b pb-2 last:border-0">
                    <span>{p.paymentNumber}</span>
                    <span>{formatRupiah(Number(p.amount))}</span>
                    <Badge variant="outline">{p.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
