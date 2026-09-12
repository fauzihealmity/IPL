import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import { getSignedFileUrl } from "@/lib/services/file-upload.service";
import { UserRole } from "@prisma/client";

// Files (payment proofs, receipt PDFs) live in a private Supabase
// Storage bucket and are only reachable through this authenticated
// route — never a public/static URL. Residents can only fetch files
// tied to their own records; admins can fetch anything (spec §39).
// After the ownership check below passes, this route redirects to a
// short-lived signed URL rather than proxying file bytes itself —
// the check is still the gate; the signed URL is just the delivery
// mechanism, and it expires in 60 seconds either way.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const session = await requireAuth();
    const { path } = await params;
    const relativePath = path.join("/");

    if (relativePath.includes("..")) {
      return NextResponse.json({ success: false, message: "Path tidak valid." }, { status: 400 });
    }

    const isAdmin = session.user.role === UserRole.ADMIN || session.user.role === UserRole.SUPER_ADMIN;

    if (relativePath.startsWith("payment-proofs/")) {
      const proof = await prisma.paymentProof.findFirst({
        where: { fileUrl: relativePath },
        include: { payment: true },
      });
      if (!proof) return NextResponse.json({ success: false, message: "Berkas tidak ditemukan." }, { status: 404 });
      if (!isAdmin && proof.payment.residentId !== session.user.residentId) {
        throw new ForbiddenError("Anda tidak memiliki akses ke berkas ini.");
      }
    } else if (relativePath.startsWith("receipts/")) {
      const receipt = await prisma.receipt.findFirst({
        where: { pdfUrl: relativePath },
        include: { payment: true },
      });
      if (!receipt) return NextResponse.json({ success: false, message: "Berkas tidak ditemukan." }, { status: 404 });
      if (!isAdmin && receipt.payment.residentId !== session.user.residentId) {
        throw new ForbiddenError("Anda tidak memiliki akses ke berkas ini.");
      }
    } else if (relativePath.startsWith("expense-receipts/")) {
      // Expense receipts are internal financial documents (vendor
      // invoices, etc.) — admin-only, never resident-visible, even
      // though the aggregate expense category is shown publicly on
      // the transparency page.
      if (!isAdmin) {
        throw new ForbiddenError("Anda tidak memiliki akses ke berkas ini.");
      }
    } else if (relativePath.startsWith("complaint-photos/")) {
      const update = await prisma.complaintUpdate.findFirst({
        where: { photoUrl: relativePath },
        include: { complaint: true },
      });
      if (!update) return NextResponse.json({ success: false, message: "Berkas tidak ditemukan." }, { status: 404 });
      if (!isAdmin && update.complaint.residentId !== session.user.residentId) {
        throw new ForbiddenError("Anda tidak memiliki akses ke berkas ini.");
      }
    } else if (relativePath.startsWith("announcements/")) {
      // Announcement images/attachments are broadly visible to any
      // authenticated user (admin or resident) — they're posters/
      // attachments meant for wide distribution, not personal
      // documents, so no per-record ownership check is needed here
      // beyond "must be logged in".
    } else {
      return NextResponse.json({ success: false, message: "Berkas tidak ditemukan." }, { status: 404 });
    }

    const signedUrl = await getSignedFileUrl(relativePath);
    return NextResponse.redirect(signedUrl);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }
    // eslint-disable-next-line no-console
    console.error("[FILE_SERVE_ERROR]", err);
    return NextResponse.json({ success: false, message: "Berkas tidak ditemukan." }, { status: 404 });
  }
}
