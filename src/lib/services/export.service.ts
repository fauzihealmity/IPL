import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";

export interface ExportColumn<T> {
  key: keyof T | string;
  label: string;
  /** Optional formatter — defaults to String(value ?? ""). */
  format?: (row: T) => string;
  width?: number; // used by the PDF table renderer only
}

function getCellValue<T>(row: T, column: ExportColumn<T>): string {
  if (column.format) return column.format(row);
  const value = (row as Record<string, unknown>)[column.key as string];
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Escapes a field for RFC 4180 CSV — wraps in quotes if it contains
 * a comma, quote, or newline, and doubles internal quotes. */
function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCSV<T>(columns: ExportColumn<T>[], rows: T[]): string {
  const header = columns.map((c) => csvEscape(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => csvEscape(getCellValue(row, c))).join(","));
  // Prepend a UTF-8 BOM so Excel opens Indonesian characters correctly.
  return "\uFEFF" + [header, ...lines].join("\r\n");
}

export function rowsToExcelBuffer<T>(columns: ExportColumn<T>[], rows: T[], sheetName: string): Buffer {
  const data = rows.map((row) => {
    const obj: Record<string, string> = {};
    for (const c of columns) obj[c.label] = getCellValue(row, c);
    return obj;
  });
  const worksheet = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.label) });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/**
 * Minimal table-in-a-PDF renderer for report exports (spec §36). Not
 * meant for pixel-perfect design — the browser's native Print (on the
 * on-screen report) covers polished "Print" output; this covers
 *"download a PDF of this report" for offline recordkeeping.
 */
export async function tableToPdfBuffer<T>(
  title: string,
  columns: ExportColumn<T>[],
  rows: T[]
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40, layout: "landscape" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<void>((resolve) => doc.on("end", () => resolve()));

  doc.fontSize(14).font("Helvetica-Bold").text("MUTIARA CAHAYA RESIDENCE", { align: "center" });
  doc.fontSize(11).font("Helvetica").text(title, { align: "center" });
  doc.moveDown(1);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = pageWidth / columns.length;
  const rowHeight = 20;

  function drawHeader() {
    doc.font("Helvetica-Bold").fontSize(9);
    const y = doc.y;
    columns.forEach((c, i) => {
      doc.text(c.label, doc.page.margins.left + i * colWidth, y, { width: colWidth - 4 });
    });
    doc.moveDown(1);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(0.3);
  }

  drawHeader();
  doc.font("Helvetica").fontSize(8);

  for (const row of rows) {
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawHeader();
      doc.font("Helvetica").fontSize(8);
    }
    const y = doc.y;
    columns.forEach((c, i) => {
      doc.text(getCellValue(row, c), doc.page.margins.left + i * colWidth, y, { width: colWidth - 4 });
    });
    doc.moveDown(1);
  }

  doc.end();
  await done;
  return Buffer.concat(chunks);
}
