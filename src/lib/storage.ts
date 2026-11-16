import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Local-disk storage for development. For production, replace saveUpload/readUpload/removeUpload
// with an S3-compatible implementation (same signatures) and keep the DB columns unchanged.

const ROOT = path.resolve(process.cwd(), process.env.STORAGE_DIR || ".storage");

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024;
export const MAX_PDF_BYTES = Number(process.env.MAX_PDF_MB || 15) * 1024 * 1024;

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

const BLOCKED_EXT = new Set([".exe", ".bat", ".cmd", ".sh", ".js", ".msi", ".com", ".scr", ".php", ".html", ".htm", ".svg"]);

export function assertUploadAllowed(file: File) {
  if (file.size === 0) throw new Error("The selected file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File is too large (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`);
  }
  const ext = path.extname(file.name).toLowerCase();
  if (BLOCKED_EXT.has(ext)) throw new Error("This file type is not allowed.");
}

export async function saveUpload(file: File, folder: string) {
  const dir = path.join(ROOT, folder);
  await fs.mkdir(dir, { recursive: true });
  const key = `${randomUUID()}-${safeName(file.name)}`;
  await fs.writeFile(path.join(dir, key), Buffer.from(await file.arrayBuffer()));
  return { filePath: `${folder}/${key}`, fileName: file.name };
}

export async function saveBuffer(buf: Buffer, folder: string, fileName: string) {
  const dir = path.join(ROOT, folder);
  await fs.mkdir(dir, { recursive: true });
  const key = `${randomUUID()}-${safeName(fileName)}`;
  await fs.writeFile(path.join(dir, key), buf);
  return { filePath: `${folder}/${key}`, fileName };
}

function resolveSafe(filePath: string) {
  const full = path.resolve(ROOT, filePath);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid path");
  return full;
}

export async function readUpload(filePath: string) {
  return fs.readFile(resolveSafe(filePath));
}

export async function removeUpload(filePath: string | null | undefined) {
  if (!filePath) return;
  try {
    await fs.unlink(resolveSafe(filePath));
  } catch {
    /* already gone */
  }
}

/** Returns the File if the form field holds a real, non-empty upload; otherwise null. */
export function optionalFile(fd: FormData, field: string): File | null {
  const f = fd.get(field);
  if (f && typeof f !== "string" && f.size > 0) return f as File;
  return null;
}
