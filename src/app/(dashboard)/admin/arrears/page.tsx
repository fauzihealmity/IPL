import Link from "next/link";
import { listArrears } from "@/actions/invoice.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/shared/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ApplyPenaltiesButton } from "@/components/invoices/apply-penalties-button";
import { AlertTriangle } from "lucide-react";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

const BUCKET_LABELS = {
  "1_BULAN": "1 Bulan",
  "2_BULAN": "2 Bulan",
  "3_5_BULAN": "3–5 Bulan",
  LEBIH_5_BULAN: "> 5 Bulan",
} as const;

export default async function ArrearsPage() {
  const { rows, totalOutstanding, byBucket } = await listArrears();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tunggakan</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} tagihan tertunggak · Total {formatRupiah(totalOutstanding)}
          </p>
        </div>
        <ApplyPenaltiesButton />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {(Object.keys(BUCKET_LABELS) as Array<keyof typeof BUCKET_LABELS>).map((bucket) => (
          <Card key={bucket}>
            <CardHeader className="pb-2">
              <CardDescription>{BUCKET_LABELS[bucket]}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{formatRupiah(byBucket[bucket])}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Tunggakan</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="Tidak ada tunggakan"
              description="Semua tagihan yang sudah jatuh tempo telah dibayar."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rumah</TableHead>
                  <TableHead>Warga</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Lama Tunggakan</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.invoiceId}>
                    <TableCell className="font-medium">{row.houseLabel}</TableCell>
                    <TableCell>{row.residentName ?? "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.dueDate.toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.agingBucket === "LEBIH_5_BULAN" ? "destructive" : "warning"}>
                        {BUCKET_LABELS[row.agingBucket]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatRupiah(row.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/invoices/${row.invoiceId}`}>
                        <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                          Lihat
                        </Badge>
                      </Link>
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
