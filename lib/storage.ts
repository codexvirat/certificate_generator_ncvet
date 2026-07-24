import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Local disk storage under <project root>/uploads, served back out by
// app/uploads/[...path]/route.ts. Swap this module out if a future deploy
// needs S3/Cloudinary/etc -- callers only depend on the uploadBuffer shape.
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function detectExtension(buffer: Buffer): string {
  if (buffer.subarray(0, 4).toString("hex") === "25504446") return "pdf"; // %PDF
  if (buffer.subarray(0, 3).toString("hex") === "ffd8ff") return "jpg";
  if (buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "png";
  if (buffer.subarray(0, 2).toString("ascii") === "PK") return "xlsx"; // zip-based (xlsx)
  return "bin";
}

function baseUrl(): string {
  const url = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export async function uploadBuffer(
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<{ url: string; publicId: string }> {
  const ext = detectExtension(buffer);
  const safeId = (publicId ?? crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${safeId}-${Date.now()}.${ext}`;
  const relativePath = `${folder}/${filename}`;

  await mkdir(path.join(UPLOAD_ROOT, folder), { recursive: true });
  await writeFile(path.join(UPLOAD_ROOT, relativePath), buffer);

  return { url: `${baseUrl()}/uploads/${relativePath}`, publicId: relativePath };
}
