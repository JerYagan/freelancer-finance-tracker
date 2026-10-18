import { z } from "zod";

export const ALLOWED_RECEIPT_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export type AllowedReceiptContentType =
  (typeof ALLOWED_RECEIPT_CONTENT_TYPES)[number];

export const MAX_RECEIPT_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const receiptUploadRequestSchema = z
  .object({
    fileName: z
      .string()
      .trim()
      .min(1, "File name is required")
      .max(255, "File name must not exceed 255 characters"),
    contentType: z.enum(ALLOWED_RECEIPT_CONTENT_TYPES, {
      message: "Allowed content types: image/jpeg, image/png, application/pdf",
    }),
    fileSizeBytes: z
      .number()
      .int("File size must be an integer")
      .min(1, "File size must be greater than 0")
      .max(
        MAX_RECEIPT_FILE_SIZE_BYTES,
        "File size must not exceed 10 MB (10,485,760 bytes)",
      ),
  })
  .strict();

export type ReceiptUploadRequestInput = z.infer<
  typeof receiptUploadRequestSchema
>;

export const receiptUploadResponseDtoSchema = z.object({
  transactionId: z.string().uuid(),
  receiptKey: z.string().min(1),
  uploadUrl: z.string().url(),
  expiresInSeconds: z.number().int().positive(),
  headers: z.record(z.string(), z.string()).optional(),
});

export type ReceiptUploadResponseDto = z.infer<
  typeof receiptUploadResponseDtoSchema
>;

export const receiptDownloadResponseDtoSchema = z.object({
  transactionId: z.string().uuid(),
  receiptKey: z.string().min(1),
  downloadUrl: z.string().url(),
  expiresInSeconds: z.number().int().positive(),
});

export type ReceiptDownloadResponseDto = z.infer<
  typeof receiptDownloadResponseDtoSchema
>;
