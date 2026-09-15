import { getPublicTransparency } from "@/actions/finance.actions";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowDownLeft,
  ArrowUpRight,
  PieChart,
  Wallet,
} from "lucide-react";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function TransparencyPage() {
  const { totalIncome, totalExpense, balance, byCategory } =
    await getPublicTransparency();

  const maxCategoryAmount = Math.max(
    1,
    ...byCategory.map((c) => c.amount)
  );

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-primary">Portal Warga</p>

        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Transparansi Keuangan
            </h1>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Ringkasan kas perumahan secara agregat. Data transaksi
              per rumah dan nama warga tidak ditampilkan.
            </p>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Pemasukan
                </p>

                <p className="mt-2 text-xl font-bold tracking-tight">
                  {formatRupiah(totalIncome)}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  dana masuk
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Pengeluaran
                </p>

                <p className="mt-2 text-xl font-bold tracking-tight">
                  {formatRupiah(totalExpense)}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  dana keluar
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Saldo Kas
                </p>

                <p className="mt-2 text-xl font-bold tracking-tight">
                  {formatRupiah(balance)}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  saldo saat ini
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Categories */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="border-b bg-muted/20 px-5 py-4 md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PieChart className="h-4 w-4" />
            </div>

            <div>
              <h2 className="font-semibold">
                Kategori Pengeluaran
              </h2>

              <p className="text-xs leading-5 text-muted-foreground">
                Ringkasan pengeluaran berdasarkan kategori.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-5 md:p-6">
          {byCategory.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/10 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PieChart className="h-5 w-5" />
              </div>

              <p className="mt-3 font-medium">
                Belum ada data pengeluaran
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Data pengeluaran publik akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {byCategory.map((row) => {
                const percentage =
                  (row.amount / maxCategoryAmount) * 100;

                return (
                  <div key={row.category}>
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <span className="min-w-0 truncate text-sm font-medium">
                        {row.category}
                      </span>

                      <span className="shrink-0 text-sm font-semibold">
                        {formatRupiah(row.amount)}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}