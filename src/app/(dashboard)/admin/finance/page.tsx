import { listIncomeTransactions, listExpenseTransactions, getFinanceSummary, deleteExpenseTransaction } from "@/actions/finance.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { ExpenseFormDialog } from "@/components/finance/expense-form-dialog";
import { IncomeVisibilityToggle } from "@/components/finance/income-visibility-toggle";
import { Badge } from "@/components/shared/badge";
import { TrendingUp, TrendingDown, Wallet, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default async function FinancePage() {
  const now = new Date();
  const [income, expense, summary] = await Promise.all([
    listIncomeTransactions({ pageSize: 20 }),
    listExpenseTransactions({ pageSize: 20 }),
    getFinanceSummary(now.getMonth() + 1, now.getFullYear()),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Keuangan</h1>
        <p className="text-sm text-muted-foreground">
          Laporan bulan berjalan ({now.getMonth() + 1}/{now.getFullYear()})
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo Awal</CardDescription>
          </CardHeader>
          <CardContent className="text-lg font-bold">{formatRupiah(summary.openingBalance)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Pemasukan</CardDescription>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="text-lg font-bold">{formatRupiah(summary.income)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Pengeluaran</CardDescription>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="text-lg font-bold">{formatRupiah(summary.expense)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Saldo Akhir</CardDescription>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="text-lg font-bold">{formatRupiah(summary.closingBalance)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pemasukan</CardTitle>
            <CardDescription>
              Otomatis tercatat dari pembayaran IPL yang terverifikasi. Total: {formatRupiah(income.totalAmount)}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {income.items.length === 0 ? (
            <EmptyState icon={TrendingUp} title="Belum ada pemasukan" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Transaksi</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Transparansi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {income.items.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs">{tx.transactionNumber}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(tx.date, "d MMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell>{formatRupiah(Number(tx.amount))}</TableCell>
                    <TableCell>
                      <IncomeVisibilityToggle id={tx.id} isPublic={tx.isPublic} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pengeluaran</CardTitle>
            <CardDescription>Total: {formatRupiah(expense.totalAmount)}</CardDescription>
          </div>
          <ExpenseFormDialog />
        </CardHeader>
        <CardContent>
          {expense.items.length === 0 ? (
            <EmptyState
              icon={TrendingDown}
              title="Belum ada pengeluaran"
              description="Catat pengeluaran operasional perumahan seperti keamanan, kebersihan, dll."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Transaksi</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Bukti</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expense.items.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs">{tx.transactionNumber}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(tx.date, "d MMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{tx.category}</Badge>
                    </TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell>{formatRupiah(Number(tx.amount))}</TableCell>
                    <TableCell>
                      {tx.receiptUrl ? (
                        <a
                          href={`/api/files/${tx.receiptUrl}`}
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <ExpenseFormDialog
                          expense={{
                            id: tx.id,
                            date: tx.date,
                            category: tx.category,
                            description: tx.description,
                            amount: Number(tx.amount),
                            isPublic: tx.isPublic,
                          }}
                        />
                        <ConfirmDeleteButton
                          itemLabel={`Pengeluaran ${tx.transactionNumber}`}
                          onConfirm={deleteExpenseTransaction.bind(null, tx.id)}
                        />
                      </div>
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
