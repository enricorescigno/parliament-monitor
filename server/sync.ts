/**
 * Parliament Monitor — Sync Service
 * Integrates with public APIs:
 * - Câmara dos Deputados: https://dadosabertos.camara.leg.br/api/v2
 * - Senado Federal: https://legis.senado.leg.br/dadosabertos
 */

import { getDb } from "./db";
import { parliamentarians, expenses, employees, trustScores, syncLogs } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

const CAMARA_API = "https://dadosabertos.camara.leg.br/api/v2";
const SENADO_API = "https://legis.senado.leg.br/dadosabertos";
const LEGISLATURA_ATUAL = 57;

// Rate limiting: wait between requests to avoid overloading public APIs
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchJson(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "Accept": "application/json", "User-Agent": "ParliamentMonitor/1.0 (fiscalizacao publica)" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(2000 * (i + 1));
    }
  }
}

function formatCpf(cpf: string | null | undefined): string {
  if (!cpf) return "";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

// ─── Câmara: list all deputies ────────────────────────────────────────────────
export async function fetchAllDeputados(): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const url = `${CAMARA_API}/deputados?idLegislatura=${LEGISLATURA_ATUAL}&itens=${pageSize}&pagina=${page}&ordem=ASC&ordenarPor=nome`;
    const data = await fetchJson(url);
    const items = data?.dados ?? [];
    all.push(...items);

    const hasNext = data?.links?.some((l: any) => l.rel === "next");
    if (!hasNext || items.length === 0) break;
    page++;
    await sleep(300); // be polite to the API
  }

  return all;
}

// ─── Câmara: get deputy details (includes CPF) ────────────────────────────────
export async function fetchDeputadoDetails(id: number): Promise<any> {
  const data = await fetchJson(`${CAMARA_API}/deputados/${id}`);
  return data?.dados ?? null;
}

// ─── Câmara: get deputy expenses ─────────────────────────────────────────────
export async function fetchDeputadoExpenses(id: number, year: number): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const url = `${CAMARA_API}/deputados/${id}/despesas?ano=${year}&itens=${pageSize}&pagina=${page}`;
    const data = await fetchJson(url);
    const items = data?.dados ?? [];
    all.push(...items);

    const hasNext = data?.links?.some((l: any) => l.rel === "next");
    if (!hasNext || items.length === 0) break;
    page++;
    await sleep(200);
  }

  return all;
}

// ─── Câmara: get deputy staff ─────────────────────────────────────────────────
export async function fetchDeputadoStaff(id: number): Promise<any[]> {
  try {
    const data = await fetchJson(`${CAMARA_API}/deputados/${id}/pessoal`);
    return data?.dados ?? [];
  } catch {
    return [];
  }
}

// ─── Senado: list all senators ────────────────────────────────────────────────
export async function fetchAllSenadores(): Promise<any[]> {
  const data = await fetchJson(`${SENADO_API}/senador/lista/atual`);
  return data?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar ?? [];
}

// ─── Senado: get senator details ─────────────────────────────────────────────
export async function fetchSenadorDetails(codigo: string): Promise<any> {
  try {
    const data = await fetchJson(`${SENADO_API}/senador/${codigo}`);
    return data?.DetalheParlamentar?.Parlamentar ?? null;
  } catch {
    return null;
  }
}

// ─── Score calculation ────────────────────────────────────────────────────────
function calculateTrustScore(params: {
  hasExpenses: boolean;
  suspiciousExpenseRatio: number;
  ghostCount: number;
  totalEmployees: number;
  assetGrowthRatio: number; // growth / declared income
  hasCpf: boolean;
}): {
  overall: number;
  transparency: number;
  assetConsistency: number;
  expenseRegularity: number;
  irregularity: number;
} {
  // Transparency: has CPF, has expenses data, data sources
  const transparency = params.hasCpf ? (params.hasExpenses ? 90 : 70) : 60;

  // Asset consistency: based on growth ratio
  let assetConsistency = 85;
  if (params.assetGrowthRatio > 3) assetConsistency = 40;
  else if (params.assetGrowthRatio > 2) assetConsistency = 60;
  else if (params.assetGrowthRatio > 1.5) assetConsistency = 75;

  // Expense regularity: based on suspicious ratio
  const expenseRegularity = Math.max(20, 100 - params.suspiciousExpenseRatio * 200);

  // Irregularity: ghost employees
  let irregularity = 90;
  if (params.ghostCount > 0) {
    const ghostRatio = params.ghostCount / Math.max(params.totalEmployees, 1);
    irregularity = Math.max(20, 90 - ghostRatio * 200);
  }

  const overall = transparency * 0.30 + assetConsistency * 0.25 + expenseRegularity * 0.25 + irregularity * 0.20;

  return {
    overall: Math.round(overall * 10) / 10,
    transparency: Math.round(transparency * 10) / 10,
    assetConsistency: Math.round(assetConsistency * 10) / 10,
    expenseRegularity: Math.round(expenseRegularity * 10) / 10,
    irregularity: Math.round(irregularity * 10) / 10,
  };
}

// ─── Upsert parliamentarian ───────────────────────────────────────────────────
async function upsertParliamentarian(db: any, data: {
  external_id: string;
  cpf: string;
  name: string;
  party: string;
  state: string;
  role: string;
  bio?: string;
  source_camara?: boolean;
  source_senado?: boolean;
  source_tse?: boolean;
  declared_income_monthly?: string;
}): Promise<number> {
  // Check if exists by external_id or CPF
  const existing = await db.select({ id: parliamentarians.id })
    .from(parliamentarians)
    .where(eq(parliamentarians.external_id, data.external_id))
    .limit(1);

  if (existing.length > 0) {
    await db.update(parliamentarians)
      .set({
        name: data.name,
        party: data.party,
        state: data.state,
        role: data.role as any,
        bio: data.bio ?? null,
        source_camara: data.source_camara ?? false,
        source_senado: data.source_senado ?? false,
        source_tse: data.source_tse ?? false,
        declared_income_monthly: data.declared_income_monthly ?? null,
        updatedAt: new Date(),
      })
      .where(eq(parliamentarians.id, existing[0].id));
    return existing[0].id;
  }

  const result = await db.insert(parliamentarians).values({
    external_id: data.external_id,
    cpf: data.cpf || `CPF-${data.external_id}`,
    name: data.name,
    party: data.party,
    state: data.state,
    role: data.role as any,
    bio: data.bio ?? null,
    source_camara: data.source_camara ?? false,
    source_senado: data.source_senado ?? false,
    source_tse: data.source_tse ?? false,
    declared_income_monthly: data.declared_income_monthly ?? null,
  });

  return result[0]?.insertId ?? result.insertId;
}

// ─── Sync deputies from Câmara ────────────────────────────────────────────────
export async function syncDeputados(
  onProgress?: (current: number, total: number, name: string) => void
): Promise<{ imported: number; updated: number; errors: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const stats = { imported: 0, updated: 0, errors: 0 };

  console.log("[Sync] Fetching list of all deputies from Câmara API...");
  const list = await fetchAllDeputados();
  console.log(`[Sync] Found ${list.length} deputies`);

  for (let i = 0; i < list.length; i++) {
    const dep = list[i];
    try {
      onProgress?.(i + 1, list.length, dep.nome);

      // Get full details (includes CPF)
      await sleep(150); // rate limit
      const details = await fetchDeputadoDetails(dep.id);
      if (!details) continue;

      const cpf = formatCpf(details.cpf);
      const status = details.ultimoStatus ?? {};

      // Check if already exists
      const existing = await db.select({ id: parliamentarians.id })
        .from(parliamentarians)
        .where(eq(parliamentarians.external_id, `camara-${dep.id}`))
        .limit(1);

      const parlId = await upsertParliamentarian(db, {
        external_id: `camara-${dep.id}`,
        cpf,
        name: details.nomeCivil ?? dep.nome,
        party: status.siglaPartido ?? dep.siglaPartido ?? "—",
        state: status.siglaUf ?? dep.siglaUf ?? "—",
        role: "deputado_federal",
        bio: `Deputado(a) Federal por ${status.siglaUf ?? dep.siglaUf}. ${details.escolaridade ? `Escolaridade: ${details.escolaridade}.` : ""} Nascido(a) em ${details.municipioNascimento ?? "—"}/${details.ufNascimento ?? "—"}.`.trim(),
        source_camara: true,
        source_tse: false,
        source_senado: false,
        declared_income_monthly: "33689.11", // salário base deputado federal 2024
      });

      if (existing.length > 0) stats.updated++;
      else stats.imported++;

      // Import expenses for last 2 years (rate-limited)
      if (i % 10 === 0) { // only import expenses for every 10th deputy to avoid timeout
        const currentYear = new Date().getFullYear();
        try {
          const expenseData = await fetchDeputadoExpenses(dep.id, currentYear);
          await sleep(100);

          for (const exp of expenseData.slice(0, 20)) { // max 20 per deputy
            if (!exp.valorLiquido || exp.valorLiquido <= 0) continue;
            try {
              await db.insert(expenses).values({
                parliamentarian_id: parlId,
                category: exp.tipoDespesa ?? "Outros",
                amount: String(exp.valorLiquido),
                expense_date: exp.dataDocumento ? new Date(exp.dataDocumento) : new Date(),
                supplier_name: exp.nomeFornecedor ?? null,
                supplier_cnpj: exp.cnpjCpfFornecedor ? formatCpf(exp.cnpjCpfFornecedor) : null,
                description: exp.tipoDespesa ?? null,
                is_suspicious: exp.valorLiquido > 50000, // flag high-value expenses
                suspicion_reason: exp.valorLiquido > 50000 ? "Valor acima de R$ 50.000" : null,
                source: "camara",
              });
            } catch { /* ignore duplicate expenses */ }
          }
        } catch { /* expenses are optional */ }
      }

      // Calculate and upsert trust score
      const score = calculateTrustScore({
        hasExpenses: true,
        suspiciousExpenseRatio: 0,
        ghostCount: 0,
        totalEmployees: 0,
        assetGrowthRatio: 1,
        hasCpf: !!cpf,
      });

      try {
        await db.insert(trustScores).values({
          parliamentarian_id: parlId,
          overall_score: score.overall,
          transparency_score: score.transparency,
          asset_consistency_score: score.assetConsistency,
          expense_regularity_score: score.expenseRegularity,
          irregularity_score: score.irregularity,
          ghost_employee_count: 0,
          suspicious_contract_count: 0,
          asset_discrepancy_value: "0.00",
        });
      } catch { /* ignore duplicate scores */ }

    } catch (e) {
      console.error(`[Sync] Error processing deputy ${dep.id} (${dep.nome}):`, e);
      stats.errors++;
    }
  }

  return stats;
}

// ─── Sync senators from Senado ────────────────────────────────────────────────
export async function syncSenadores(
  onProgress?: (current: number, total: number, name: string) => void
): Promise<{ imported: number; updated: number; errors: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const stats = { imported: 0, updated: 0, errors: 0 };

  console.log("[Sync] Fetching list of all senators from Senado API...");
  const list = await fetchAllSenadores();
  console.log(`[Sync] Found ${list.length} senators`);

  for (let i = 0; i < list.length; i++) {
    const sen = list[i];
    try {
      const ident = sen.IdentificacaoParlamentar ?? {};
      const codigo = ident.CodigoParlamentar;
      const nome = ident.NomeParlamentar ?? ident.NomeCompletoParlamentar ?? "—";

      onProgress?.(i + 1, list.length, nome);

      // Get details for CPF
      await sleep(300);
      const details = await fetchSenadorDetails(codigo);
      const cpf = formatCpf(details?.IdentificacaoParlamentar?.CpfParlamentar);

      const existing = await db.select({ id: parliamentarians.id })
        .from(parliamentarians)
        .where(eq(parliamentarians.external_id, `senado-${codigo}`))
        .limit(1);

      const parlId = await upsertParliamentarian(db, {
        external_id: `senado-${codigo}`,
        cpf,
        name: ident.NomeCompletoParlamentar ?? nome,
        party: ident.SiglaPartidoParlamentar ?? "—",
        state: ident.UfParlamentar ?? "—",
        role: "senador",
        bio: `Senador(a) pelo estado de ${ident.UfParlamentar ?? "—"}, filiado ao ${ident.SiglaPartidoParlamentar ?? "—"}.`,
        source_senado: true,
        source_camara: false,
        source_tse: false,
        declared_income_monthly: "33763.00", // salário base senador 2024
      });

      if (existing.length > 0) stats.updated++;
      else stats.imported++;

      // Trust score
      const score = calculateTrustScore({
        hasExpenses: false,
        suspiciousExpenseRatio: 0,
        ghostCount: 0,
        totalEmployees: 0,
        assetGrowthRatio: 1,
        hasCpf: !!cpf,
      });

      try {
        await db.insert(trustScores).values({
          parliamentarian_id: parlId,
          overall_score: score.overall,
          transparency_score: score.transparency,
          asset_consistency_score: score.assetConsistency,
          expense_regularity_score: score.expenseRegularity,
          irregularity_score: score.irregularity,
          ghost_employee_count: 0,
          suspicious_contract_count: 0,
          asset_discrepancy_value: "0.00",
        });
      } catch { /* ignore duplicate */ }

    } catch (e) {
      console.error(`[Sync] Error processing senator:`, e);
      stats.errors++;
    }
  }

  return stats;
}

// ─── Full sync orchestrator ───────────────────────────────────────────────────
export async function runFullSync(
  onProgress?: (phase: string, current: number, total: number, name: string) => void
): Promise<{
  deputados: { imported: number; updated: number; errors: number };
  senadores: { imported: number; updated: number; errors: number };
  duration: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startTime = Date.now();

  // Log sync start
  await db.insert(syncLogs).values({
    source: "full",
    status: "running",
    started_at: new Date(),
  });

  let logId: number | null = null;
  try {
    // get latest log id (unused for now)
  } catch {}

  try {
    console.log("[Sync] Starting full sync...");

    const deputadosResult = await syncDeputados((c, t, n) =>
      onProgress?.("deputados", c, t, n)
    );

    const senadoresResult = await syncSenadores((c, t, n) =>
      onProgress?.("senadores", c, t, n)
    );

    const duration = Date.now() - startTime;

    // Update sync log
    await db.update(syncLogs)
      .set({
        status: "success",
        completed_at: new Date(),
        records_imported: deputadosResult.imported + senadoresResult.imported,
        records_updated: deputadosResult.updated + senadoresResult.updated,
        error_count: deputadosResult.errors + senadoresResult.errors,
      })
      .where(eq(syncLogs.status, "running"));

    console.log(`[Sync] Full sync completed in ${(duration / 1000).toFixed(1)}s`);
    console.log(`[Sync] Deputies: +${deputadosResult.imported} imported, ${deputadosResult.updated} updated, ${deputadosResult.errors} errors`);
    console.log(`[Sync] Senators: +${senadoresResult.imported} imported, ${senadoresResult.updated} updated, ${senadoresResult.errors} errors`);

    return { deputados: deputadosResult, senadores: senadoresResult, duration };

  } catch (e) {
    await db.update(syncLogs)
      .set({ status: "error", completed_at: new Date() })
      .where(eq(syncLogs.status, "running"));
    throw e;
  }
}

// ─── Quick sync: just list without details (faster) ──────────────────────────
export async function runQuickSync(
  onProgress?: (phase: string, current: number, total: number, name: string) => void
): Promise<{ imported: number; updated: number; errors: number; duration: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startTime = Date.now();
  let imported = 0, updated = 0, errors = 0;

  // Log
  await db.insert(syncLogs).values({
    source: "quick",
    status: "running",
    started_at: new Date(),
  });

  try {
    // Deputies (list only, no detail fetch — much faster)
    console.log("[QuickSync] Fetching deputies list...");
    const depList = await fetchAllDeputados();
    console.log(`[QuickSync] ${depList.length} deputies found`);

    for (let i = 0; i < depList.length; i++) {
      const dep = depList[i];
      onProgress?.("deputados", i + 1, depList.length, dep.nome);
      try {
        const existing = await db.select({ id: parliamentarians.id })
          .from(parliamentarians)
          .where(eq(parliamentarians.external_id, `camara-${dep.id}`))
          .limit(1);

        if (existing.length === 0) {
          const insertResult = await db.insert(parliamentarians).values({
            external_id: `camara-${dep.id}`,
            cpf: `C${dep.id}`,  // placeholder até sync completo
            name: dep.nome,
            party: dep.siglaPartido ?? "—",
            state: dep.siglaUf ?? "—",
            role: "deputado_federal",
            bio: `Deputado(a) Federal por ${dep.siglaUf}. Legislatura 57 (2023–2027).`,
            source_camara: true,
            source_senado: false,
            source_tse: false,
            declared_income_monthly: "33689.11",
          });
          const newParlId = (insertResult as any)[0]?.insertId ?? (insertResult as any).insertId;
          if (newParlId) {
            await db.insert(trustScores).values({
              parliamentarian_id: newParlId,
              overall_score: 75,
              transparency_score: 70,
              asset_consistency_score: 80,
              expense_regularity_score: 75,
              irregularity_score: 75,
              ghost_employee_count: 0,
              suspicious_contract_count: 0,
              asset_discrepancy_value: "0.00",
            }).catch(() => {});
          }
          imported++;
        } else {
          // Update party/state in case it changed
          await db.update(parliamentarians)
            .set({ party: dep.siglaPartido ?? "—", state: dep.siglaUf ?? "—", updatedAt: new Date() })
            .where(eq(parliamentarians.id, existing[0].id));
          updated++;
        }
      } catch (e) {
        errors++;
      }
      if (i % 50 === 0) await sleep(100);
    }

    // Fix trust scores for newly inserted parliamentarians
    const newParls = await db.select({ id: parliamentarians.id })
      .from(parliamentarians)
      .where(eq(parliamentarians.source_camara, true));

    for (const p of newParls) {
      try {
        await db.insert(trustScores).values({
          parliamentarian_id: p.id,
          overall_score: 75,
          transparency_score: 70,
          asset_consistency_score: 80,
          expense_regularity_score: 75,
          irregularity_score: 75,
          ghost_employee_count: 0,
          suspicious_contract_count: 0,
          asset_discrepancy_value: "0.00",
        });
      } catch { /* already exists */ }
    }

    // Senators
    console.log("[QuickSync] Fetching senators list...");
    const senList = await fetchAllSenadores();
    console.log(`[QuickSync] ${senList.length} senators found`);

    for (let i = 0; i < senList.length; i++) {
      const sen = senList[i];
      const ident = sen.IdentificacaoParlamentar ?? {};
      const nome = ident.NomeParlamentar ?? "—";
      const codigo = ident.CodigoParlamentar;

      onProgress?.("senadores", i + 1, senList.length, nome);
      try {
        const existing = await db.select({ id: parliamentarians.id })
          .from(parliamentarians)
          .where(eq(parliamentarians.external_id, `senado-${codigo}`))
          .limit(1);

        if (existing.length === 0) {
          const result = await db.insert(parliamentarians).values({
            external_id: `senado-${codigo}`,
            cpf: `S${codigo}`,  // placeholder até sync completo
            name: ident.NomeCompletoParlamentar ?? nome,
            party: ident.SiglaPartidoParlamentar ?? "—",
            state: ident.UfParlamentar ?? "—",
            role: "senador",
            bio: `Senador(a) pelo estado de ${ident.UfParlamentar ?? "—"}, filiado ao ${ident.SiglaPartidoParlamentar ?? "—"}.`,
            source_senado: true,
            source_camara: false,
            source_tse: false,
            declared_income_monthly: "33763.00",
          });

          const newId = (result as any)[0]?.insertId ?? (result as any).insertId;
          if (newId) {
            await db.insert(trustScores).values({
              parliamentarian_id: newId,
              overall_score: 75,
              transparency_score: 70,
              asset_consistency_score: 80,
              expense_regularity_score: 75,
              irregularity_score: 75,
              ghost_employee_count: 0,
              suspicious_contract_count: 0,
              asset_discrepancy_value: "0.00",
            }).catch(() => {});
          }

          imported++;
        } else {
          updated++;
        }
      } catch (e) {
        errors++;
      }
    }

    const duration = Date.now() - startTime;

    await db.update(syncLogs)
      .set({
        status: "success",
        completed_at: new Date(),
        records_imported: imported,
        records_updated: updated,
        error_count: errors,
      })
      .where(eq(syncLogs.status, "running"));

    return { imported, updated, errors, duration };

  } catch (e) {
    await db.update(syncLogs)
      .set({ status: "error", completed_at: new Date() })
      .where(eq(syncLogs.status, "running"));
    throw e;
  }
}

// ─── Sync expenses for all existing parliamentarians ─────────────────────────
export async function syncExpensesForAll(
  batchSize = 50,
  onProgress?: (current: number, total: number, name: string) => void
): Promise<{ processed: number; expensesImported: number; errors: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const stats = { processed: 0, expensesImported: 0, errors: 0 };

  // Get all deputies from Câmara (they have external_id starting with "camara-")
  const allParls = await db.select({
    id: parliamentarians.id,
    external_id: parliamentarians.external_id,
    name: parliamentarians.name,
  })
    .from(parliamentarians)
    .where(eq(parliamentarians.source_camara, true));

  const total = allParls.length;
  console.log(`[SyncExpenses] Starting expense sync for ${total} deputies...`);

  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;

  for (let i = 0; i < allParls.length; i++) {
    const parl = allParls[i];
    onProgress?.(i + 1, total, parl.name ?? "");

    // Extract Câmara numeric ID from external_id (e.g. "camara-204536" → 204536)
    const match = parl.external_id?.match(/^camara-(\d+)$/);
    if (!match) continue;
    const camaraId = parseInt(match[1]);

    try {
      // Check if already has expenses
      const existingExpenses = await db.select({ id: expenses.id })
        .from(expenses)
        .where(eq(expenses.parliamentarian_id, parl.id))
        .limit(1);

      if (existingExpenses.length > 0) {
        stats.processed++;
        continue; // already has expenses, skip
      }

      await sleep(200); // rate limit

      // Fetch expenses for current and previous year
      let allExpenses: any[] = [];
      try {
        const expCurrent = await fetchDeputadoExpenses(camaraId, currentYear);
        allExpenses.push(...expCurrent);
      } catch {}

      if (allExpenses.length < 5) {
        try {
          await sleep(150);
          const expPrev = await fetchDeputadoExpenses(camaraId, prevYear);
          allExpenses.push(...expPrev);
        } catch {}
      }

      // Insert up to 30 expenses per parliamentarian
      let inserted = 0;
      for (const exp of allExpenses.slice(0, 30)) {
        if (!exp.valorLiquido || exp.valorLiquido <= 0) continue;
        try {
          await db.insert(expenses).values({
            parliamentarian_id: parl.id,
            category: exp.tipoDespesa ?? "Outros",
            amount: String(exp.valorLiquido),
            expense_date: exp.dataDocumento ? new Date(exp.dataDocumento) : new Date(),
            supplier_name: exp.nomeFornecedor ?? null,
            supplier_cnpj: exp.cnpjCpfFornecedor ? String(exp.cnpjCpfFornecedor).slice(0, 18) : null,
            description: exp.tipoDespesa ?? null,
            is_suspicious: exp.valorLiquido > 50000,
            suspicion_reason: exp.valorLiquido > 50000 ? "Valor acima de R$ 50.000" : null,
            source: "camara",
          });
          inserted++;
        } catch { /* ignore duplicates */ }
      }

      stats.expensesImported += inserted;
      stats.processed++;

      // Recalculate trust score with real expense data
      const suspiciousCount = allExpenses.filter(e => e.valorLiquido > 50000).length;
      const suspiciousRatio = allExpenses.length > 0 ? suspiciousCount / allExpenses.length : 0;

      const score = calculateTrustScore({
        hasExpenses: inserted > 0,
        suspiciousExpenseRatio: suspiciousRatio,
        ghostCount: 0,
        totalEmployees: 0,
        assetGrowthRatio: 1,
        hasCpf: true,
      });

      try {
        await db.update(trustScores)
          .set({
            overall_score: score.overall,
            transparency_score: score.transparency,
            expense_regularity_score: score.expenseRegularity,
          })
          .where(eq(trustScores.parliamentarian_id, parl.id));
      } catch {}

      // Rate limit: pause every batchSize to avoid hammering the API
      if ((i + 1) % batchSize === 0) {
        console.log(`[SyncExpenses] Progress: ${i + 1}/${total} (${stats.expensesImported} expenses imported)`);
        await sleep(500);
      }
    } catch (e) {
      console.error(`[SyncExpenses] Error for ${parl.name}:`, e);
      stats.errors++;
    }
  }

  console.log(`[SyncExpenses] Done: ${stats.processed} processed, ${stats.expensesImported} expenses imported, ${stats.errors} errors`);
  return stats;
}

// ─── Auto-sync on startup ─────────────────────────────────────────────────────
export async function runStartupSync(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Check if we have parliamentarians already
    const count = await db.select({ count: sql`COUNT(*)` }).from(parliamentarians);
    const total = Number((count[0] as any)?.count ?? 0);

    if (total < 100) {
      // First run: import all parliamentarians
      console.log("[StartupSync] First run detected, importing all parliamentarians...");
      await runQuickSync();
    } else {
      console.log(`[StartupSync] ${total} parliamentarians already in DB, skipping full import.`);
    }

    // Always check if expenses need to be populated (background, non-blocking)
    const expCount = await db.select({ count: sql`COUNT(*)` }).from(expenses);
    const expTotal = Number((expCount[0] as any)?.count ?? 0);

    if (expTotal < 10000) {
      console.log(`[StartupSync] Only ${expTotal} expenses found, starting background expense sync...`);
      // Run in background without awaiting
      syncExpensesForAll(50).then(r => {
        console.log(`[StartupSync] Background expense sync done: ${r.expensesImported} expenses imported`);
      }).catch(e => {
        console.error("[StartupSync] Background expense sync error:", e);
      });
    } else {
      console.log(`[StartupSync] ${expTotal} expenses already in DB, skipping expense sync.`);
    }
  } catch (e) {
    console.error("[StartupSync] Error:", e);
  }
}
