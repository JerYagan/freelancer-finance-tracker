import { describe, it, expect } from "vitest";
import {
  currencySchema,
  cursorPaginationQuerySchema,
  dateStringSchema,
  hexColorSchema,
  monthKeySchema,
  uuidSchema,
} from "@/lib/schemas/common";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
} from "@/lib/schemas/categories";
import { clientCreateSchema, clientUpdateSchema } from "@/lib/schemas/clients";
import {
  projectCreateSchema,
  projectUpdateSchema,
} from "@/lib/schemas/projects";
import {
  transactionCreateSchema,
  transactionQuerySchema,
  transactionUpdateSchema,
} from "@/lib/schemas/transactions";
import { settingsUpdateSchema } from "@/lib/schemas/settings";
import { reportsTrendQuerySchema } from "@/lib/schemas/reports";
import {
  recurringCreateSchema,
  recurringUpdateSchema,
  recurringQuerySchema,
  recurringGenerateSchema,
} from "@/lib/schemas/recurring";
import {
  invoiceCreateSchema,
  invoiceUpdateSchema,
  invoiceQuerySchema,
  invoiceMarkPaidSchema,
} from "@/lib/schemas/invoices";

describe("Common Primitive Schemas", () => {
  it("validates UUIDs correctly", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(uuidSchema.safeParse(validUuid).success).toBe(true);
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
  });

  it("validates strict YYYY-MM-DD dates", () => {
    expect(dateStringSchema.safeParse("2026-10-18").success).toBe(true);
    // Invalid calendar day
    expect(dateStringSchema.safeParse("2026-02-29").success).toBe(false);
    expect(dateStringSchema.safeParse("2026/10/18").success).toBe(false);
  });

  it("validates YYYY-MM month keys", () => {
    expect(monthKeySchema.safeParse("2026-10").success).toBe(true);
    expect(monthKeySchema.safeParse("2026-13").success).toBe(false);
  });

  it("validates allowlisted currencies and normalizes to uppercase", () => {
    const resPhp = currencySchema.safeParse("php");
    expect(resPhp.success).toBe(true);
    if (resPhp.success) {
      expect(resPhp.data).toBe("PHP");
    }

    const resUsd = currencySchema.safeParse("USD");
    expect(resUsd.success).toBe(true);

    expect(currencySchema.safeParse("XYZ").success).toBe(false);
  });

  it("validates 6-character hex colors", () => {
    expect(hexColorSchema.safeParse("#16a34a").success).toBe(true);
    expect(hexColorSchema.safeParse("#FFFFFF").success).toBe(true);
    expect(hexColorSchema.safeParse("#123").success).toBe(false);
    expect(hexColorSchema.safeParse("green").success).toBe(false);
  });

  it("handles cursor pagination query coercion and defaults", () => {
    const resDefault = cursorPaginationQuerySchema.safeParse({});
    expect(resDefault.success).toBe(true);
    if (resDefault.success) {
      expect(resDefault.data.limit).toBe(50);
    }

    const resCustom = cursorPaginationQuerySchema.safeParse({
      limit: "25",
      cursor: "abc",
    });
    expect(resCustom.success).toBe(true);
    if (resCustom.success) {
      expect(resCustom.data.limit).toBe(25);
      expect(resCustom.data.cursor).toBe("abc");
    }

    expect(
      cursorPaginationQuerySchema.safeParse({ limit: "150" }).success,
    ).toBe(false);
  });
});

describe("Categories Schemas", () => {
  it("validates category creation and rejects unknown keys (strict)", () => {
    const valid = {
      type: "income",
      name: "Consulting",
      color: "#16a34a",
    };
    expect(categoryCreateSchema.safeParse(valid).success).toBe(true);

    const withExtraKey = {
      ...valid,
      unknownProp: "test",
    };
    expect(categoryCreateSchema.safeParse(withExtraKey).success).toBe(false);
  });

  it("validates category updates", () => {
    expect(
      categoryUpdateSchema.safeParse({ name: "Renamed", archived: true })
        .success,
    ).toBe(true);
    expect(categoryUpdateSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("Clients & Projects Schemas", () => {
  it("validates client creation and transforms empty strings to null", () => {
    const valid = {
      name: "Acme Corp",
      email: "billing@acme.com",
      notes: "Net-30",
    };
    expect(clientCreateSchema.safeParse(valid).success).toBe(true);

    const withEmpty = {
      name: "Beta Inc",
      email: "",
      notes: "",
    };
    const res = clientCreateSchema.safeParse(withEmpty);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.email).toBeNull();
      expect(res.data.notes).toBeNull();
    }

    expect(
      clientCreateSchema.safeParse({ name: "A", email: "bad-email" }).success,
    ).toBe(false);
  });

  it("validates client updates and archiving", () => {
    expect(clientUpdateSchema.safeParse({ archived: true }).success).toBe(true);
  });

  it("validates project creation with optional client UUID", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(
      projectCreateSchema.safeParse({
        name: "Website redesign",
        clientId: validUuid,
      }).success,
    ).toBe(true);

    expect(
      projectCreateSchema.safeParse({
        name: "Personal side-project",
        clientId: null,
      }).success,
    ).toBe(true);

    expect(
      projectCreateSchema.safeParse({
        name: "Project",
        clientId: "invalid-uuid",
      }).success,
    ).toBe(false);
  });

  it("validates project update", () => {
    expect(projectUpdateSchema.safeParse({ archived: true }).success).toBe(
      true,
    );
  });
});

describe("Transactions Schemas", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";

  it("validates valid transaction creation", () => {
    const valid = {
      type: "expense",
      amountMinor: 49900,
      currency: "PHP",
      occurredOn: "2026-10-18",
      categoryId: validUuid,
      clientId: null,
      projectId: null,
      description: "Cloud hosting",
      notes: null,
      paymentMethod: "card",
    };
    expect(transactionCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects non-positive, float, or out-of-bounds amountMinor", () => {
    const base = {
      type: "income",
      currency: "PHP",
      occurredOn: "2026-10-18",
      categoryId: validUuid,
    };

    expect(
      transactionCreateSchema.safeParse({ ...base, amountMinor: 0 }).success,
    ).toBe(false);
    expect(
      transactionCreateSchema.safeParse({ ...base, amountMinor: -500 }).success,
    ).toBe(false);
    expect(
      transactionCreateSchema.safeParse({ ...base, amountMinor: 100.5 })
        .success,
    ).toBe(false);
    expect(
      transactionCreateSchema.safeParse({
        ...base,
        amountMinor: 2_000_000_000_000,
      }).success,
    ).toBe(false);
  });

  it("rejects unknown properties in transaction creation (strict)", () => {
    const withExtra = {
      type: "income",
      amountMinor: 50000,
      occurredOn: "2026-10-18",
      categoryId: validUuid,
      hackerField: "malicious",
    };
    expect(transactionCreateSchema.safeParse(withExtra).success).toBe(false);
  });

  it("validates transaction query filtering parameters", () => {
    const query = {
      from: "2026-10-01",
      to: "2026-10-31",
      type: "expense",
      limit: "20",
    };
    const res = transactionQuerySchema.safeParse(query);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.limit).toBe(20);
      expect(res.data.type).toBe("expense");
    }
  });

  it("validates transaction partial updates", () => {
    expect(
      transactionUpdateSchema.safeParse({
        amountMinor: 60000,
        description: "Updated note",
      }).success,
    ).toBe(true);
  });
});

describe("Settings Schemas", () => {
  it("validates settings update constraints", () => {
    expect(
      settingsUpdateSchema.safeParse({
        displayName: "Freelancer Pro",
        defaultCurrency: "PHP",
        taxSetAsideBps: 1500,
        fiscalYearStartMonth: 1,
      }).success,
    ).toBe(true);

    // Negative tax bps rejected
    expect(
      settingsUpdateSchema.safeParse({ taxSetAsideBps: -10 }).success,
    ).toBe(false);
    // Tax bps > 10000 rejected
    expect(
      settingsUpdateSchema.safeParse({ taxSetAsideBps: 10001 }).success,
    ).toBe(false);
    // Month < 1 or > 12 rejected
    expect(
      settingsUpdateSchema.safeParse({ fiscalYearStartMonth: 0 }).success,
    ).toBe(false);
    expect(
      settingsUpdateSchema.safeParse({ fiscalYearStartMonth: 13 }).success,
    ).toBe(false);
  });
});

describe("Reports Schemas", () => {
  it("validates trend query parameters with defaults and bounds", () => {
    const resDefault = reportsTrendQuerySchema.safeParse({});
    expect(resDefault.success).toBe(true);
    if (resDefault.success) {
      expect(resDefault.data.months).toBe(6);
    }

    expect(
      reportsTrendQuerySchema.safeParse({ months: "12", currency: "USD" })
        .success,
    ).toBe(true);

    // Max 24 months
    expect(reportsTrendQuerySchema.safeParse({ months: 25 }).success).toBe(
      false,
    );
  });
});

describe("Recurring Schemas", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";

  it("validates valid recurring creation input", () => {
    const valid = {
      interval: "monthly",
      nextRunOn: "2026-11-01",
      endsOn: "2027-11-01",
      template: {
        type: "expense",
        amountMinor: 50000,
        currency: "PHP",
        categoryId: validUuid,
        description: "Monthly Software",
      },
    };
    expect(recurringCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects recurring creation when endsOn is before nextRunOn", () => {
    const invalid = {
      interval: "monthly",
      nextRunOn: "2026-11-01",
      endsOn: "2026-10-01",
      template: {
        type: "expense",
        amountMinor: 50000,
        categoryId: validUuid,
      },
    };
    expect(recurringCreateSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid intervals or non-positive amounts", () => {
    expect(
      recurringCreateSchema.safeParse({
        interval: "daily", // not allowed
        nextRunOn: "2026-11-01",
        template: {
          type: "expense",
          amountMinor: 50000,
          categoryId: validUuid,
        },
      }).success,
    ).toBe(false);

    expect(
      recurringCreateSchema.safeParse({
        interval: "monthly",
        nextRunOn: "2026-11-01",
        template: {
          type: "expense",
          amountMinor: 0, // must be > 0
          categoryId: validUuid,
        },
      }).success,
    ).toBe(false);
  });

  it("validates recurring update input", () => {
    expect(
      recurringUpdateSchema.safeParse({
        active: false,
        interval: "quarterly",
      }).success,
    ).toBe(true);

    expect(
      recurringUpdateSchema.safeParse({
        nextRunOn: "2026-12-01",
        endsOn: "2026-11-01", // endsOn < nextRunOn
      }).success,
    ).toBe(false);
  });

  it("validates query and generate schemas", () => {
    const parsedQuery = recurringQuerySchema.safeParse({ active: "true" });
    expect(parsedQuery.success).toBe(true);
    if (parsedQuery.success) {
      expect(parsedQuery.data.active).toBe(true);
    }

    expect(
      recurringGenerateSchema.safeParse({ throughDate: "2026-10-18" }).success,
    ).toBe(true);
    expect(
      recurringGenerateSchema.safeParse({ throughDate: "invalid-date" })
        .success,
    ).toBe(false);
  });
});

describe("Invoice Schemas", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";

  it("validates valid invoice creation input", () => {
    const valid = {
      clientId: validUuid,
      number: "INV-2026-001",
      amountMinor: 2500000,
      currency: "PHP",
      issuedOn: "2026-10-18",
      dueOn: "2026-11-01",
      status: "draft",
    };
    expect(invoiceCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invoice creation when dueOn is before issuedOn", () => {
    const invalid = {
      clientId: validUuid,
      number: "INV-2026-001",
      amountMinor: 2500000,
      issuedOn: "2026-11-01",
      dueOn: "2026-10-18", // dueOn < issuedOn
    };
    expect(invoiceCreateSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects non-positive invoice amounts or blank numbers", () => {
    expect(
      invoiceCreateSchema.safeParse({
        clientId: validUuid,
        number: "",
        amountMinor: 1000,
        issuedOn: "2026-10-18",
        dueOn: "2026-10-25",
      }).success,
    ).toBe(false);

    expect(
      invoiceCreateSchema.safeParse({
        clientId: validUuid,
        number: "INV-001",
        amountMinor: 0,
        issuedOn: "2026-10-18",
        dueOn: "2026-10-25",
      }).success,
    ).toBe(false);
  });

  it("validates invoice update and mark-paid schemas", () => {
    expect(
      invoiceUpdateSchema.safeParse({
        status: "sent",
        amountMinor: 3000000,
      }).success,
    ).toBe(true);

    expect(
      invoiceUpdateSchema.safeParse({
        issuedOn: "2026-11-01",
        dueOn: "2026-10-15", // dueOn < issuedOn
      }).success,
    ).toBe(false);

    expect(
      invoiceMarkPaidSchema.safeParse({ paidOn: "2026-10-18" }).success,
    ).toBe(true);
    expect(
      invoiceMarkPaidSchema.safeParse({ paidOn: "bad-date" }).success,
    ).toBe(false);

    expect(
      invoiceQuerySchema.safeParse({ status: "overdue", limit: "25" }).success,
    ).toBe(true);
  });
});
