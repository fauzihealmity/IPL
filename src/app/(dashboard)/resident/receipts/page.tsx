import { listMyReceipts } from "@/actions/payment.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Receipt as ReceiptIcon,
  Download,
  FileCheck2,
  WalletCards,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function ResidentReceiptsPage() {
  const { items } = await listMyReceipts({});

  const totalReceipts = items.length;

  const totalAmount = items.reduce(
    (total, receipt) => total + Number(receipt.payment.amount),
    0
  );

  const latestReceipt = items[0];

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      {/* Header */}
      <div>
        <p className="mb-2 text-sm font-medium text-primary">
          Portal Warga
        </p>

        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ReceiptIcon className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Kwitansi
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Kwitansi pembayaran yang telah diverifikasi oleh admin akan
              tersedia di halaman ini.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ReceiptIcon className="h-6 w-6" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Total Kwitansi
              </p>

              <p className="mt-1 text-2xl font-bold">
                {totalReceipts}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                kwitansi tersedia
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <WalletCards className="h-6 w-6" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Total Pembayaran
              </p>

              <p className="mt-1 text-xl font-bold">
                {formatRupiah(totalAmount)}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                dari pembayaran terverifikasi
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarDays className="h-6 w-6" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Kwitansi Terakhir
              </p>

              <p className="mt-1 font-bold">
                {latestReceipt
                  ? format(latestReceipt.issuedAt, "d MMMM yyyy", {
                      locale: id,
                    })
                  : "-"}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                terakhir diterbitkan
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receipt List */}
      <Card className="overflow-hidden">
        <div className="border-b px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileCheck2 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-lg">
                Daftar Kwitansi
              </h2>

              <p className="text-sm text-muted-foreground">
                Dokumen bukti pembayaran IPL yang telah diverifikasi.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={ReceiptIcon}
                title="Belum ada kwitansi"
                description="Kwitansi akan muncul di sini setelah pembayaran Anda diverifikasi oleh admin."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">
                      No. Kwitansi
                    </TableHead>

                    <TableHead>Periode</TableHead>

                    <TableHead>Nominal</TableHead>

                    <TableHead>Diterbitkan</TableHead>

                    <TableHead className="pr-6 text-right">
                      Dokumen
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {items.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <ReceiptIcon className="h-5 w-5" />
                          </div>

                          <span className="font-mono text-xs font-medium">
                            {receipt.receiptNumber}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {format(
                              new Date(
                                receipt.invoice.periodYear,
                                receipt.invoice.periodMonth - 1
                              ),
                              "MMMM yyyy",
                              {
                                locale: id,
                              }
                            )}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Rumah{" "}
                            {receipt.invoice.house.block.name}-
                            {receipt.invoice.house.houseNumber}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="font-semibold">
                          {formatRupiah(
                            Number(receipt.payment.amount)
                          )}
                        </span>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {format(
                          receipt.issuedAt,
                          "d MMMM yyyy",
                          {
                            locale: id,
                          }
                        )}
                      </TableCell>

                      <TableCell className="pr-6 text-right">
                        {receipt.pdfUrl ? (
                          <Button
                            asChild
                            size="sm"
                            className="gap-2"
                          >
                            <a
                              href={`/api/files/${receipt.pdfUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="h-4 w-4" />
                              Unduh PDF
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Sedang diproses
                          </span>
                        )}
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