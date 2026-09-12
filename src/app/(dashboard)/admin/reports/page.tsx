import { getInvoiceReport, getPaymentReport, getMonthlyTrend } from "@/actions/report.actions";
import { listArrears } from "@/actions/invoice.actions";
import { getFinanceSummary } from "@/actions/finance.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportButton } from "@/components/reports/export-button";
import { PrintButton } from "@/components/reports/print-button";
import { ReportPeriodSelector } from "@/components/reports/report-period-selector";
import { IncomeExpenseTrendChart } from "@/components/reports/income-expense-trend-chart";
import { Download } from "lucide-react";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default async function ReportsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const now = new Date();
  const periodMonth = searchParams.month ? Number(searchParams.month) : now.getMonth() + 1;
  const periodYear = searchParams.year ? Number(searchParams.year) : now.getFullYear();

  const [invoiceReport, paymentReport, arrears, finance, trend] = await Promise.all([
    getInvoiceReport(periodMonth, periodYear),
    getPaymentReport(),
    listArrears(),
    getFinanceSummary(periodMonth, periodYear),
    getMonthlyTrend(6),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Laporan</h1>
          <p className="text-sm text-muted-foreground">Periode {periodMonth}/{periodYear}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportPeriodSelector month={periodMonth} year={periodYear} />
          <PrintButton />
          <a
            href={`/api/export/report-pdf?month=${periodMonth}&year=${periodYear}`}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tren Pemasukan vs Pengeluaran (6 Bulan Terakhir)</CardTitle>
        </CardHeader>
        <CardContent>
          <IncomeExpenseTrendChart data={trend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Laporan Tagihan</CardTitle>
          <ExportButton resource="invoices" label="Tagihan" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Total Tagihan" value={`${invoiceReport.totalCount} — ${formatRupiah(invoiceReport.totalAmount)}`} />
          <Stat label="Sudah Lunas" value={`${invoiceReport.paidCount} — ${formatRupiah(invoiceReport.paidAmount)}`} />
          <Stat label="Belum Lunas" value={`${invoiceReport.unpaidCount} — ${formatRupiah(invoiceReport.unpaidAmount)}`} />
          <Stat label="Terlambat" value={`${invoiceReport.overdueCount} — ${formatRupiah(invoiceReport.overdueAmount)}`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Laporan Pembayaran (Seluruh Waktu)</CardTitle>
          <ExportButton resource="payments" label="Pembayaran" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Jumlah Transaksi" value={String(paymentReport.totalCount)} />
            <Stat label="Total Pembayaran" value={formatRupiah(paymentReport.totalAmount)} />
          </div>
          {paymentReport.byMethod.length > 0 && (
            <div className="mt-4 space-y-1 text-sm">
              {paymentReport.byMethod.map((m) => (
                <div key={m.method} className="flex justify-between border-b py-1 last:border-0">
                  <span>{m.method}</span>
                  <span>{m.count} transaksi — {formatRupiah(m.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Laporan Tunggakan</CardTitle>
          <ExportButton resource="arrears" label="Tunggakan" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Stat label="Jumlah Tertunggak" value={String(arrears.rows.length)} />
          <Stat label="Total" value={formatRupiah(arrears.totalOutstanding)} />
          <Stat label="1 Bulan" value={formatRupiah(arrears.byBucket["1_BULAN"])} />
          <Stat label="2 Bulan" value={formatRupiah(arrears.byBucket["2_BULAN"])} />
          <Stat label="3-5 / >5 Bulan" value={`${formatRupiah(arrears.byBucket["3_5_BULAN"])} / ${formatRupiah(arrears.byBucket.LEBIH_5_BULAN)}`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Laporan Keuangan</CardTitle>
          <div className="flex gap-2">
            <ExportButton resource="income" label="Pemasukan" />
            <ExportButton resource="expense" label="Pengeluaran" />
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Saldo Awal" value={formatRupiah(finance.openingBalance)} />
          <Stat label="Pemasukan" value={formatRupiah(finance.income)} />
          <Stat label="Pengeluaran" value={formatRupiah(finance.expense)} />
          <Stat label="Saldo Akhir" value={formatRupiah(finance.closingBalance)} />
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Data Master</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ExportButton resource="houses" label="Rumah" />
          <ExportButton resource="residents" label="Warga" />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
