import { randomUUID } from "crypto";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

// spec §38: allowed types, 5MB limit, validate extension + MIME + size,
// never use the original filename as the storage path.
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "application/pdf"]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".pdf"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export class FileValidationError extends Error {}

export interface StoredFile {
  fileUrl: string; // storage path used to retrieve it via the file-serving route
  fileName: string; // original filename, kept only for display
  fileType: string;
  fileSize: number;
}

function getExtension(fileName: string): string {
  const match = /\.[^.]+$/.exec(fileName);
  return match ? match[0].toLowerCase() : "";
}

/**
 * Validates and uploads a file to Supabase Storage, under a subfolder
 * (e.g. "payment-proofs"), using a random filename — never the
 * client-supplied name (path traversal / overwrite prevention).
 *
 * Files live in a private Storage bucket (not publicly listable/
 * readable) and are only reachable through the authenticated
 * file-serving route, which checks ownership before generating a
 * short-lived signed URL. Using cloud storage rather than local disk
 * is required for serverless hosting (e.g. Vercel), where the
 * filesystem is read-only/ephemeral in production.
 */
export async function saveUploadedFile(file: File, subfolder: string): Promise<StoredFile> {
  if (file.size <= 0) {
    throw new FileValidationError("File kosong.");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new FileValidationError("Ukuran file maksimal 5MB.");
  }

  const extension = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new FileValidationError("Format file harus JPG, PNG, atau PDF.");
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new FileValidationError("Tipe file tidak valid.");
  }

  const uniqueName = `${randomUUID()}${extension}`;
  const storagePath = `${subfolder}/${uniqueName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false, // random filename should never collide; a collision means something is wrong
  });

  if (error) {
    throw new Error(`Gagal mengunggah file ke storage: ${error.message}`);
  }

  return {
    fileUrl: storagePath,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  };
}

/**
 * Uploads a server-generated buffer (e.g. a rendered PDF) directly,
 * bypassing the client-upload validation above since there's no
 * untrusted user input involved — used by receipt/report generation.
 */
export async function uploadGeneratedFile(
  buffer: Buffer,
  subfolder: string,
  fileName: string,
  contentType: string
): Promise<string> {
  const storagePath = `${subfolder}/${fileName}`;
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true, // receipt filenames are derived from receiptNumber, which is unique but
    // regenerating the same receipt (e.g. after a rendering failure) should overwrite, not fail
  });

  if (error) {
    throw new Error(`Gagal mengunggah file ke storage: ${error.message}`);
  }

  return storagePath;
}

/**
 * Generates a short-lived signed URL for a private Storage object.
 * The file-serving route calls this only AFTER its own ownership
 * check has passed — the signed URL itself is the last step, not a
 * substitute for that check.
 */
export async function getSignedFileUrl(storagePath: string, expiresInSeconds = 60): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data) {
    throw new Error(`Gagal membuat tautan file: ${error?.message ?? "unknown error"}`);
  }

  return data.signedUrl;
}
