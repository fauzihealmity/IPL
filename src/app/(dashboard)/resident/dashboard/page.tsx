import { requireResident } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/ui/button";
import { InvoiceStatus, ComplaintStatus } from "@prisma/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";

export default async function ResidentDashboardPage() {
  const session = await requireResident();
  const residentId = session.user.residentId;

  const now = new Date();
  const periodMonth = now.getMonth() + 1;
  const periodYear = now.getFullYear();

  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    include: { house: { include: { block: true } } },
  });

  // Ownership is enforced by scoping every query to residentId from the
  // session — never by trusting an ID passed from the client.
  const currentInvoice = await prisma.invoice.findFirst({
    where: { residentId, periodMonth, periodYear },
  });

  const arrears = await prisma.invoice.aggregate({
    where: {
      residentId,
      status: { not: InvoiceStatus.PAID },
      dueDate: { lt: now },
    },
    _sum: { totalAmount: true },
    _count: true,
  });

  const lastPayment = await prisma.payment.findFirst({
    where: { residentId, status: "VERIFIED" },
    orderBy: { paidAt: "desc" },
  });

  const activeComplaints = await prisma.complaint.count({
    where: {
      residentId,
      status: { in: [ComplaintStatus.NEW, ComplaintStatus.IN_PROGRESS, ComplaintStatus.FOLLOW_UP] },
    },
  });

  const latestAnnouncement = await prisma.announcement.findFirst({
    where: { publishAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
    orderBy: { publishAt: "desc" },
  });

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold">Halo, {session.user.name}</h1>
        <p className="text-sm text-muted-foreground">
          Rumah {resident?.house.block.name}-{resident?.house.houseNumber}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>IPL Bulan Ini</CardTitle>
        </CardHeader>
        <CardContent>
          {currentInvoice ? (
            <>
              <div className="text-2xl font-bold">{formatRupiah(Number(currentInvoice.totalAmount))}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Jatuh tempo {format(currentInvoice.dueDate, "d MMMM yyyy", { locale: id })}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <StatusBadge status={currentInvoice.status} />
                {currentInvoice.status !== InvoiceStatus.PAID && (
                  <Button asChild size="sm">
                    <Link href="/resident/payments">Bayar Sekarang</Link>
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tagihan IPL bulan ini belum diterbitkan oleh admin.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tunggakan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatRupiah(Number(arrears._sum.totalAmount ?? 0))}
            </div>
            <p className="text-xs text-muted-foreground">{arrears._count} tagihan tertunggak</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pembayaran Terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            {lastPayment ? (
              <>
                <div className="text-lg font-bold">{formatRupiah(Number(lastPayment.amount))}</div>
                <p className="text-xs text-muted-foreground">
                  {format(lastPayment.paidAt, "d MMMM yyyy", { locale: id })}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada riwayat pembayaran.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pengaduan Aktif</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{activeComplaints}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pengumuman Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {latestAnnouncement ? (
            <>
              <p className="font-medium">{latestAnnouncement.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {latestAnnouncement.content}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada pengumuman.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type StatusVariant = "success" | "warning" | "destructive" | "secondary";

const INVOICE_STATUS_MAP = {
  PAID: { label: "LUNAS", variant: "success" },
  UNPAID: { label: "BELUM LUNAS", variant: "warning" },
  PENDING_VERIFICATION: { label: "MENUNGGU VERIFIKASI", variant: "secondary" },
  OVERDUE: { label: "TERLAMBAT", variant: "destructive" },
  CANCELLED: { label: "DIBATALKAN", variant: "secondary" },
} as const satisfies Record<InvoiceStatus, { label: string; variant: StatusVariant }>;

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, variant } = INVOICE_STATUS_MAP[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
