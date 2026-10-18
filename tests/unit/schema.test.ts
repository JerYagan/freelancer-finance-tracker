import { describe, it, expect } from "vitest";
import {
  userSettings,
  categories,
  clients,
  projects,
  transactions,
  transactionTypeEnum,
  invoiceStatusEnum,
  recurrenceIntervalEnum,
} from "@/server/db/schema";
import { getTableColumns } from "drizzle-orm";

describe("Database Schema (DATA_MODEL.md compliance)", () => {
  it("defines all enums per specification", () => {
    expect(transactionTypeEnum.enumValues).toEqual(["income", "expense"]);
    expect(invoiceStatusEnum.enumValues).toEqual([
      "draft",
      "sent",
      "paid",
      "overdue",
      "void",
    ]);
    expect(recurrenceIntervalEnum.enumValues).toEqual([
      "weekly",
      "monthly",
      "quarterly",
      "yearly",
    ]);
  });

  it("defines user_settings with all expected columns", () => {
    const cols = getTableColumns(userSettings);
    expect(cols.userId).toBeDefined();
    expect(cols.displayName).toBeDefined();
    expect(cols.defaultCurrency).toBeDefined();
    expect(cols.taxSetAsideBps).toBeDefined();
    expect(cols.fiscalYearStartMonth).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
  });

  it("defines categories with all expected columns", () => {
    const cols = getTableColumns(categories);
    expect(cols.id).toBeDefined();
    expect(cols.userId).toBeDefined();
    expect(cols.type).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.color).toBeDefined();
    expect(cols.archivedAt).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
  });

  it("defines clients with all expected columns", () => {
    const cols = getTableColumns(clients);
    expect(cols.id).toBeDefined();
    expect(cols.userId).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.email).toBeDefined();
    expect(cols.notes).toBeDefined();
    expect(cols.archivedAt).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
  });

  it("defines projects with all expected columns", () => {
    const cols = getTableColumns(projects);
    expect(cols.id).toBeDefined();
    expect(cols.userId).toBeDefined();
    expect(cols.clientId).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.archivedAt).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
  });

  it("defines transactions with all expected columns", () => {
    const cols = getTableColumns(transactions);
    expect(cols.id).toBeDefined();
    expect(cols.userId).toBeDefined();
    expect(cols.type).toBeDefined();
    expect(cols.amountMinor).toBeDefined();
    expect(cols.currency).toBeDefined();
    expect(cols.occurredOn).toBeDefined();
    expect(cols.categoryId).toBeDefined();
    expect(cols.clientId).toBeDefined();
    expect(cols.projectId).toBeDefined();
    expect(cols.invoiceId).toBeDefined();
    expect(cols.recurringRuleId).toBeDefined();
    expect(cols.description).toBeDefined();
    expect(cols.notes).toBeDefined();
    expect(cols.paymentMethod).toBeDefined();
    expect(cols.receiptKey).toBeDefined();
    expect(cols.deletedAt).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
  });
});
