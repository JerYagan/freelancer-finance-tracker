import { z } from "zod";
import { isSupportedCurrency } from "../currencies";
import { isValidDateString, isValidMonthKey } from "../dates";

export const uuidSchema = z.string().uuid("Invalid UUID format");

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD")
  .refine(isValidDateString, "Invalid calendar date");

export const monthKeySchema = z
  .string()
  .regex(
    /^\d{4}-(0[1-9]|1[0-2])$/,
    "Invalid month key format, expected YYYY-MM",
  )
  .refine(isValidMonthKey, "Invalid calendar month");

export const currencySchema = z
  .string()
  .length(3, "Currency must be a 3-letter ISO code")
  .transform((val) => val.toUpperCase())
  .refine(isSupportedCurrency, "Unsupported currency code");

export const hexColorSchema = z
  .string()
  .regex(
    /^#[0-9a-fA-F]{6}$/,
    "Must be a valid 6-character hex color code (e.g. #16a34a)",
  );

export const transactionTypeSchema = z.enum(["income", "expense"]);

export const cursorPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;

export function nullableStringSchema(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength, `Cannot exceed ${maxLength} characters`)
    .nullable()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (val === null || val === "") return null;
      return val;
    })
    .optional();
}

export const nullableEmailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null))
  .transform((val) => {
    if (val === undefined) return undefined;
    if (val === null || val === "") return null;
    return val;
  })
  .optional();
