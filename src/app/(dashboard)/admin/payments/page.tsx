import Link from "next/link";
import { listPayments } from "@/actions/payment.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/shared/badge";
import { DataPagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { VerifyPaymentButton } from "@/components/payments/verify-payment-button";
import { RejectPaymentButton } from "@/components/payments/reject-payment-button";
import { RegenerateReceiptButton } from "@/components/payments/regenerate-receipt-button";
import { PaymentStatus } from "@prisma/client";
import { CreditCard, Paperclip, FileText } from "lucide-react";
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

const METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Transfer Bank",
  QRIS: "QRIS",
  VIRTUAL_ACCOUNT: "Virtual Account",
  CASH: "Tunai",
  OTHER: "Lainnya",
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default async function AdminPaymentsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ page?: string; status?: PaymentStatus }>;
}) {
  const searchParams = await searchParamsPromise;
  const status = searchParams.status;
  const { items, totalItems, totalPages, page, pageSize } = await listPayments({
    status,
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  const filters: { label: string; value: PaymentStatus | undefined }[] = [
    { label: "Semua", value: undefined },
    { label: "Menunggu Verifikasi", value: PaymentStatus.PENDING },
    { label: "Terverifikasi", value: PaymentStatus.VERIFIED },
    { label: "Ditolak", value: PaymentStatus.REJECTED },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pembayaran</h1>
        <p className="text-sm text-muted-foreground">{totalItems} pembayaran tercatat.</p>
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <Link key={f.label} href={f.value ? `/admin/payments?status=${f.value}` : "/admin/payments"}>
            <Badge variant={status === f.value ? "default" : "outline"} className="cursor-pointer">
              {f.label}
            </Badge>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Belum ada pembayaran"
              description="Pembayaran yang dikirim warga akan muncul di sini untuk diverifikasi."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Pembayaran</TableHead>
                    <TableHead>Rumah / Warga</TableHead>
                    <TableHead>Tagihan</TableHead>
                    <TableHead>Nominal</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead>Bukti</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">{payment.paymentNumber}</TableCell>
                      <TableCell>
                        {payment.invoice.house.block.name}-{payment.invoice.house.houseNumber}
                        {payment.resident && (
                          <div className="text-xs text-muted-foreground">{payment.resident.fullName}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{payment.invoice.invoiceNumber}</TableCell>
                      <TableCell>{formatRupiah(Number(payment.amount))}</TableCell>
                      <TableCell>{METHOD_LABELS[payment.method] ?? payment.method}</TableCell>
                      <TableCell>
                        {payment.proof ? (
                          <a
                            href={`/api/files/${payment.proof.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            Lihat
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[payment.status]}>{STATUS_LABELS[payment.status]}</Badge>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {format(payment.paidAt, "d MMM yyyy", { locale: id })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {payment.status === PaymentStatus.PENDING ? (
                          <div className="flex justify-end gap-1">
                            <VerifyPaymentButton paymentId={payment.id} />
                            <RejectPaymentButton paymentId={payment.id} />
                          </div>
                        ) : payment.status === PaymentStatus.VERIFIED && payment.receipt ? (
                          <div className="flex justify-end gap-1">
                            {!payment.receipt.pdfUrl && (
                              <RegenerateReceiptButton receiptId={payment.receipt.id} />
                            )}

                            {payment.receipt.pdfUrl && (
                              <a
                                href={`/api/files/${payment.receipt.pdfUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                              >
                                <FileText className="h-4 w-4" />
                                Lihat PDF
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {payment.verifiedAt &&
                              format(payment.verifiedAt, "d MMM yyyy", { locale: id })}
                          </span>
                        )}
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
