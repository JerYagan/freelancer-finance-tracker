import crypto from "node:crypto";
import { env } from "@/server/env";

export interface PresignedUploadOptions {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}

export interface PresignedDownloadOptions {
  key: string;
  expiresInSeconds?: number;
}

// In-memory mock storage registry for testing and development
export const _testStorageObjects = new Map<
  string,
  { contentType: string; buffer?: Buffer; size: number; createdAt: Date }
>();

export function clearMockStorage(): void {
  _testStorageObjects.clear();
}

/**
 * Helper to compute SHA256 hex string.
 */
function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Helper for HMAC-SHA256 buffer.
 */
function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

/**
 * Helper for HMAC-SHA256 hex.
 */
function hmacHex(key: Buffer | string, data: string): string {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest("hex");
}

/**
 * Zero-dependency AWS SigV4 Presigned URL Generator for S3-compatible storage.
 */
export function generateS3PresignedUrl({
  method,
  key,
  contentType,
  expiresInSeconds = 900,
}: {
  method: "PUT" | "GET" | "DELETE";
  key: string;
  contentType?: string;
  expiresInSeconds?: number;
}): string {
  const endpoint = env.STORAGE_ENDPOINT || "https://s3.amazonaws.com";
  const bucket = env.STORAGE_BUCKET || "freelancer-receipts";
  const accessKeyId = env.STORAGE_ACCESS_KEY_ID || "MOCK_KEY";
  const secretAccessKey = env.STORAGE_SECRET_ACCESS_KEY || "MOCK_SECRET";
  const region = "us-east-1";

  const urlObj = new URL(endpoint);
  const host = urlObj.host;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const cleanKey = key.startsWith("/") ? key.slice(1) : key;
  const canonicalUri = `/${bucket}/${cleanKey.split("/").map(encodeURIComponent).join("/")}`;

  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${dateStamp}/${region}/s3/aws4_request`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": expiresInSeconds.toString(),
    "X-Amz-SignedHeaders":
      method === "PUT" && contentType ? "content-type;host" : "host",
  };

  const sortedKeys = Object.keys(queryParams).sort();
  const canonicalQueryString = sortedKeys
    .map(
      (k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k]!)}`,
    )
    .join("&");

  let canonicalHeaders = `host:${host}\n`;
  if (method === "PUT" && contentType) {
    canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  }

  const payloadHash = "UNSIGNED-PAYLOAD";
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    queryParams["X-Amz-SignedHeaders"],
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmacHex(kSigning, stringToSign);

  return `${urlObj.origin}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

/**
 * Creates a presigned PUT URL for client-side direct upload.
 */
export async function createPresignedUploadUrl({
  key,
  contentType,
  expiresInSeconds = 900,
}: PresignedUploadOptions): Promise<{
  uploadUrl: string;
  expiresInSeconds: number;
  headers: Record<string, string>;
}> {
  // If actual S3 bucket and credentials are set, use SigV4 URL
  if (
    env.STORAGE_BUCKET &&
    env.STORAGE_ACCESS_KEY_ID &&
    env.STORAGE_SECRET_ACCESS_KEY
  ) {
    const uploadUrl = generateS3PresignedUrl({
      method: "PUT",
      key,
      contentType,
      expiresInSeconds,
    });

    return {
      uploadUrl,
      expiresInSeconds,
      headers: {
        "Content-Type": contentType,
      },
    };
  }

  // Development / Test Mock Presigned URL
  const mockBaseUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const token = crypto.randomBytes(16).toString("hex");
  const uploadUrl = `${mockBaseUrl}/api/v1/mock-storage/${key}?token=${token}&expiresIn=${expiresInSeconds}`;

  // Pre-register key in mock store
  _testStorageObjects.set(key, {
    contentType,
    size: 0,
    createdAt: new Date(),
  });

  return {
    uploadUrl,
    expiresInSeconds,
    headers: {
      "Content-Type": contentType,
    },
  };
}

/**
 * Creates a presigned GET URL for client-side download/viewing.
 */
export async function createPresignedDownloadUrl({
  key,
  expiresInSeconds = 900,
}: PresignedDownloadOptions): Promise<{
  downloadUrl: string;
  expiresInSeconds: number;
}> {
  if (
    env.STORAGE_BUCKET &&
    env.STORAGE_ACCESS_KEY_ID &&
    env.STORAGE_SECRET_ACCESS_KEY
  ) {
    const downloadUrl = generateS3PresignedUrl({
      method: "GET",
      key,
      expiresInSeconds,
    });

    return {
      downloadUrl,
      expiresInSeconds,
    };
  }

  const mockBaseUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const token = crypto.randomBytes(16).toString("hex");
  const downloadUrl = `${mockBaseUrl}/api/v1/mock-storage/${key}?token=${token}`;

  return {
    downloadUrl,
    expiresInSeconds,
  };
}

/**
 * Deletes an object from storage.
 */
export async function deleteObject({ key }: { key: string }): Promise<boolean> {
  if (
    env.STORAGE_BUCKET &&
    env.STORAGE_ACCESS_KEY_ID &&
    env.STORAGE_SECRET_ACCESS_KEY
  ) {
    // S3 REST API DELETE
    const deleteUrl = generateS3PresignedUrl({
      method: "DELETE",
      key,
      expiresInSeconds: 60,
    });

    try {
      const res = await fetch(deleteUrl, { method: "DELETE" });
      return res.ok || res.status === 204;
    } catch {
      return false;
    }
  }

  _testStorageObjects.delete(key);
  return true;
}
