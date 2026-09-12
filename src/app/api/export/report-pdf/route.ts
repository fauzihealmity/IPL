import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { requireAdmin, ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import { getInvoiceReport, getPaymentReport } from "@/actions/report.actions";
import { listArrears } from "@/actions/invoice.actions";
import { getFinanceSummary } from "@/actions/finance.actions";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const now = new Date();
    const periodMonth = Number(url.searchParams.get("month") ?? now.getMonth() + 1);
    const periodYear = Number(url.searchParams.get("year") ?? now.getFullYear());

    const [invoiceReport, paymentReport, arrears, finance] = await Promise.all([
      getInvoiceReport(periodMonth, periodYear),
      getPaymentReport(),
      listArrears(),
      getFinanceSummary(periodMonth, periodYear),
    ]);

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    const done = new Promise<void>((resolve) => doc.on("end", () => resolve()));

    doc.fontSize(16).font("Helvetica-Bold").text("MUTIARA CAHAYA RESIDENCE", { align: "center" });
    doc.fontSize(12).font("Helvetica").text(`Laporan Bulanan — ${periodMonth}/${periodYear}`, { align: "center" });
    doc.moveDown(1.5);

    function section(title: string) {
      doc.fontSize(13).font("Helvetica-Bold").text(title);
      doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica");
    }

    function row(label: string, value: string) {
      doc.font("Helvetica").text(label, { continued: true, width: 220 });
      doc.font("Helvetica-Bold").text(value);
    }

    section("Laporan Tagihan");
    row("Total Tagihan", `${invoiceReport.totalCount} tagihan — ${formatRupiah(invoiceReport.totalAmount)}`);
    row("Sudah Lunas", `${invoiceReport.paidCount} tagihan — ${formatRupiah(invoiceReport.paidAmount)}`);
    row("Belum Lunas", `${invoiceReport.unpaidCount} tagihan — ${formatRupiah(invoiceReport.unpaidAmount)}`);
    row("Terlambat", `${invoiceReport.overdueCount} tagihan — ${formatRupiah(invoiceReport.overdueAmount)}`);
    doc.moveDown(1.2);

    section("Laporan Pembayaran (Seluruh Waktu)");
    row("Jumlah Transaksi Terverifikasi", String(paymentReport.totalCount));
    row("Total Pembayaran", formatRupiah(paymentReport.totalAmount));
    for (const m of paymentReport.byMethod) {
      row(`  Metode: ${m.method}`, `${m.count} transaksi — ${formatRupiah(m.amount)}`);
    }
    doc.moveDown(1.2);

    section("Laporan Tunggakan");
    row("Jumlah Tagihan Tertunggak", String(arrears.rows.length));
    row("Total Tunggakan", formatRupiah(arrears.totalOutstanding));
    row("1 Bulan", formatRupiah(arrears.byBucket["1_BULAN"]));
    row("2 Bulan", formatRupiah(arrears.byBucket["2_BULAN"]));
    row("3-5 Bulan", formatRupiah(arrears.byBucket["3_5_BULAN"]));
    row("> 5 Bulan", formatRupiah(arrears.byBucket.LEBIH_5_BULAN));
    doc.moveDown(1.2);

    section("Laporan Keuangan");
    row("Saldo Awal", formatRupiah(finance.openingBalance));
    row("Pemasukan Periode Ini", formatRupiah(finance.income));
    row("Pengeluaran Periode Ini", formatRupiah(finance.expense));
    row("Saldo Akhir", formatRupiah(finance.closingBalance));

    doc.moveDown(2);
    doc
      .fontSize(8)
      .fillColor("gray")
      .text(`Dihasilkan otomatis pada ${new Date().toLocaleString("id-ID")}`, { align: "center" });

    doc.end();
    await done;
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="laporan-${periodMonth}-${periodYear}.pdf"`,
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
    console.error("[REPORT_PDF_ERROR]", err);
    return NextResponse.json({ success: false, message: "Gagal membuat laporan PDF." }, { status: 500 });
  }
}
