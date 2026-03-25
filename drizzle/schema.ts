import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  json,
  boolean,
  float,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Parliamentarians ─────────────────────────────────────────────────────────
export const parliamentarians = mysqlTable("parliamentarians", {
  id: int("id").autoincrement().primaryKey(),
  cpf: varchar("cpf", { length: 14 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  party: varchar("party", { length: 50 }),
  state: varchar("state", { length: 2 }),
  role: mysqlEnum("role", ["deputado_federal", "senador", "vereador", "governador", "prefeito", "candidato"]).notNull(),
  mandate_start: timestamp("mandate_start"),
  mandate_end: timestamp("mandate_end"),
  declared_income_monthly: decimal("declared_income_monthly", { precision: 15, scale: 2 }),
  photo_url: text("photo_url"),
  bio: text("bio"),
  source_tse: boolean("source_tse").default(false),
  source_camara: boolean("source_camara").default(false),
  source_senado: boolean("source_senado").default(false),
  tse_candidate_id: varchar("tse_candidate_id", { length: 64 }),
  camara_deputy_id: varchar("camara_deputy_id", { length: 64 }),
  senado_senator_id: varchar("senado_senator_id", { length: 64 }),
  external_id: varchar("external_id", { length: 128 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Parliamentarian = typeof parliamentarians.$inferSelect;
export type InsertParliamentarian = typeof parliamentarians.$inferInsert;

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  parliamentarian_id: int("parliamentarian_id").notNull(),
  source: mysqlEnum("source", ["camara", "senado", "tse", "tcu", "manual"]).notNull(),
  category: varchar("category", { length: 100 }),
  description: text("description"),
  supplier_name: varchar("supplier_name", { length: 255 }),
  supplier_cnpj: varchar("supplier_cnpj", { length: 18 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  expense_date: timestamp("expense_date").notNull(),
  document_number: varchar("document_number", { length: 100 }),
  is_suspicious: boolean("is_suspicious").default(false),
  suspicion_reason: text("suspicion_reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ─── Assets ───────────────────────────────────────────────────────────────────
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  parliamentarian_id: int("parliamentarian_id").notNull(),
  declaration_year: int("declaration_year").notNull(),
  asset_type: varchar("asset_type", { length: 100 }),
  description: text("description"),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  total_declared: decimal("total_declared", { precision: 15, scale: 2 }),
  source: mysqlEnum("source", ["tse", "tcu", "manual"]).default("tse"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

// ─── Contracts ────────────────────────────────────────────────────────────────
export const contracts = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  parliamentarian_id: int("parliamentarian_id").notNull(),
  contract_number: varchar("contract_number", { length: 100 }),
  contracting_entity: varchar("contracting_entity", { length: 255 }),
  contractor_name: varchar("contractor_name", { length: 255 }).notNull(),
  contractor_cnpj: varchar("contractor_cnpj", { length: 18 }),
  object_description: text("object_description"),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  start_date: timestamp("start_date"),
  end_date: timestamp("end_date"),
  is_shell_company: boolean("is_shell_company").default(false),
  has_parliamentarian_link: boolean("has_parliamentarian_link").default(false),
  link_description: text("link_description"),
  risk_level: mysqlEnum("risk_level", ["low", "medium", "high", "critical"]).default("low"),
  source: mysqlEnum("source", ["tcu", "camara", "senado", "manual"]).default("manual"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;

// ─── Employees ────────────────────────────────────────────────────────────────
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  parliamentarian_id: int("parliamentarian_id").notNull(),
  cpf: varchar("cpf", { length: 14 }),
  name: varchar("name", { length: 255 }).notNull(),
  role_title: varchar("role_title", { length: 100 }),
  salary: decimal("salary", { precision: 15, scale: 2 }),
  hire_date: timestamp("hire_date"),
  termination_date: timestamp("termination_date"),
  attendance_rate: float("attendance_rate"),
  is_ghost_suspect: boolean("is_ghost_suspect").default(false),
  ghost_reason: text("ghost_reason"),
  multiple_employers: boolean("multiple_employers").default(false),
  source: mysqlEnum("source", ["camara", "senado", "manual"]).default("manual"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ─── Trust Score Analysis ─────────────────────────────────────────────────────
export const trustScores = mysqlTable("trust_scores", {
  id: int("id").autoincrement().primaryKey(),
  parliamentarian_id: int("parliamentarian_id").notNull(),
  overall_score: float("overall_score").notNull(),
  transparency_score: float("transparency_score").notNull(),
  asset_consistency_score: float("asset_consistency_score").notNull(),
  expense_regularity_score: float("expense_regularity_score").notNull(),
  irregularity_score: float("irregularity_score").notNull(),
  ghost_employee_count: int("ghost_employee_count").default(0),
  suspicious_contract_count: int("suspicious_contract_count").default(0),
  asset_discrepancy_value: decimal("asset_discrepancy_value", { precision: 15, scale: 2 }),
  analysis_details: json("analysis_details"),
  notes: text("notes"),
  calculated_at: timestamp("calculated_at").defaultNow().notNull(),
});

export type TrustScore = typeof trustScores.$inferSelect;
export type InsertTrustScore = typeof trustScores.$inferInsert;

// ─── Audit Reports ────────────────────────────────────────────────────────────
export const auditReports = mysqlTable("audit_reports", {
  id: int("id").autoincrement().primaryKey(),
  parliamentarian_id: int("parliamentarian_id").notNull(),
  report_type: mysqlEnum("report_type", ["full", "ghost_employees", "assets", "contracts", "summary"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  narrative: text("narrative").notNull(),
  key_findings: json("key_findings"),
  priority_areas: json("priority_areas"),
  risk_level: mysqlEnum("risk_level", ["low", "medium", "high", "critical"]).default("low"),
  generated_by: mysqlEnum("generated_by", ["llm", "manual"]).default("llm"),
  generated_at: timestamp("generated_at").defaultNow().notNull(),
  requested_by_user_id: int("requested_by_user_id"),
});

export type AuditReport = typeof auditReports.$inferSelect;
export type InsertAuditReport = typeof auditReports.$inferInsert;

// ─── Search History ───────────────────────────────────────────────────────────
export const searchHistory = mysqlTable("search_history", {
  id: int("id").autoincrement().primaryKey(),
  user_id: int("user_id"),
  query: varchar("query", { length: 255 }).notNull(),
  query_type: mysqlEnum("query_type", ["cpf", "name"]).default("cpf"),
  result_count: int("result_count").default(0),
  searched_at: timestamp("searched_at").defaultNow().notNull(),
});

export type SearchHistory = typeof searchHistory.$inferSelect;

// ─── Sync Logs ────────────────────────────────────────────────────────────────
export const syncLogs = mysqlTable("sync_logs", {
  id: int("id").autoincrement().primaryKey(),
  source: varchar("source", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["running", "success", "error"]).notNull(),
  started_at: timestamp("started_at").defaultNow().notNull(),
  completed_at: timestamp("completed_at"),
  records_imported: int("records_imported").default(0),
  records_updated: int("records_updated").default(0),
  error_count: int("error_count").default(0),
  error_message: text("error_message"),
});

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;
