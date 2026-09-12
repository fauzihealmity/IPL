import PDFDocument from "pdfkit";
import { uploadGeneratedFile } from "@/lib/services/file-upload.service";

export interface ReceiptPdfData {
  receiptNumber: string;
  invoiceNumber: string;
  houseLabel: string;
  residentName: string;
  periodMonth: number;
  periodYear: number;
  iplAmount: number;
  additionalFee: number;
  penalty: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  paidAt: Date;
  issuedAt: Date;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Renders a simple receipt PDF and uploads it to Supabase Storage,
 * returning the storage path used by the file-serving route. Kept
 * intentionally plain (no logo/letterhead) for Phase 4 — visual
 * polish can be layered on later without touching the
 * payment-verification logic that calls this.
 */
export async function generateReceiptPdf(data: ReceiptPdfData): Promise<string> {
  const fileName = `${data.receiptNumber.replace(/\//g, "-")}.pdf`;

  const doc = new PDFDocument({ size: "A5", margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const done = new Promise<void>((resolve) => doc.on("end", () => resolve()));

  doc.fontSize(16).font("Helvetica-Bold").text("MUTIARA CAHAYA RESIDENCE", { align: "center" });
  doc.fontSize(10).font("Helvetica").text("Kwitansi Pembayaran IPL", { align: "center" });
  doc.moveDown(1.5);

  doc.fontSize(10);
  const row = (label: string, value: string) => {
    doc.font("Helvetica").text(label, { continued: true, width: 150 });
    doc.font("Helvetica-Bold").text(value);
  };

  row("No. Kwitansi", data.receiptNumber);
  row("No. Tagihan", data.invoiceNumber);
  row("Rumah", data.houseLabel);
  row("Nama Warga", data.residentName);
  row("Periode IPL", `${data.periodMonth}/${data.periodYear}`);
  row("Metode Pembayaran", data.paymentMethod);
  row("Tanggal Bayar", data.paidAt.toLocaleDateString("id-ID"));
  row("Tanggal Terbit", data.issuedAt.toLocaleDateString("id-ID"));

  doc.moveDown(1);
  doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
  doc.moveDown(0.5);

  row("IPL", formatRupiah(data.iplAmount));
  row("Biaya Tambahan", formatRupiah(data.additionalFee));
  row("Denda", formatRupiah(data.penalty));
  row("Diskon", `- ${formatRupiah(data.discount)}`);

  doc.moveDown(0.5);
  doc.fontSize(12).font("Helvetica-Bold").text(`Total Dibayar: ${formatRupiah(data.totalAmount)}`);

  doc.moveDown(2);
  doc.fontSize(9).font("Helvetica").fillColor("gray").text(
    "Kwitansi ini dihasilkan otomatis oleh sistem dan sah tanpa tanda tangan basah.",
    { align: "center" }
  );

  doc.end();
  await done;

  const buffer = Buffer.concat(chunks);
  return uploadGeneratedFile(buffer, "receipts", fileName, "application/pdf");
}
