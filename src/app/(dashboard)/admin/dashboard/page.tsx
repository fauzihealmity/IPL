import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceStatus, ComplaintStatus } from "@prisma/client";
import { Home, Users, FileText, CheckCircle2, XCircle, AlertTriangle, TrendingUp, TrendingDown, Wallet, MessageSquareWarning } from "lucide-react";

// Every figure below is a live aggregate from the database — none of
// it is hardcoded. Billing/finance modules land in Phase 3–5, so
// those cards will correctly read 0 until invoices/transactions exist.
export default async function AdminDashboardPage() {
  const now = new Date();
  const periodMonth = now.getMonth() + 1;
  const periodYear = now.getFullYear();

  const [
    totalHouses,
    totalResidents,
    invoicesThisPeriod,
    paidThisPeriod,
    unpaidThisPeriod,
    arrearsCount,
    incomeAgg,
    expenseAgg,
    newComplaints,
  ] = await prisma.$transaction([
    prisma.house.count(),
    prisma.resident.count(),
    prisma.invoice.count({ where: { periodMonth, periodYear } }),
    prisma.invoice.count({ where: { periodMonth, periodYear, status: InvoiceStatus.PAID } }),
    prisma.invoice.count({
      where: { periodMonth, periodYear, status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE] } },
    }),
    prisma.invoice.count({
      where: { status: { not: InvoiceStatus.PAID }, dueDate: { lt: now } },
    }),
    prisma.incomeTransaction.aggregate({ _sum: { amount: true } }),
    prisma.expenseTransaction.aggregate({ _sum: { amount: true } }),
    prisma.complaint.count({ where: { status: ComplaintStatus.NEW } }),
  ]);

  const totalIncome = Number(incomeAgg._sum.amount ?? 0);
  const totalExpense = Number(expenseAgg._sum.amount ?? 0);
  const balance = totalIncome - totalExpense;
  const collectionRate =
    invoicesThisPeriod > 0 ? Math.round((paidThisPeriod / invoicesThisPeriod) * 100) : 0;

  const cards = [
    { label: "Total Rumah", value: totalHouses, icon: Home },
    { label: "Total Warga", value: totalResidents, icon: Users },
    { label: "Tagihan Bulan Ini", value: invoicesThisPeriod, icon: FileText },
    { label: "Sudah Dibayar", value: paidThisPeriod, icon: CheckCircle2 },
    { label: "Belum Dibayar", value: unpaidThisPeriod, icon: XCircle },
    { label: "Tunggakan", value: arrearsCount, icon: AlertTriangle },
    { label: "Pemasukan", value: formatRupiah(totalIncome), icon: TrendingUp },
    { label: "Pengeluaran", value: formatRupiah(totalExpense), icon: TrendingDown },
    { label: "Saldo", value: formatRupiah(balance), icon: Wallet },
    { label: "Pengaduan Baru", value: newComplaints, icon: MessageSquareWarning },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Admin</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan operasional Mutiara Cahaya Residence — periode {periodMonth}/{periodYear}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{card.label}</CardDescription>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Collection Rate</CardTitle>
          <CardDescription>
            Persentase tagihan periode berjalan yang sudah lunas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">{collectionRate}%</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {paidThisPeriod} dari {invoicesThisPeriod} tagihan bulan ini sudah dibayar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
