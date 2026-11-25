/**
 * Private ImageKit storage helpers.
 *
 * Documents are uploaded with `isPrivateFile=true`, so ImageKit never serves
 * them from a public URL. Every read must go through `createDocumentSignedUrl`,
 * which produces a short-lived `ik-t`/`ik-s` signed URL using HMAC-SHA1.
 *
 * Signing uses Web Crypto so the same code works in Next.js and Cloudflare
 * Workers (the ImageKit Node SDK's signer needs Node's `crypto` module).
 */

const UPLOAD_ENDPOINT = "https://upload.imagekit.io/api/v1/files/upload";

type UploadResponse = {
  fileId?: string;
  name?: string;
  url?: string;
  filePath?: string;
  size?: number;
  message?: string;
};

export type PrivateUploadResult = {
  fileId: string;
  name: string;
  url: string;
  filePath: string;
  sizeBytes: number;
};

export function privateStorageConfigured(): boolean {
  return Boolean(
    process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT
  );
}

function basicAuth(): string {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY is missing");
  return `Basic ${btoa(`${privateKey}:`)}`;
}

function normalizePath(filePath: string): string {
  const trimmed = filePath.trim();
  if (!trimmed) throw new Error("ImageKit file path is required");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function endpointBase(): string {
  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!endpoint) throw new Error("IMAGEKIT_URL_ENDPOINT is missing");
  return endpoint.trim().replace(/\/+$/, "");
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export type SignInput = {
  privateKey: string;
  urlEndpoint: string;
  filePath: string;
  expiresAt: number;
};

/**
 * HMAC-SHA1 signature compatible with ImageKit's signed URL algorithm.
 * ImageKit signs the path relative to the URL endpoint (no leading slash)
 * concatenated with the expiry timestamp.
 */
export async function signImageKitPath(input: SignInput): Promise<string> {
  if (!input.privateKey) throw new Error("privateKey is required");
  if (!input.urlEndpoint) throw new Error("urlEndpoint is required");

  const relativePath = normalizePath(input.filePath).replace(/^\/+/, "");
  const stringToSign = `${relativePath}${input.expiresAt}`;
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(input.privateKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(stringToSign)
  );
  return toHex(signature);
}

export async function createDocumentSignedUrl(
  filePath: string,
  expiresInSeconds = 120
): Promise<string> {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY is missing");

  const path = normalizePath(filePath);
  const base = `${endpointBase()}${path}`;
  const ttl = Math.min(3600, Math.max(30, Math.floor(expiresInSeconds)));
  const expiresAt = Math.floor(Date.now() / 1000) + ttl;
  const signature = await signImageKitPath({
    privateKey,
    urlEndpoint: endpointBase(),
    filePath: path,
    expiresAt,
  });
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}ik-t=${expiresAt}&ik-s=${signature}`;
}

export async function uploadPrivateFile(
  file: File,
  folder: string
): Promise<PrivateUploadResult> {
  if (!privateStorageConfigured()) {
    throw new Error("Private document storage is not configured");
  }

  const safeName = file.name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(-120);
  const fileName = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const body = new FormData();
  body.append("file", file, fileName);
  body.append("fileName", fileName);
  body.append("folder", folder);
  body.append("useUniqueFileName", "true");
  body.append("isPrivateFile", "true");

  const response = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    headers: { Authorization: basicAuth() },
    body,
  });
  const result = (await response.json()) as UploadResponse;

  if (!response.ok || !result.fileId || !result.filePath) {
    throw new Error(result.message || `ImageKit upload failed (${response.status})`);
  }

  return {
    fileId: result.fileId,
    name: result.name || fileName,
    url: result.url || "",
    filePath: result.filePath,
    sizeBytes: result.size ?? file.size,
  };
}

export async function deletePrivateFile(fileId: string): Promise<void> {
  if (!fileId) return;
  const response = await fetch(
    `${UPLOAD_ENDPOINT}/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      headers: { Authorization: basicAuth() },
    }
  );
  if (!response.ok && response.status !== 404) {
    throw new Error(`ImageKit delete failed (${response.status})`);
  }
}
