/**
 * Seed script — realistic mock data for Brazilian parliamentarians.
 * Run once via: npx tsx server/seed.ts
 */
import { drizzle } from "drizzle-orm/mysql2";
import {
  parliamentarians, expenses, assets, contracts, employees, trustScores
} from "../drizzle/schema";
import dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.DATABASE_URL!);

const PARLIAMENTARIANS = [
  {
    cpf: "123.456.789-00",
    name: "Ricardo Almeida Santos",
    party: "PSD",
    state: "SP",
    role: "deputado_federal" as const,
    declared_income_monthly: "33689.11",
    bio: "Deputado Federal por São Paulo, 3º mandato. Membro da Comissão de Finanças e Tributação.",
    source_tse: true, source_camara: true, source_senado: false,
    tse_candidate_id: "TSE-2022-SP-12345",
    camara_deputy_id: "CAM-204567",
  },
  {
    cpf: "234.567.890-11",
    name: "Fernanda Oliveira Costa",
    party: "PT",
    state: "MG",
    role: "senador" as const,
    declared_income_monthly: "33763.00",
    bio: "Senadora por Minas Gerais, 1º mandato. Ex-prefeita de Belo Horizonte.",
    source_tse: true, source_camara: false, source_senado: true,
    tse_candidate_id: "TSE-2022-MG-67890",
    senado_senator_id: "SEN-00234",
  },
  {
    cpf: "345.678.901-22",
    name: "Carlos Eduardo Mendes",
    party: "PL",
    state: "RJ",
    role: "deputado_federal" as const,
    declared_income_monthly: "33689.11",
    bio: "Deputado Federal pelo Rio de Janeiro, 2º mandato. Presidente da Frente Parlamentar Agropecuária.",
    source_tse: true, source_camara: true, source_senado: false,
    tse_candidate_id: "TSE-2022-RJ-11111",
    camara_deputy_id: "CAM-301122",
  },
  {
    cpf: "456.789.012-33",
    name: "Ana Paula Ferreira Lima",
    party: "PSDB",
    state: "RS",
    role: "deputado_federal" as const,
    declared_income_monthly: "33689.11",
    bio: "Deputada Federal pelo Rio Grande do Sul, 1º mandato. Advogada e professora universitária.",
    source_tse: true, source_camara: true, source_senado: false,
    tse_candidate_id: "TSE-2022-RS-22222",
    camara_deputy_id: "CAM-401233",
  },
  {
    cpf: "567.890.123-44",
    name: "José Roberto Nascimento",
    party: "MDB",
    state: "BA",
    role: "senador" as const,
    declared_income_monthly: "33763.00",
    bio: "Senador pela Bahia, 2º mandato. Ex-governador do estado.",
    source_tse: true, source_camara: false, source_senado: true,
    tse_candidate_id: "TSE-2018-BA-33333",
    senado_senator_id: "SEN-00567",
  },
];

async function seedParliamentarians() {
  console.log("Seeding parliamentarians...");
  for (const p of PARLIAMENTARIANS) {
    await db.insert(parliamentarians).values(p).onDuplicateKeyUpdate({ set: { name: p.name } });
  }
  const all = await db.select().from(parliamentarians);
  return all;
}

async function seedExpenses(parl: typeof parliamentarians.$inferSelect[]) {
  console.log("Seeding expenses...");
  const categories = ["Combustíveis e Lubrificantes", "Divulgação da Atividade Parlamentar", "Passagens Aéreas", "Alimentação", "Hospedagem", "Serviços Postais", "Telefonia", "Locação de Veículos", "Consultorias"];
  const suppliers = [
    { name: "Posto Ipiranga Brasília", cnpj: "12.345.678/0001-90" },
    { name: "Gráfica Rápida LTDA", cnpj: "23.456.789/0001-01" },
    { name: "LATAM Airlines Brasil", cnpj: "02.012.862/0001-60" },
    { name: "Restaurante do Congresso", cnpj: "34.567.890/0001-12" },
    { name: "Hotel Nacional Brasília", cnpj: "45.678.901/0001-23" },
    { name: "Correios", cnpj: "34.028.316/0001-03" },
    { name: "Claro S.A.", cnpj: "40.432.544/0001-47" },
    { name: "Localiza Rent a Car", cnpj: "16.670.085/0001-55" },
    { name: "Consultoria Política Estratégica LTDA", cnpj: "98.765.432/0001-10" },
  ];

  for (const p of parl) {
    const numExpenses = p.name === "Carlos Eduardo Mendes" ? 48 : 24;
    for (let i = 0; i < numExpenses; i++) {
      const cat = categories[i % categories.length];
      const sup = suppliers[i % suppliers.length];
      const baseAmount = cat === "Passagens Aéreas" ? 1800 : cat === "Divulgação da Atividade Parlamentar" ? 15000 : cat === "Consultorias" ? 22000 : 800;
      const amount = (baseAmount * (0.7 + Math.random() * 0.6)).toFixed(2);
      const isSuspicious = (p.name === "Carlos Eduardo Mendes" && (cat === "Consultorias" || cat === "Divulgação da Atividade Parlamentar")) ||
        (p.name === "José Roberto Nascimento" && cat === "Alimentação" && parseFloat(amount) > 3000);
      const date = new Date(2023, Math.floor(i / 4), (i % 28) + 1);
      await db.insert(expenses).values({
        parliamentarian_id: p.id,
        source: p.source_camara ? "camara" : "senado",
        category: cat,
        description: `${cat} - ${sup.name}`,
        supplier_name: sup.name,
        supplier_cnpj: sup.cnpj,
        amount,
        expense_date: date,
        document_number: `NF-${2023000 + i}`,
        is_suspicious: isSuspicious,
        suspicion_reason: isSuspicious ? `Valor acima da média histórica para categoria ${cat}` : null,
      });
    }
  }
}

async function seedAssets(parl: typeof parliamentarians.$inferSelect[]) {
  console.log("Seeding assets...");
  const assetTypes = ["Imóvel Urbano", "Veículo Automotor", "Aplicação Financeira", "Imóvel Rural", "Participação Societária"];

  const assetData: Record<string, { year: number; total: number; items: { type: string; desc: string; value: number }[] }[]> = {
    "Ricardo Almeida Santos": [
      { year: 2018, total: 850000, items: [{ type: "Imóvel Urbano", desc: "Apartamento em São Paulo - SP", value: 650000 }, { type: "Veículo Automotor", desc: "Honda Civic 2018", value: 85000 }, { type: "Aplicação Financeira", desc: "CDB Banco Itaú", value: 115000 }] },
      { year: 2020, total: 1100000, items: [{ type: "Imóvel Urbano", desc: "Apartamento em São Paulo - SP", value: 720000 }, { type: "Veículo Automotor", desc: "Toyota Corolla 2020", value: 110000 }, { type: "Aplicação Financeira", desc: "CDB Banco Itaú", value: 270000 }] },
      { year: 2022, total: 1450000, items: [{ type: "Imóvel Urbano", desc: "Apartamento em São Paulo - SP", value: 820000 }, { type: "Imóvel Urbano", desc: "Casa em Campinas - SP", value: 380000 }, { type: "Veículo Automotor", desc: "BMW 320i 2022", value: 250000 }] },
    ],
    "Carlos Eduardo Mendes": [
      { year: 2018, total: 1200000, items: [{ type: "Imóvel Urbano", desc: "Cobertura no Rio de Janeiro - RJ", value: 900000 }, { type: "Veículo Automotor", desc: "Land Rover Discovery 2018", value: 300000 }] },
      { year: 2020, total: 3800000, items: [{ type: "Imóvel Urbano", desc: "Cobertura no Rio de Janeiro - RJ", value: 1200000 }, { type: "Imóvel Rural", desc: "Fazenda em Mato Grosso - 500 ha", value: 1800000 }, { type: "Participação Societária", desc: "Agropecuária Mendes LTDA", value: 800000 }] },
      { year: 2022, total: 7200000, items: [{ type: "Imóvel Urbano", desc: "Cobertura no Rio de Janeiro - RJ", value: 1500000 }, { type: "Imóvel Rural", desc: "Fazenda em Mato Grosso - 1200 ha", value: 3500000 }, { type: "Participação Societária", desc: "Agropecuária Mendes LTDA", value: 1800000 }, { type: "Aplicação Financeira", desc: "Investimentos no exterior", value: 400000 }] },
    ],
    "Fernanda Oliveira Costa": [
      { year: 2018, total: 620000, items: [{ type: "Imóvel Urbano", desc: "Casa em Belo Horizonte - MG", value: 480000 }, { type: "Veículo Automotor", desc: "Volkswagen Tiguan 2018", value: 140000 }] },
      { year: 2020, total: 780000, items: [{ type: "Imóvel Urbano", desc: "Casa em Belo Horizonte - MG", value: 550000 }, { type: "Veículo Automotor", desc: "Volkswagen Tiguan 2020", value: 160000 }, { type: "Aplicação Financeira", desc: "Tesouro Direto", value: 70000 }] },
      { year: 2022, total: 950000, items: [{ type: "Imóvel Urbano", desc: "Casa em Belo Horizonte - MG", value: 620000 }, { type: "Imóvel Urbano", desc: "Apartamento em Brasília - DF", value: 220000 }, { type: "Aplicação Financeira", desc: "Tesouro Direto", value: 110000 }] },
    ],
    "Ana Paula Ferreira Lima": [
      { year: 2018, total: 420000, items: [{ type: "Imóvel Urbano", desc: "Apartamento em Porto Alegre - RS", value: 350000 }, { type: "Veículo Automotor", desc: "Fiat Argo 2018", value: 70000 }] },
      { year: 2020, total: 510000, items: [{ type: "Imóvel Urbano", desc: "Apartamento em Porto Alegre - RS", value: 390000 }, { type: "Veículo Automotor", desc: "Fiat Argo 2020", value: 85000 }, { type: "Aplicação Financeira", desc: "Poupança Bradesco", value: 35000 }] },
      { year: 2022, total: 640000, items: [{ type: "Imóvel Urbano", desc: "Apartamento em Porto Alegre - RS", value: 450000 }, { type: "Veículo Automotor", desc: "Jeep Compass 2022", value: 140000 }, { type: "Aplicação Financeira", desc: "CDB Bradesco", value: 50000 }] },
    ],
    "José Roberto Nascimento": [
      { year: 2018, total: 2100000, items: [{ type: "Imóvel Urbano", desc: "Mansão em Salvador - BA", value: 1500000 }, { type: "Imóvel Rural", desc: "Fazenda na Bahia - 300 ha", value: 600000 }] },
      { year: 2020, total: 4500000, items: [{ type: "Imóvel Urbano", desc: "Mansão em Salvador - BA", value: 1800000 }, { type: "Imóvel Rural", desc: "Fazenda na Bahia - 800 ha", value: 1800000 }, { type: "Participação Societária", desc: "Construtora Nascimento S.A.", value: 900000 }] },
      { year: 2022, total: 8900000, items: [{ type: "Imóvel Urbano", desc: "Mansão em Salvador - BA", value: 2200000 }, { type: "Imóvel Urbano", desc: "Penthouse em São Paulo - SP", value: 2100000 }, { type: "Imóvel Rural", desc: "Fazenda na Bahia - 2000 ha", value: 3200000 }, { type: "Participação Societária", desc: "Construtora Nascimento S.A.", value: 1400000 }] },
    ],
  };

  for (const p of parl) {
    const data = assetData[p.name];
    if (!data) continue;
    for (const yearData of data) {
      for (const item of yearData.items) {
        await db.insert(assets).values({
          parliamentarian_id: p.id,
          declaration_year: yearData.year,
          asset_type: item.type,
          description: item.desc,
          value: item.value.toFixed(2),
          total_declared: yearData.total.toFixed(2),
          source: "tse",
        });
      }
    }
  }
}

async function seedContracts(parl: typeof parliamentarians.$inferSelect[]) {
  console.log("Seeding contracts...");
  for (const p of parl) {
    const isHighRisk = p.name === "Carlos Eduardo Mendes" || p.name === "José Roberto Nascimento";
    const numContracts = isHighRisk ? 8 : 2;
    for (let i = 0; i < numContracts; i++) {
      const isShell = isHighRisk && i < 3;
      const hasLink = isHighRisk && i < 4;
      const value = isShell ? (500000 + i * 300000).toFixed(2) : (50000 + i * 30000).toFixed(2);
      await db.insert(contracts).values({
        parliamentarian_id: p.id,
        contract_number: `CONT-${p.id}-${2023 + i}-${String(i).padStart(3, "0")}`,
        contracting_entity: isHighRisk ? "Prefeitura Municipal" : "Câmara dos Deputados",
        contractor_name: isShell ? `Empresa Fachada ${String.fromCharCode(65 + i)} LTDA` : `Fornecedor Legítimo ${i + 1} S.A.`,
        contractor_cnpj: `${String(p.id * 10 + i).padStart(2, "0")}.${String(i * 100).padStart(3, "0")}.${String(i * 10).padStart(3, "0")}/0001-${String(i * 7).padStart(2, "0")}`,
        object_description: isShell ? "Serviços de consultoria e assessoria técnica especializada" : "Fornecimento de material de escritório e serviços administrativos",
        value,
        start_date: new Date(2022 + i, 0, 1),
        end_date: new Date(2023 + i, 11, 31),
        is_shell_company: isShell,
        has_parliamentarian_link: hasLink,
        link_description: hasLink ? `Sócio da empresa é cunhado do parlamentar ${p.name}` : null,
        risk_level: isShell ? "critical" : hasLink ? "high" : "low",
        source: "tcu",
      });
    }
  }
}

async function seedEmployees(parl: typeof parliamentarians.$inferSelect[]) {
  console.log("Seeding employees...");
  const roles = ["Assessor Parlamentar", "Chefe de Gabinete", "Secretário Legislativo", "Assessor de Comunicação", "Assessor Técnico"];
  for (const p of parl) {
    const isHighRisk = p.name === "Carlos Eduardo Mendes" || p.name === "José Roberto Nascimento";
    const numEmployees = isHighRisk ? 12 : 6;
    for (let i = 0; i < numEmployees; i++) {
      const isGhost = isHighRisk && i < 3;
      const hasMultiple = isHighRisk && i < 2;
      await db.insert(employees).values({
        parliamentarian_id: p.id,
        cpf: `${String(p.id * 10 + i).padStart(3, "0")}.${String(i + 1).padStart(3, "0")}.${String(p.id).padStart(3, "0")}-${String(i).padStart(2, "0")}`,
        name: `Funcionário ${i + 1} de ${p.name.split(" ")[0]}`,
        role_title: roles[i % roles.length],
        salary: isGhost ? "12500.00" : (4500 + i * 800).toFixed(2),
        hire_date: new Date(2023, 0, 1),
        attendance_rate: isGhost ? 0.12 : 0.85 + Math.random() * 0.15,
        is_ghost_suspect: isGhost,
        ghost_reason: isGhost ? "Taxa de presença inferior a 20% nos últimos 6 meses. Sem registros de atividade parlamentar." : null,
        multiple_employers: hasMultiple,
        source: p.source_camara ? "camara" : "senado",
      });
    }
  }
}

async function seedTrustScores(parl: typeof parliamentarians.$inferSelect[]) {
  console.log("Seeding trust scores...");
  const scores: Record<string, { overall: number; transparency: number; asset: number; expense: number; irregularity: number; ghosts: number; contracts: number; discrepancy: string }> = {
    "Ricardo Almeida Santos": { overall: 72, transparency: 80, asset: 75, expense: 70, irregularity: 65, ghosts: 0, contracts: 0, discrepancy: "0.00" },
    "Fernanda Oliveira Costa": { overall: 85, transparency: 90, asset: 88, expense: 82, irregularity: 80, ghosts: 0, contracts: 0, discrepancy: "0.00" },
    "Carlos Eduardo Mendes": { overall: 23, transparency: 35, asset: 15, expense: 28, irregularity: 12, ghosts: 3, contracts: 5, discrepancy: "5750000.00" },
    "Ana Paula Ferreira Lima": { overall: 91, transparency: 95, asset: 92, expense: 90, irregularity: 88, ghosts: 0, contracts: 0, discrepancy: "0.00" },
    "José Roberto Nascimento": { overall: 18, transparency: 25, asset: 10, expense: 22, irregularity: 8, ghosts: 3, contracts: 6, discrepancy: "6800000.00" },
  };
  for (const p of parl) {
    const s = scores[p.name];
    if (!s) continue;
    await db.insert(trustScores).values({
      parliamentarian_id: p.id,
      overall_score: s.overall,
      transparency_score: s.transparency,
      asset_consistency_score: s.asset,
      expense_regularity_score: s.expense,
      irregularity_score: s.irregularity,
      ghost_employee_count: s.ghosts,
      suspicious_contract_count: s.contracts,
      asset_discrepancy_value: s.discrepancy,
      analysis_details: JSON.stringify({
        total_expenses_analyzed: 24,
        suspicious_expenses: s.overall < 50 ? 8 : 1,
        asset_growth_rate: s.overall < 50 ? "487%" : "22%",
        income_vs_asset_ratio: s.overall < 50 ? "incompatível" : "compatível",
      }),
    });
  }
}

async function main() {
  console.log("Starting seed...");
  const parl = await seedParliamentarians();
  await seedExpenses(parl);
  await seedAssets(parl);
  await seedContracts(parl);
  await seedEmployees(parl);
  await seedTrustScores(parl);
  console.log("Seed complete!");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
