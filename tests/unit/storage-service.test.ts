import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  deleteObject,
  clearMockStorage,
  _testStorageObjects,
  generateS3PresignedUrl,
} from "@/server/services/storage";
import * as envModule from "@/server/env";

describe("Storage Service", () => {
  beforeEach(() => {
    clearMockStorage();
    vi.restoreAllMocks();
  });

  it("creates mock presigned upload URL and registers object", async () => {
    const result = await createPresignedUploadUrl({
      key: "users/u-1/receipts/rec-123.jpg",
      contentType: "image/jpeg",
      expiresInSeconds: 600,
    });

    expect(result.uploadUrl).toContain(
      "/api/v1/mock-storage/users/u-1/receipts/rec-123.jpg",
    );
    expect(result.expiresInSeconds).toBe(600);
    expect(result.headers["Content-Type"]).toBe("image/jpeg");
    expect(_testStorageObjects.has("users/u-1/receipts/rec-123.jpg")).toBe(
      true,
    );
  });

  it("creates mock presigned download URL", async () => {
    const result = await createPresignedDownloadUrl({
      key: "users/u-1/receipts/rec-123.jpg",
      expiresInSeconds: 300,
    });

    expect(result.downloadUrl).toContain(
      "/api/v1/mock-storage/users/u-1/receipts/rec-123.jpg",
    );
    expect(result.expiresInSeconds).toBe(300);
  });

  it("deletes mock object from registry", async () => {
    _testStorageObjects.set("users/u-1/receipts/old.pdf", {
      contentType: "application/pdf",
      size: 1024,
      createdAt: new Date(),
    });

    const success = await deleteObject({ key: "users/u-1/receipts/old.pdf" });
    expect(success).toBe(true);
    expect(_testStorageObjects.has("users/u-1/receipts/old.pdf")).toBe(false);
  });

  it("generates compliant AWS SigV4 presigned URL when S3 is configured", () => {
    const originalEnv = envModule.env;
    vi.spyOn(envModule, "env", "get").mockReturnValue({
      ...originalEnv,
      STORAGE_BUCKET: "my-production-bucket",
      STORAGE_ACCESS_KEY_ID: "AKIA_TEST_KEY",
      STORAGE_SECRET_ACCESS_KEY: "secret_access_key_1234567890",
      STORAGE_ENDPOINT:
        "https://my-production-bucket.s3.us-east-1.amazonaws.com",
    });

    const url = generateS3PresignedUrl({
      method: "PUT",
      key: "users/user-abc/receipts/rec-456.png",
      contentType: "image/png",
      expiresInSeconds: 900,
    });

    expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(url).toContain("X-Amz-Credential=AKIA_TEST_KEY");
    expect(url).toContain("X-Amz-Signature=");
    expect(url).toContain("X-Amz-SignedHeaders=content-type%3Bhost");
  });
});
