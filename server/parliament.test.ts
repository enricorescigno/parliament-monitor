import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  searchParliamentarians: vi.fn().mockResolvedValue([
    {
      id: 1,
      cpf: "123.456.789-00",
      name: "Ricardo Almeida Santos",
      party: "PSD",
      state: "SP",
      role: "deputado_federal",
      declared_income_monthly: "33689.11",
      bio: "Deputado Federal por São Paulo",
      source_tse: true,
      source_camara: true,
      source_senado: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getParliamentarianById: vi.fn().mockResolvedValue({
    id: 1,
    cpf: "123.456.789-00",
    name: "Ricardo Almeida Santos",
    party: "PSD",
    state: "SP",
    role: "deputado_federal",
    declared_income_monthly: "33689.11",
    bio: "Deputado Federal por São Paulo",
    source_tse: true,
    source_camara: true,
    source_senado: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getParliamentarianByCpf: vi.fn().mockResolvedValue({
    id: 1,
    cpf: "123.456.789-00",
    name: "Ricardo Almeida Santos",
    party: "PSD",
    state: "SP",
    role: "deputado_federal",
  }),
  getExpensesByParliamentarian: vi.fn().mockResolvedValue([
    { id: 1, parliamentarian_id: 1, category: "Combustíveis", amount: "500.00", expense_date: new Date(), is_suspicious: false, supplier_name: "Posto X", supplier_cnpj: "12.345.678/0001-90", source: "camara" },
    { id: 2, parliamentarian_id: 1, category: "Consultorias", amount: "22000.00", expense_date: new Date(), is_suspicious: true, suspicion_reason: "Valor acima da média", supplier_name: "Consultoria Y", supplier_cnpj: "98.765.432/0001-10", source: "camara" },
  ]),
  getAssetsByParliamentarian: vi.fn().mockResolvedValue([
    { id: 1, parliamentarian_id: 1, declaration_year: 2020, asset_type: "Imóvel Urbano", description: "Apartamento SP", value: "650000.00", total_declared: "850000.00" },
    { id: 2, parliamentarian_id: 1, declaration_year: 2022, asset_type: "Imóvel Urbano", description: "Apartamento SP", value: "820000.00", total_declared: "1450000.00" },
  ]),
  getContractsByParliamentarian: vi.fn().mockResolvedValue([
    { id: 1, parliamentarian_id: 1, contract_number: "CONT-001", contractor_name: "Empresa Legítima S.A.", contractor_cnpj: "11.111.111/0001-11", value: "50000.00", is_shell_company: false, has_parliamentarian_link: false, risk_level: "low", start_date: new Date(), end_date: new Date(), object_description: "Serviços administrativos", contracting_entity: "Câmara" },
  ]),
  getEmployeesByParliamentarian: vi.fn().mockResolvedValue([
    { id: 1, parliamentarian_id: 1, name: "Funcionário Regular", role_title: "Assessor", salary: "5000.00", attendance_rate: 0.92, is_ghost_suspect: false, multiple_employers: false, cpf: "111.111.111-11" },
    { id: 2, parliamentarian_id: 1, name: "Funcionário Suspeito", role_title: "Assessor", salary: "12500.00", attendance_rate: 0.08, is_ghost_suspect: true, ghost_reason: "Taxa de presença inferior a 20%", multiple_employers: false, cpf: "222.222.222-22" },
  ]),
  getLatestTrustScore: vi.fn().mockResolvedValue({
    id: 1,
    parliamentarian_id: 1,
    overall_score: 72,
    transparency_score: 80,
    asset_consistency_score: 75,
    expense_regularity_score: 70,
    irregularity_score: 65,
    ghost_employee_count: 0,
    suspicious_contract_count: 0,
    asset_discrepancy_value: "0.00",
    calculated_at: new Date(),
  }),
  getAuditReports: vi.fn().mockResolvedValue([]),
  insertAuditReport: vi.fn().mockResolvedValue({ insertId: 1 }),
  logSearch: vi.fn().mockResolvedValue(undefined),
  getRecentSearches: vi.fn().mockResolvedValue([]),
  getAllParliamentarians: vi.fn().mockResolvedValue([]),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Relatório de teste gerado pela IA." } }],
  }),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("parliamentarian.search", () => {
  it("returns search results for a name query", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.parliamentarian.search({ query: "Ricardo" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Ricardo Almeida Santos");
  });

  it("returns search results for a CPF query", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.parliamentarian.search({ query: "123.456.789-00" });
    expect(result).toHaveLength(1);
    expect(result[0].cpf).toBe("123.456.789-00");
  });
});

describe("parliamentarian.getById", () => {
  it("returns parliamentarian data by ID", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.parliamentarian.getById({ id: 1 });
    expect(result.id).toBe(1);
    expect(result.name).toBe("Ricardo Almeida Santos");
    expect(result.party).toBe("PSD");
  });
});

describe("parliamentarian.getFullProfile", () => {
  it("returns full profile with all related data", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.parliamentarian.getFullProfile({ id: 1 });
    expect(result.parl.id).toBe(1);
    expect(result.expenses).toHaveLength(2);
    expect(result.assets).toHaveLength(2);
    expect(result.contracts).toHaveLength(1);
    expect(result.employees).toHaveLength(2);
    expect(result.trustScore?.overall_score).toBe(72);
  });
});

describe("analysis.expenses", () => {
  it("groups expenses by category and identifies suspicious ones", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analysis.expenses({ parliamentarianId: 1 });
    expect(result.suspiciousCount).toBe(1);
    expect(result.totalAmount).toBeGreaterThan(0);
    expect(result.byCategory["Consultorias"]).toBeDefined();
    expect(result.byCategory["Consultorias"].suspicious).toBe(1);
  });
});

describe("analysis.assets", () => {
  it("calculates asset growth rate correctly", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analysis.assets({ parliamentarianId: 1 });
    expect(result.years).toContain(2020);
    expect(result.years).toContain(2022);
    expect(result.growthRate).toBeGreaterThan(0);
  });
});

describe("analysis.ghostEmployees", () => {
  it("identifies ghost employee suspects correctly", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analysis.ghostEmployees({ parliamentarianId: 1 });
    expect(result.ghostCount).toBe(1);
    expect(result.ghosts[0].name).toBe("Funcionário Suspeito");
    expect(result.ghosts[0].attendance_rate).toBeLessThan(0.2);
  });
});

describe("analysis.contracts", () => {
  it("identifies shell companies in contracts", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analysis.contracts({ parliamentarianId: 1 });
    expect(result.shellCompanies).toHaveLength(0);
    expect(result.all).toHaveLength(1);
    expect(result.totalValue).toBe(50000);
  });
});

describe("analysis.trustScore", () => {
  it("returns trust score for a parliamentarian", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analysis.trustScore({ parliamentarianId: 1 });
    expect(result?.overall_score).toBe(72);
    expect(result?.transparency_score).toBe(80);
  });
});

describe("report.generate", () => {
  it("generates a narrative report using LLM", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.report.generate({ parliamentarianId: 1, reportType: "summary" });
    expect(result.narrative).toBe("Relatório de teste gerado pela IA.");
    expect(["low", "medium", "high", "critical"]).toContain(result.riskLevel);
  });
});
