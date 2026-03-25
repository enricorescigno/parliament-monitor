import { eq, like, or, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  parliamentarians, InsertParliamentarian,
  expenses, InsertExpense,
  assets, InsertAsset,
  contracts, InsertContract,
  employees, InsertEmployee,
  trustScores, InsertTrustScore,
  auditReports, InsertAuditReport,
  searchHistory,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Parliamentarians ─────────────────────────────────────────────────────────
export async function getParliamentarianByCpf(cpf: string) {
  const db = await getDb();
  if (!db) return undefined;
  const clean = cpf.replace(/\D/g, "");
  const formatted = clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  const result = await db.select().from(parliamentarians)
    .where(or(eq(parliamentarians.cpf, formatted), eq(parliamentarians.cpf, clean)))
    .limit(1);
  return result[0] ?? undefined;
}

export async function searchParliamentarians(query: string) {
  const db = await getDb();
  if (!db) return [];
  const clean = query.replace(/\D/g, "");
  const isCpf = clean.length >= 11;
  if (isCpf) {
    const formatted = clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    return db.select().from(parliamentarians)
      .where(or(eq(parliamentarians.cpf, formatted), eq(parliamentarians.cpf, clean)))
      .limit(10);
  }
  return db.select().from(parliamentarians)
    .where(like(parliamentarians.name, `%${query}%`))
    .limit(10);
}

export async function getParliamentarianById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(parliamentarians).where(eq(parliamentarians.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function insertParliamentarian(data: InsertParliamentarian) {
  const db = await getDb();
  if (!db) return;
  await db.insert(parliamentarians).values(data).onDuplicateKeyUpdate({ set: { name: data.name } });
}

export async function getAllParliamentarians(limit = 1000, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(parliamentarians).limit(limit).offset(offset);
}

export async function countParliamentarians() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql`COUNT(*)` }).from(parliamentarians);
  return Number(result[0]?.count ?? 0);
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export async function getExpensesByParliamentarian(parliamentarianId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenses)
    .where(eq(expenses.parliamentarian_id, parliamentarianId))
    .orderBy(desc(expenses.expense_date))
    .limit(200);
}

export async function insertExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) return;
  await db.insert(expenses).values(data);
}

// ─── Assets ───────────────────────────────────────────────────────────────────
export async function getAssetsByParliamentarian(parliamentarianId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assets)
    .where(eq(assets.parliamentarian_id, parliamentarianId))
    .orderBy(assets.declaration_year);
}

export async function insertAsset(data: InsertAsset) {
  const db = await getDb();
  if (!db) return;
  await db.insert(assets).values(data);
}

// ─── Contracts ────────────────────────────────────────────────────────────────
export async function getContractsByParliamentarian(parliamentarianId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contracts)
    .where(eq(contracts.parliamentarian_id, parliamentarianId))
    .orderBy(desc(contracts.start_date));
}

export async function insertContract(data: InsertContract) {
  const db = await getDb();
  if (!db) return;
  await db.insert(contracts).values(data);
}

// ─── Employees ────────────────────────────────────────────────────────────────
export async function getEmployeesByParliamentarian(parliamentarianId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(employees)
    .where(eq(employees.parliamentarian_id, parliamentarianId));
}

export async function insertEmployee(data: InsertEmployee) {
  const db = await getDb();
  if (!db) return;
  await db.insert(employees).values(data);
}

// ─── Trust Scores ─────────────────────────────────────────────────────────────
export async function getLatestTrustScore(parliamentarianId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(trustScores)
    .where(eq(trustScores.parliamentarian_id, parliamentarianId))
    .orderBy(desc(trustScores.calculated_at))
    .limit(1);
  return result[0] ?? undefined;
}

export async function upsertTrustScore(data: InsertTrustScore) {
  const db = await getDb();
  if (!db) return;
  await db.insert(trustScores).values(data);
}

// ─── Audit Reports ────────────────────────────────────────────────────────────
export async function getAuditReports(parliamentarianId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditReports)
    .where(eq(auditReports.parliamentarian_id, parliamentarianId))
    .orderBy(desc(auditReports.generated_at))
    .limit(20);
}

export async function insertAuditReport(data: InsertAuditReport) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(auditReports).values(data);
  return result;
}

// ─── Search History ───────────────────────────────────────────────────────────
export async function logSearch(query: string, queryType: "cpf" | "name", resultCount: number, userId?: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(searchHistory).values({ query, query_type: queryType, result_count: resultCount, user_id: userId });
}

export async function getRecentSearches(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(searchHistory).orderBy(desc(searchHistory.searched_at)).limit(limit);
}
