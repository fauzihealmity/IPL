import { listMyReceipts } from "@/actions/payment.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Receipt as ReceiptIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default async function ResidentReceiptsPage() {
  const { items } = await listMyReceipts({});

  return (
    <div className="space-y-4 pb-16 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold">Kwitansi</h1>
        <p className="text-sm text-muted-foreground">
          Kwitansi diterbitkan otomatis setelah pembayaran diverifikasi admin.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <EmptyState
              icon={ReceiptIcon}
              title="Belum ada kwitansi"
              description="Kwitansi akan muncul di sini setelah pembayaran Anda diverifikasi."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Kwitansi</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Diterbitkan</TableHead>
                  <TableHead className="text-right">Unduh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-mono text-xs">{receipt.receiptNumber}</TableCell>
                    <TableCell>
                      {receipt.invoice.periodMonth}/{receipt.invoice.periodYear} —{" "}
                      {receipt.invoice.house.block.name}-{receipt.invoice.house.houseNumber}
                    </TableCell>
                    <TableCell>{formatRupiah(Number(receipt.payment.amount))}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(receipt.issuedAt, "d MMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell className="text-right">
                      {receipt.pdfUrl ? (
                        <Button asChild size="sm" variant="outline">
                          <a href={`/api/files/${receipt.pdfUrl}`} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                            PDF
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sedang diproses</span>
                      )}
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
