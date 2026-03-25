import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  searchParliamentarians, getParliamentarianById, getParliamentarianByCpf,
  getExpensesByParliamentarian, getAssetsByParliamentarian,
  getContractsByParliamentarian, getEmployeesByParliamentarian,
  getLatestTrustScore, getAuditReports, insertAuditReport,
  logSearch, getRecentSearches, getAllParliamentarians,
} from "./db";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Parliamentarians ───────────────────────────────────────────────────────
  parliamentarian: router({
    search: publicProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input, ctx }) => {
        const results = await searchParliamentarians(input.query);
        const queryType = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/.test(input.query) ? "cpf" : "name";
        await logSearch(input.query, queryType, results.length, ctx.user?.id);
        return results;
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const parl = await getParliamentarianById(input.id);
        if (!parl) throw new Error("Parlamentar não encontrado");
        return parl;
      }),

    getByCpf: publicProcedure
      .input(z.object({ cpf: z.string() }))
      .query(async ({ input }) => {
        const parl = await getParliamentarianByCpf(input.cpf);
        if (!parl) throw new Error("Parlamentar não encontrado");
        return parl;
      }),

    listAll: publicProcedure.query(async () => {
      return getAllParliamentarians();
    }),

    // Full profile with all data
    getFullProfile: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const [parl, expenses, assets, contracts, employees, trustScore] = await Promise.all([
          getParliamentarianById(input.id),
          getExpensesByParliamentarian(input.id),
          getAssetsByParliamentarian(input.id),
          getContractsByParliamentarian(input.id),
          getEmployeesByParliamentarian(input.id),
          getLatestTrustScore(input.id),
        ]);
        if (!parl) throw new Error("Parlamentar não encontrado");
        return { parl, expenses, assets, contracts, employees, trustScore };
      }),
  }),

  // ─── Analysis Modules ───────────────────────────────────────────────────────
  analysis: router({
    trustScore: publicProcedure
      .input(z.object({ parliamentarianId: z.number() }))
      .query(async ({ input }) => {
        return getLatestTrustScore(input.parliamentarianId);
      }),

    expenses: publicProcedure
      .input(z.object({ parliamentarianId: z.number() }))
      .query(async ({ input }) => {
        const data = await getExpensesByParliamentarian(input.parliamentarianId);
        // Group by category
        const byCategory: Record<string, { total: number; count: number; suspicious: number }> = {};
        for (const e of data) {
          const cat = e.category ?? "Outros";
          if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0, suspicious: 0 };
          byCategory[cat].total += parseFloat(String(e.amount));
          byCategory[cat].count++;
          if (e.is_suspicious) byCategory[cat].suspicious++;
        }
        // Monthly totals
        const byMonth: Record<string, number> = {};
        for (const e of data) {
          const key = `${e.expense_date.getFullYear()}-${String(e.expense_date.getMonth() + 1).padStart(2, "0")}`;
          byMonth[key] = (byMonth[key] ?? 0) + parseFloat(String(e.amount));
        }
        const totalAmount = data.reduce((s, e) => s + parseFloat(String(e.amount)), 0);
        const suspiciousCount = data.filter(e => e.is_suspicious).length;
        return { raw: data, byCategory, byMonth, totalAmount, suspiciousCount };
      }),

    assets: publicProcedure
      .input(z.object({ parliamentarianId: z.number() }))
      .query(async ({ input }) => {
        const data = await getAssetsByParliamentarian(input.parliamentarianId);
        // Group by year
        const byYear: Record<number, { total: number; items: typeof data }> = {};
        for (const a of data) {
          if (!byYear[a.declaration_year]) byYear[a.declaration_year] = { total: 0, items: [] };
          byYear[a.declaration_year].total += parseFloat(String(a.value));
          byYear[a.declaration_year].items.push(a);
        }
        // Calculate growth
        const years = Object.keys(byYear).map(Number).sort();
        let growthRate = 0;
        if (years.length >= 2) {
          const first = byYear[years[0]].total;
          const last = byYear[years[years.length - 1]].total;
          growthRate = first > 0 ? ((last - first) / first) * 100 : 0;
        }
        return { raw: data, byYear, years, growthRate };
      }),

    ghostEmployees: publicProcedure
      .input(z.object({ parliamentarianId: z.number() }))
      .query(async ({ input }) => {
        const data = await getEmployeesByParliamentarian(input.parliamentarianId);
        const ghosts = data.filter(e => e.is_ghost_suspect);
        const multipleEmployers = data.filter(e => e.multiple_employers);
        const totalPayroll = data.reduce((s, e) => s + parseFloat(String(e.salary ?? 0)), 0);
        const ghostPayroll = ghosts.reduce((s, e) => s + parseFloat(String(e.salary ?? 0)), 0);
        return { all: data, ghosts, multipleEmployers, totalPayroll, ghostPayroll, ghostCount: ghosts.length };
      }),

    contracts: publicProcedure
      .input(z.object({ parliamentarianId: z.number() }))
      .query(async ({ input }) => {
        const data = await getContractsByParliamentarian(input.parliamentarianId);
        const shellCompanies = data.filter(c => c.is_shell_company);
        const linkedContracts = data.filter(c => c.has_parliamentarian_link);
        const criticalContracts = data.filter(c => c.risk_level === "critical" || c.risk_level === "high");
        const totalValue = data.reduce((s, c) => s + parseFloat(String(c.value)), 0);
        const suspiciousValue = shellCompanies.reduce((s, c) => s + parseFloat(String(c.value)), 0);
        return { all: data, shellCompanies, linkedContracts, criticalContracts, totalValue, suspiciousValue };
      }),

    reports: publicProcedure
      .input(z.object({ parliamentarianId: z.number() }))
      .query(async ({ input }) => {
        return getAuditReports(input.parliamentarianId);
      }),
  }),

  // ─── LLM Report Generation ──────────────────────────────────────────────────
  report: router({
    generate: publicProcedure
      .input(z.object({ parliamentarianId: z.number(), reportType: z.enum(["full", "ghost_employees", "assets", "contracts", "summary"]) }))
      .mutation(async ({ input }) => {
        const [parl, expenses, assets, contracts, employees, trustScore] = await Promise.all([
          getParliamentarianById(input.parliamentarianId),
          getExpensesByParliamentarian(input.parliamentarianId),
          getAssetsByParliamentarian(input.parliamentarianId),
          getContractsByParliamentarian(input.parliamentarianId),
          getEmployeesByParliamentarian(input.parliamentarianId),
          getLatestTrustScore(input.parliamentarianId),
        ]);

        if (!parl) throw new Error("Parlamentar não encontrado");

        const ghosts = employees.filter(e => e.is_ghost_suspect);
        const shellContracts = contracts.filter(c => c.is_shell_company);
        const suspiciousExpenses = expenses.filter(e => e.is_suspicious);
        const totalAssets = assets.reduce((s, a) => s + parseFloat(String(a.value)), 0);

        const contextData = {
          nome: parl.name,
          partido: parl.party,
          estado: parl.state,
          cargo: parl.role,
          score_confiabilidade: trustScore?.overall_score ?? 0,
          total_despesas: expenses.reduce((s, e) => s + parseFloat(String(e.amount)), 0),
          despesas_suspeitas: suspiciousExpenses.length,
          total_patrimonio: totalAssets,
          funcionarios_fantasma: ghosts.length,
          contratos_empresa_fachada: shellContracts.length,
          valor_contratos_suspeitos: shellContracts.reduce((s, c) => s + parseFloat(String(c.value)), 0),
        };

        const systemPrompt = `Você é um analista especializado em combate à corrupção e fiscalização de gastos públicos no Brasil. 
Sua função é gerar relatórios investigativos detalhados, objetivos e baseados em dados sobre parlamentares brasileiros.
Escreva em português brasileiro formal, com linguagem técnica mas acessível.
Seja direto sobre irregularidades encontradas, cite valores específicos e contextualize os padrões suspeitos.
Não faça julgamentos definitivos de culpa, mas indique claramente os indícios e recomende investigações.`;

        const userPrompt = `Gere um relatório investigativo ${input.reportType === "full" ? "completo" : `focado em ${input.reportType}`} para o parlamentar com os seguintes dados:

**Dados do Parlamentar:**
- Nome: ${contextData.nome}
- Partido: ${contextData.partido} | Estado: ${contextData.estado} | Cargo: ${contextData.cargo}
- Score de Confiabilidade: ${contextData.score_confiabilidade}/100

**Resumo das Análises:**
- Total de despesas analisadas: R$ ${contextData.total_despesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Despesas com indícios de irregularidade: ${contextData.despesas_suspeitas}
- Patrimônio total declarado: R$ ${contextData.total_patrimonio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Funcionários com suspeita de fantasma: ${contextData.funcionarios_fantasma}
- Contratos com empresas de fachada: ${contextData.contratos_empresa_fachada}
- Valor total em contratos suspeitos: R$ ${contextData.valor_contratos_suspeitos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}

${ghosts.length > 0 ? `**Funcionários Suspeitos:**\n${ghosts.map(g => `- ${g.name}: ${g.ghost_reason}`).join("\n")}` : ""}
${shellContracts.length > 0 ? `**Contratos Suspeitos:**\n${shellContracts.map(c => `- ${c.contractor_name}: R$ ${parseFloat(String(c.value)).toLocaleString("pt-BR")} - ${c.link_description ?? "empresa de fachada"}`).join("\n")}` : ""}

O relatório deve incluir:
1. Sumário executivo (2-3 parágrafos)
2. Principais achados e irregularidades identificadas
3. Análise de risco e contextualização
4. Áreas prioritárias para investigação
5. Recomendações

Seja específico, cite valores e datas quando relevante.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const rawContent = response.choices[0]?.message?.content;
        const narrative = typeof rawContent === "string" ? rawContent : "Relatório não disponível.";
        const riskLevel = (trustScore?.overall_score ?? 50) < 30 ? "critical" : (trustScore?.overall_score ?? 50) < 50 ? "high" : (trustScore?.overall_score ?? 50) < 70 ? "medium" : "low";

        await insertAuditReport({
          parliamentarian_id: input.parliamentarianId,
          report_type: input.reportType,
          title: `Relatório ${input.reportType === "full" ? "Completo" : input.reportType} — ${parl.name}`,
          narrative,
          key_findings: JSON.stringify([
            `Score de confiabilidade: ${trustScore?.overall_score ?? 0}/100`,
            `${ghosts.length} funcionário(s) com suspeita de fantasma`,
            `${shellContracts.length} contrato(s) com empresas de fachada`,
            `${suspiciousExpenses.length} despesa(s) com indícios de irregularidade`,
          ]),
          priority_areas: JSON.stringify(
            [
              ghosts.length > 0 && "Investigação de funcionários fantasmas",
              shellContracts.length > 0 && "Auditoria de contratos públicos",
              suspiciousExpenses.length > 0 && "Revisão de despesas parlamentares",
              (trustScore?.asset_consistency_score ?? 100) < 50 && "Incompatibilidade patrimonial",
            ].filter(Boolean)
          ),
          risk_level: riskLevel as "low" | "medium" | "high" | "critical",
          generated_by: "llm",
        });

        return { narrative, riskLevel, contextData };
      }),
  }),

  // ─── Recent Searches ────────────────────────────────────────────────────────
  searches: router({
    recent: publicProcedure.query(async () => {
      return getRecentSearches(8);
    }),
  }),
});

export type AppRouter = typeof appRouter;
