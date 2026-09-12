import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import { rowsToCSV, rowsToExcelBuffer, type ExportColumn } from "@/lib/services/export.service";
import { listArrears } from "@/actions/invoice.actions";

// Safety cap — this is a CSV/Excel export, not a paginated API; large
// datasets should be filtered by date range in a future iteration
// rather than exported unbounded.
const EXPORT_ROW_LIMIT = 5000;

const RESOURCES = ["houses", "residents", "invoices", "payments", "arrears", "income", "expense"] as const;
type Resource = (typeof RESOURCES)[number];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

async function buildDataset(resource: Resource) {
  switch (resource) {
    case "houses": {
      const rows = await prisma.house.findMany({
        include: { block: true, _count: { select: { residents: true } } },
        orderBy: [{ block: { name: "asc" } }, { houseNumber: "asc" }],
        take: EXPORT_ROW_LIMIT,
      });
      const columns: ExportColumn<(typeof rows)[number]>[] = [
        { key: "block", label: "Blok", format: (r) => r.block.name },
        { key: "houseNumber", label: "No. Rumah" },
        { key: "propertyType", label: "Tipe" },
        { key: "status", label: "Status" },
        { key: "residents", label: "Jumlah Warga", format: (r) => String(r._count.residents) },
      ];
      return { rows, columns, sheetName: "Data Rumah" };
    }
    case "residents": {
      const rows = await prisma.resident.findMany({
        include: { house: { include: { block: true } } },
        orderBy: { fullName: "asc" },
        take: EXPORT_ROW_LIMIT,
      });
      const columns: ExportColumn<(typeof rows)[number]>[] = [
        { key: "fullName", label: "Nama" },
        { key: "house", label: "Rumah", format: (r) => `${r.house.block.name}-${r.house.houseNumber}` },
        { key: "phone", label: "Telepon", format: (r) => r.phone ?? "" },
        { key: "email", label: "Email", format: (r) => r.email ?? "" },
      ];
      return { rows, columns, sheetName: "Data Warga" };
    }
    case "invoices": {
      const rows = await prisma.invoice.findMany({
        include: { house: { include: { block: true } }, resident: true },
        orderBy: { createdAt: "desc" },
        take: EXPORT_ROW_LIMIT,
      });
      const columns: ExportColumn<(typeof rows)[number]>[] = [
        { key: "invoiceNumber", label: "No. Tagihan" },
        { key: "house", label: "Rumah", format: (r) => `${r.house.block.name}-${r.house.houseNumber}` },
        { key: "resident", label: "Warga", format: (r) => r.resident?.fullName ?? "" },
        { key: "period", label: "Periode", format: (r) => `${r.periodMonth}/${r.periodYear}` },
        { key: "totalAmount", label: "Total", format: (r) => formatRupiah(Number(r.totalAmount)) },
        { key: "dueDate", label: "Jatuh Tempo", format: (r) => r.dueDate.toLocaleDateString("id-ID") },
        { key: "status", label: "Status" },
      ];
      return { rows, columns, sheetName: "Tagihan" };
    }
    case "payments": {
      const rows = await prisma.payment.findMany({
        include: { invoice: { include: { house: { include: { block: true } } } }, resident: true },
        orderBy: { createdAt: "desc" },
        take: EXPORT_ROW_LIMIT,
      });
      const columns: ExportColumn<(typeof rows)[number]>[] = [
        { key: "paymentNumber", label: "No. Pembayaran" },
        {
          key: "house",
          label: "Rumah",
          format: (r) => `${r.invoice.house.block.name}-${r.invoice.house.houseNumber}`,
        },
        { key: "resident", label: "Warga", format: (r) => r.resident?.fullName ?? "" },
        { key: "amount", label: "Nominal", format: (r) => formatRupiah(Number(r.amount)) },
        { key: "method", label: "Metode" },
        { key: "paidAt", label: "Tanggal Bayar", format: (r) => r.paidAt.toLocaleDateString("id-ID") },
        { key: "status", label: "Status" },
      ];
      return { rows, columns, sheetName: "Pembayaran" };
    }
    case "arrears": {
      const { rows } = await listArrears();
      const columns: ExportColumn<(typeof rows)[number]>[] = [
        { key: "houseLabel", label: "Rumah" },
        { key: "residentName", label: "Warga", format: (r) => r.residentName ?? "" },
        { key: "dueDate", label: "Jatuh Tempo", format: (r) => r.dueDate.toLocaleDateString("id-ID") },
        { key: "monthsOverdue", label: "Bulan Tertunggak", format: (r) => String(r.monthsOverdue) },
        { key: "totalAmount", label: "Nominal", format: (r) => formatRupiah(r.totalAmount) },
      ];
      return { rows, columns, sheetName: "Tunggakan" };
    }
    case "income": {
      const rows = await prisma.incomeTransaction.findMany({
        orderBy: { date: "desc" },
        take: EXPORT_ROW_LIMIT,
      });
      const columns: ExportColumn<(typeof rows)[number]>[] = [
        { key: "transactionNumber", label: "No. Transaksi" },
        { key: "date", label: "Tanggal", format: (r) => r.date.toLocaleDateString("id-ID") },
        { key: "description", label: "Deskripsi" },
        { key: "amount", label: "Nominal", format: (r) => formatRupiah(Number(r.amount)) },
      ];
      return { rows, columns, sheetName: "Pemasukan" };
    }
    case "expense": {
      const rows = await prisma.expenseTransaction.findMany({
        orderBy: { date: "desc" },
        take: EXPORT_ROW_LIMIT,
      });
      const columns: ExportColumn<(typeof rows)[number]>[] = [
        { key: "transactionNumber", label: "No. Transaksi" },
        { key: "date", label: "Tanggal", format: (r) => r.date.toLocaleDateString("id-ID") },
        { key: "category", label: "Kategori" },
        { key: "description", label: "Deskripsi" },
        { key: "amount", label: "Nominal", format: (r) => formatRupiah(Number(r.amount)) },
      ];
      return { rows, columns, sheetName: "Pengeluaran" };
    }
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  try {
    await requireAdmin();

    const { resource: resourceParam } = await params;
    const resource = resourceParam as Resource;
    if (!RESOURCES.includes(resource)) {
      return NextResponse.json({ success: false, message: "Jenis data tidak dikenal." }, { status: 400 });
    }

    const url = new URL(req.url);
    const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

    const dataset = await buildDataset(resource);
    if (!dataset) {
      return NextResponse.json({ success: false, message: "Jenis data tidak dikenal." }, { status: 400 });
    }
    const { rows, columns, sheetName } = dataset;

    if (format === "xlsx") {
      const buffer = rowsToExcelBuffer(
        columns as ExportColumn<Record<string, unknown>>[],
        rows as Record<string, unknown>[],
        sheetName
      );

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${resource}.xlsx"`,
      },
    });
  }

  const csv = rowsToCSV(
    columns as ExportColumn<Record<string, unknown>>[],
    rows as Record<string, unknown>[]
  );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${resource}.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }
    // eslint-disable-next-line no-console
    console.error("[EXPORT_ERROR]", err);
    return NextResponse.json({ success: false, message: "Gagal membuat file export." }, { status: 500 });
  }
}
