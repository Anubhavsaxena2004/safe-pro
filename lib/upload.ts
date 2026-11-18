import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

const MAX_BYTES = 4 * 1024 * 1024;

export function blobAccess(): "public" | "private" {
  return process.env.BLOB_ACCESS === "public" ? "public" : "private";
}

/**
 * Stores an uploaded image and returns its URL.
 * - With BLOB_READ_WRITE_TOKEN (Vercel Blob connected): uploads to Vercel Blob.
 * - Without it (local dev): returns a data: URL that is stored in the database.
 */
export async function saveImage(file: FormDataEntryValue | null, folder: string): Promise<string> {
  if (!(file instanceof File) || file.size === 0) throw new Error("Please choose a photo.");
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded.");
  if (file.size > MAX_BYTES) throw new Error("That photo is too large (max 4 MB).");

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const blob = await put(`${folder}/${randomUUID()}.${ext}`, file, {
      access: blobAccess(),
      contentType: file.type,
    });
    return blob.url;
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${bytes.toString("base64")}`;
}

/** URL to use in <img src>. Blob files are served through the access-checked /api/file route. */
export function fileSrc(url: string, extra?: Record<string, string>) {
  if (url.startsWith("data:")) return url;
  const params = new URLSearchParams({ u: url, ...extra });
  return `/api/file?${params.toString()}`;
}
