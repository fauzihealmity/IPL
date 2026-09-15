import { requireResident } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/ui/button";
import { AdvertisementCarousel } from "@/components/advertisements/advertisement-carousel";
import { InvoiceStatus, ComplaintStatus } from "@prisma/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  FileText,
  Megaphone,
  MessageSquareWarning,
  ReceiptText,
  WalletCards,
} from "lucide-react";

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
      status: {
        in: [
          ComplaintStatus.NEW,
          ComplaintStatus.IN_PROGRESS,
          ComplaintStatus.FOLLOW_UP,
        ],
      },
    },
  });

  const latestAnnouncement = await prisma.announcement.findFirst({
    where: {
      publishAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    },
    orderBy: { publishAt: "desc" },
  });

  const activeAdvertisements = await prisma.advertisement.findMany({
    where: {
      isActive: true,
      AND: [
        {
          OR: [{ startAt: null }, { startAt: { lte: now } }],
        },
        {
          OR: [{ endAt: null }, { endAt: { gte: now } }],
        },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 5,
  });

  const residentName = session.user.name ?? "Warga";
  const houseName = resident
    ? `${resident.house.block.name}-${resident.house.houseNumber}`
    : "-";

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      {/* Welcome */}
      <section className="space-y-1">
        <p className="text-sm font-medium text-primary">
          Portal Warga
        </p>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Halo, {residentName} 👋
        </h1>

        <p className="text-sm text-muted-foreground">
          Rumah {houseName}
        </p>
      </section>

      {/* Advertisement */}
      {activeAdvertisements.length > 0 && (
        <section>
          <AdvertisementCarousel
            advertisements={activeAdvertisements.map((ad) => ({
              id: ad.id,
              title: ad.title,
              description: ad.description,
              imageUrl: ad.imageUrl,
              targetUrl: ad.targetUrl,
            }))}
          />
        </section>
      )}

      {/* Current IPL */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Tagihan Anda
            </p>
            <h2 className="text-xl font-bold tracking-tight">
              IPL Bulan Ini
            </h2>
          </div>

          <WalletCards className="h-6 w-6 text-primary" />
        </div>

        <Card className="overflow-hidden border-primary/10 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            {currentInvoice ? (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Periode {formatPeriod(periodMonth, periodYear)}
                    </p>

                    <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                      {formatRupiah(Number(currentInvoice.totalAmount))}
                    </p>
                  </div>

                  <StatusBadge status={currentInvoice.status} />
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />

                  <span>
                    Jatuh tempo{" "}
                    {format(currentInvoice.dueDate, "d MMMM yyyy", {
                      locale: id,
                    })}
                  </span>
                </div>

                {currentInvoice.status !== InvoiceStatus.PAID && (
                  <Button asChild className="w-full sm:w-auto">
                    <Link href="/resident/payments">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Bayar Sekarang
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}

                {currentInvoice.status === InvoiceStatus.PAID && (
                  <div className="rounded-lg bg-primary/5 px-4 py-3 text-sm text-primary">
                    Pembayaran IPL bulan ini sudah diterima. Terima kasih
                    atas ketepatan waktu Anda.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>

                <div>
                  <p className="font-medium">
                    Tagihan belum tersedia
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Tagihan IPL bulan ini belum diterbitkan oleh admin.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Summary */}
      <section className="space-y-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Ringkasan
          </p>
          <h2 className="text-xl font-bold tracking-tight">
            Informasi Pembayaran
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            icon={<ReceiptText className="h-5 w-5" />}
            title="Total Tunggakan"
            value={formatRupiah(Number(arrears._sum.totalAmount ?? 0))}
            description={`${arrears._count} tagihan tertunggak`}
          />

          <SummaryCard
            icon={<CreditCard className="h-5 w-5" />}
            title="Pembayaran Terakhir"
            value={
              lastPayment
                ? formatRupiah(Number(lastPayment.amount))
                : "-"
            }
            description={
              lastPayment
                ? format(lastPayment.paidAt, "d MMMM yyyy", {
                    locale: id,
                  })
                : "Belum ada riwayat pembayaran"
            }
          />

          <SummaryCard
            icon={<MessageSquareWarning className="h-5 w-5" />}
            title="Pengaduan Aktif"
            value={String(activeComplaints)}
            description={
              activeComplaints === 0
                ? "Tidak ada pengaduan aktif"
                : "Pengaduan sedang diproses"
            }
          />
        </div>
      </section>

      {/* Quick Access */}
      <section className="space-y-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Menu
          </p>
          <h2 className="text-xl font-bold tracking-tight">
            Akses Cepat
          </h2>
        </div>

        <Card className="border-0 bg-muted/40 shadow-none">
          <CardContent className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4">
            <QuickAction
              icon={<CreditCard className="h-5 w-5" />}
              label="Pembayaran"
              href="/resident/payments"
            />

            <QuickAction
              icon={<FileText className="h-5 w-5" />}
              label="Tagihan"
              href="/resident/invoices"
            />

            <QuickAction
              icon={<ReceiptText className="h-5 w-5" />}
              label="Kwitansi"
              href="/resident/receipts"
            />

            <QuickAction
              icon={<MessageSquareWarning className="h-5 w-5" />}
              label="Pengaduan"
              href="/resident/complaints"
            />
          </CardContent>
        </Card>
      </section>

      {/* Latest Announcement */}
      <section>
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>

              <div>
                <CardTitle className="text-lg">
                  Pengumuman Terbaru
                </CardTitle>

                <CardDescription>
                  Informasi terbaru dari pengelola
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            {latestAnnouncement ? (
              <div>
                <p className="font-semibold">
                  {latestAnnouncement.title}
                </p>

                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {latestAnnouncement.content}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Megaphone className="h-5 w-5" />
                <span>Belum ada pengumuman.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

type SummaryCardProps = {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
};

function SummaryCard({
  icon,
  title,
  value,
  description,
}: SummaryCardProps) {
  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            {icon}
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {title}
        </p>

        <p className="mt-1 text-xl font-bold tracking-tight">
          {value}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

type QuickActionProps = {
  icon: React.ReactNode;
  label: string;
  href: string;
};

function QuickAction({ icon, label, href }: QuickActionProps) {
  return (
    <Button
      asChild
      variant="ghost"
      className="h-auto min-h-24 flex-col gap-2 rounded-xl bg-background px-3 py-4 shadow-sm transition hover:bg-background hover:shadow-md"
    >
      <Link href={href}>
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          {icon}
        </span>

        <span className="text-xs font-medium sm:text-sm">
          {label}
        </span>
      </Link>
    </Button>
  );
}

type StatusVariant =
  | "success"
  | "warning"
  | "destructive"
  | "secondary";

const INVOICE_STATUS_MAP = {
  PAID: { label: "LUNAS", variant: "success" },
  UNPAID: { label: "BELUM LUNAS", variant: "warning" },
  PENDING_VERIFICATION: {
    label: "MENUNGGU VERIFIKASI",
    variant: "secondary",
  },
  OVERDUE: { label: "TERLAMBAT", variant: "destructive" },
  CANCELLED: { label: "DIBATALKAN", variant: "secondary" },
} as const satisfies Record<
  InvoiceStatus,
  { label: string; variant: StatusVariant }
>;

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

function formatPeriod(month: number, year: number) {
  return format(new Date(year, month - 1, 1), "MMMM yyyy", {
    locale: id,
  });
}