import { getPublicTransparency } from "@/actions/finance.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, PieChart } from "lucide-react";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default async function TransparencyPage() {
  const { totalIncome, totalExpense, balance, byCategory } = await getPublicTransparency();
  const maxCategoryAmount = Math.max(1, ...byCategory.map((c) => c.amount));

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold">Transparansi Keuangan</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan kas perumahan. Hanya menampilkan total agregat — tidak ada data
          transaksi per rumah atau nama warga.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Pemasukan</CardDescription>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="text-lg font-bold">{formatRupiah(totalIncome)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Pengeluaran</CardDescription>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="text-lg font-bold">{formatRupiah(totalExpense)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Saldo</CardDescription>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="text-lg font-bold">{formatRupiah(balance)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Kategori Pengeluaran
          </CardTitle>
          <CardDescription>Hanya kategori dengan pengeluaran yang ditampilkan.</CardDescription>
        </CardHeader>
        <CardContent>
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data pengeluaran publik.</p>
          ) : (
            <div className="space-y-3">
              {byCategory.map((row) => (
                <div key={row.category}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{row.category}</span>
                    <span className="font-medium">{formatRupiah(row.amount)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${(row.amount / maxCategoryAmount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
