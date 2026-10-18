import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  smallint,
  bigint,
  char,
  date,
  pgEnum,
  check,
  index,
  uniqueIndex,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

// --- Enums ---
export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
  "void",
]);

export const recurrenceIntervalEnum = pgEnum("recurrence_interval", [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
]);

// --- Tables ---

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  defaultCurrency: char("default_currency", { length: 3 })
    .notNull()
    .default("PHP"),
  taxSetAsideBps: integer("tax_set_aside_bps").notNull().default(0),
  fiscalYearStartMonth: smallint("fiscal_year_start_month")
    .notNull()
    .default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("clients_user_id_idx").on(table.userId),
    uniqueIndex("clients_user_name_unique_idx")
      .on(table.userId, sql`lower(${table.name})`)
      .where(sql`${table.archivedAt} is null`),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("projects_user_id_idx").on(table.userId),
    index("projects_client_id_idx").on(table.clientId),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    name: text("name").notNull(),
    color: text("color"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("categories_user_id_idx").on(table.userId),
    uniqueIndex("categories_user_type_name_unique_idx")
      .on(table.userId, table.type, sql`lower(${table.name})`)
      .where(sql`${table.archivedAt} is null`),
  ],
);

export interface RecurringTemplate {
  type: "income" | "expense";
  amountMinor: number;
  currency: string;
  categoryId: string;
  clientId?: string | null;
  projectId?: string | null;
  description?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
}

export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    interval: recurrenceIntervalEnum("interval").notNull(),
    nextRunOn: date("next_run_on").notNull(),
    endsOn: date("ends_on"),
    active: boolean("active").notNull().default(true),
    template: jsonb("template").$type<RecurringTemplate>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "recurring_rules_ends_on_check",
      sql`${table.endsOn} is null or ${table.endsOn} >= ${table.nextRunOn}`,
    ),
    index("recurring_rules_user_active_next_run_idx").on(
      table.userId,
      table.active,
      table.nextRunOn,
    ),
    index("recurring_rules_user_next_run_idx").on(
      table.userId,
      table.nextRunOn,
    ),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    number: text("number").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    issuedOn: date("issued_on").notNull(),
    dueOn: date("due_on").notNull(),
    paidOn: date("paid_on"),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("invoices_amount_minor_check", sql`${table.amountMinor} > 0`),
    check("invoices_due_date_check", sql`${table.dueOn} >= ${table.issuedOn}`),
    uniqueIndex("invoices_user_number_unique_idx").on(
      table.userId,
      sql`lower(${table.number})`,
    ),
    index("invoices_user_status_idx").on(table.userId, table.status),
    index("invoices_user_client_idx").on(table.userId, table.clientId),
    index("invoices_user_due_on_idx").on(table.userId, table.dueOn.desc()),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    occurredOn: date("occurred_on").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    clientId: uuid("client_id").references(() => clients.id),
    projectId: uuid("project_id").references(() => projects.id),
    invoiceId: uuid("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    recurringRuleId: uuid("recurring_rule_id").references(
      () => recurringRules.id,
      { onDelete: "set null" },
    ),
    description: text("description"),
    notes: text("notes"),
    paymentMethod: text("payment_method"),
    receiptKey: text("receipt_key"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("transactions_amount_minor_check", sql`${table.amountMinor} > 0`),
    index("transactions_user_occurred_idx")
      .on(table.userId, table.occurredOn.desc())
      .where(sql`${table.deletedAt} is null`),
    index("transactions_user_category_idx").on(table.userId, table.categoryId),
    index("transactions_user_client_idx").on(table.userId, table.clientId),
    index("transactions_user_type_occurred_idx").on(
      table.userId,
      table.type,
      table.occurredOn,
    ),
  ],
);

// --- Relations ---

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(user, {
    fields: [userSettings.userId],
    references: [user.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(user, {
    fields: [clients.userId],
    references: [user.id],
  }),
  projects: many(projects),
  transactions: many(transactions),
  invoices: many(invoices),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(user, {
    fields: [projects.userId],
    references: [user.id],
  }),
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  transactions: many(transactions),
  invoices: many(invoices),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(user, {
    fields: [categories.userId],
    references: [user.id],
  }),
  transactions: many(transactions),
  invoices: many(invoices),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(user, {
    fields: [transactions.userId],
    references: [user.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  client: one(clients, {
    fields: [transactions.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [transactions.projectId],
    references: [projects.id],
  }),
  invoice: one(invoices, {
    fields: [transactions.invoiceId],
    references: [invoices.id],
  }),
  recurringRule: one(recurringRules, {
    fields: [transactions.recurringRuleId],
    references: [recurringRules.id],
  }),
}));

export const recurringRulesRelations = relations(
  recurringRules,
  ({ one, many }) => ({
    user: one(user, {
      fields: [recurringRules.userId],
      references: [user.id],
    }),
    transactions: many(transactions),
  }),
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(user, {
    fields: [invoices.userId],
    references: [user.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  category: one(categories, {
    fields: [invoices.categoryId],
    references: [categories.id],
  }),
  transactions: many(transactions),
}));
