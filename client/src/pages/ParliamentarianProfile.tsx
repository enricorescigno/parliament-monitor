import { useParams, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { AlertTriangle, Users, TrendingUp, FileText, Shield, BarChart2, ChevronRight, ExternalLink } from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from "recharts";

function ScoreGauge({ score }: { score: number }) {
  const r = 70;
  const circ = Math.PI * r; // half circle
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#16a34a" : score >= 50 ? "#ca8a04" : score >= 30 ? "#ea580c" : "#dc2626";
  const label = score >= 70 ? "BAIXO RISCO" : score >= 50 ? "RISCO MÉDIO" : score >= 30 ? "ALTO RISCO" : "RISCO CRÍTICO";
  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="100" viewBox="0 0 180 100">
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="butt" />
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke={color} strokeWidth="12" strokeLinecap="butt"
          strokeDasharray={`${dash} ${circ}`} />
        <text x="90" y="78" textAnchor="middle" fontSize="36" fontWeight="900" fontFamily="Inter" fill={color}>{score}</text>
        <text x="90" y="95" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="Space Mono" fill="#999" letterSpacing="2">/100</text>
      </svg>
      <p className="mono-label mt-1" style={{ color }}>{label}</p>
    </div>
  );
}

const SCORE_COLORS: Record<string, string> = {
  "Transparência": "#1a1a1a",
  "Consistência Patrimonial": "#444",
  "Regularidade de Despesas": "#777",
  "Ausência de Irregularidades": "#aaa",
};

export default function ParliamentarianProfile() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const parlId = parseInt(id ?? "0");

  const { data, isLoading, error } = trpc.parliamentarian.getFullProfile.useQuery({ id: parlId });

  if (isLoading) return (
    <AppLayout>
      <div className="py-20 text-center">
        <p className="mono-label animate-pulse text-lg">CARREGANDO DADOS...</p>
      </div>
    </AppLayout>
  );

  if (error || !data) return (
    <AppLayout>
      <div className="brutal-card flex items-center gap-3 max-w-xl">
        <AlertTriangle size={20} />
        <p className="font-bold">Parlamentar não encontrado.</p>
      </div>
    </AppLayout>
  );

  const { parl, expenses, assets, contracts, employees, trustScore } = data;

  const radarData = trustScore ? [
    { subject: "Transparência", value: trustScore.transparency_score },
    { subject: "Patrimônio", value: trustScore.asset_consistency_score },
    { subject: "Despesas", value: trustScore.expense_regularity_score },
    { subject: "Irregularidades", value: trustScore.irregularity_score },
  ] : [];

  const expenseByCategory: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.category ?? "Outros";
    expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + parseFloat(String(e.amount));
  }
  const expenseChartData = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 18) + "…" : name, value: Math.round(value) }));

  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(String(e.amount)), 0);
  const suspiciousExpenses = expenses.filter(e => e.is_suspicious).length;
  const ghostCount = employees.filter(e => e.is_ghost_suspect).length;
  const shellContracts = contracts.filter(c => c.is_shell_company).length;

  const roleLabel: Record<string, string> = {
    deputado_federal: "Deputado Federal",
    senador: "Senador(a)",
    vereador: "Vereador(a)",
    governador: "Governador(a)",
    prefeito: "Prefeito(a)",
    candidato: "Candidato(a)",
  };

  const riskColor = (trustScore?.overall_score ?? 50) >= 70 ? "#16a34a" : (trustScore?.overall_score ?? 50) >= 50 ? "#ca8a04" : (trustScore?.overall_score ?? 50) >= 30 ? "#ea580c" : "#dc2626";

  return (
    <AppLayout parliamentarianId={parlId} parliamentarianName={parl.name}>
      {/* Profile header */}
      <div className="mb-8" style={{ borderBottom: "3px solid black", paddingBottom: "2rem" }}>
        <p className="mono-label mb-3">[ PERFIL DO PARLAMENTAR ]</p>
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex-1">
            <h1 className="text-4xl lg:text-5xl font-black leading-none mb-3">{parl.name}</h1>
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="data-tag">{roleLabel[parl.role] ?? parl.role}</span>
              <span className="data-tag">{parl.party}/{parl.state}</span>
              <span className="data-tag font-mono">{parl.cpf}</span>
            </div>
            {parl.bio && <p className="text-sm leading-relaxed max-w-xl" style={{ color: "#555" }}>{parl.bio}</p>}
            <div className="flex flex-wrap gap-4 mt-4">
              {parl.source_tse && <span className="mono-label">✓ TSE</span>}
              {parl.source_camara && <span className="mono-label">✓ CÂMARA</span>}
              {parl.source_senado && <span className="mono-label">✓ SENADO</span>}
            </div>
          </div>
          {trustScore && (
            <div className="brutal-card flex-shrink-0 text-center" style={{ minWidth: "200px" }}>
              <p className="mono-label mb-3">SCORE DE CONFIABILIDADE</p>
              <ScoreGauge score={Math.round(trustScore.overall_score)} />
            </div>
          )}
        </div>
      </div>

      {/* Alert banners */}
      {(ghostCount > 0 || shellContracts > 0) && (
        <div className="mb-8 space-y-3">
          {ghostCount > 0 && (
            <div className="flex items-center gap-3 p-4" style={{ background: "#dc2626", color: "white" }}>
              <AlertTriangle size={18} />
              <p className="font-bold text-sm">{ghostCount} FUNCIONÁRIO{ghostCount > 1 ? "S" : ""} COM SUSPEITA DE FANTASMA DETECTADO{ghostCount > 1 ? "S" : ""}</p>
              <button className="ml-auto text-xs font-bold uppercase tracking-wider underline" onClick={() => navigate(`/parlamentar/${parlId}/funcionarios`)}>
                Ver análise →
              </button>
            </div>
          )}
          {shellContracts > 0 && (
            <div className="flex items-center gap-3 p-4" style={{ background: "#ea580c", color: "white" }}>
              <AlertTriangle size={18} />
              <p className="font-bold text-sm">{shellContracts} CONTRATO{shellContracts > 1 ? "S" : ""} COM EMPRESA{shellContracts > 1 ? "S" : ""} DE FACHADA IDENTIFICADO{shellContracts > 1 ? "S" : ""}</p>
              <button className="ml-auto text-xs font-bold uppercase tracking-wider underline" onClick={() => navigate(`/parlamentar/${parlId}/contratos`)}>
                Ver análise →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 mb-8" style={{ border: "2px solid black" }}>
        {[
          { label: "Total Despesas", value: `R$ ${(totalExpenses / 1000).toFixed(0)}k`, sub: `${suspiciousExpenses} suspeitas`, icon: BarChart2 },
          { label: "Funcionários", value: String(employees.length), sub: `${ghostCount} suspeitos`, icon: Users },
          { label: "Contratos", value: String(contracts.length), sub: `${shellContracts} fachada`, icon: FileText },
          { label: "Patrimônio", value: assets.length > 0 ? `R$ ${(assets.reduce((s, a) => s + parseFloat(String(a.value)), 0) / 1000000).toFixed(1)}M` : "—", sub: "declarado", icon: TrendingUp },
        ].map((stat, i) => (
          <div key={i} className="p-5" style={{ borderRight: i < 3 ? "2px solid black" : "none" }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="mono-label mb-1">{stat.label}</p>
                <p className="text-3xl font-black">{stat.value}</p>
                <p className="mono-label mt-1">{stat.sub}</p>
              </div>
              <stat.icon size={20} style={{ color: "#bbb" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 mb-8" style={{ border: "2px solid black" }}>
        {/* Radar */}
        <div className="p-6" style={{ borderRight: "2px solid black" }}>
          <p className="mono-label mb-1">DIMENSÕES DO SCORE</p>
          <h3 className="font-black text-lg mb-4">Análise por Categoria</h3>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontFamily: "Space Mono", fontWeight: 700 }} />
                <Radar name="Score" dataKey="value" stroke="black" fill="black" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <p className="mono-label py-8 text-center">Sem dados</p>}
        </div>

        {/* Expenses bar */}
        <div className="p-6">
          <p className="mono-label mb-1">DESPESAS POR CATEGORIA</p>
          <h3 className="font-black text-lg mb-4">Top 6 Categorias</h3>
          {expenseChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={expenseChartData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fontFamily: "Space Mono" }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontFamily: "Space Mono" }} width={120} />
                <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Total"]} />
                <Bar dataKey="value" fill="black" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="mono-label py-8 text-center">Sem dados</p>}
        </div>
      </div>

      {/* Score breakdown */}
      {trustScore && (
        <div className="brutal-card mb-8">
          <p className="mono-label mb-1">DETALHAMENTO DO SCORE</p>
          <h3 className="font-black text-lg mb-6">Componentes da Análise</h3>
          <div className="space-y-4">
            {[
              { label: "Transparência", score: trustScore.transparency_score, weight: "30%" },
              { label: "Consistência Patrimonial", score: trustScore.asset_consistency_score, weight: "25%" },
              { label: "Regularidade de Despesas", score: trustScore.expense_regularity_score, weight: "25%" },
              { label: "Ausência de Irregularidades", score: trustScore.irregularity_score, weight: "20%" },
            ].map(({ label, score, weight }) => {
              const c = score >= 70 ? "#16a34a" : score >= 50 ? "#ca8a04" : score >= 30 ? "#ea580c" : "#dc2626";
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{label}</span>
                    <div className="flex items-center gap-3">
                      <span className="mono-label">peso {weight}</span>
                      <span className="font-black text-xl" style={{ color: c }}>{Math.round(score)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100" style={{ border: "1px solid #ddd" }}>
                    <div className="h-full" style={{ width: `${score}%`, background: c }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0" style={{ border: "2px solid black" }}>
        {[
          { href: `/parlamentar/${parlId}/funcionarios`, icon: Users, label: "Funcionários Fantasmas", count: `${ghostCount} suspeitos`, risk: ghostCount > 0 },
          { href: `/parlamentar/${parlId}/patrimonio`, icon: TrendingUp, label: "Análise Patrimonial", count: `${assets.length} declarações`, risk: (trustScore?.asset_consistency_score ?? 100) < 50 },
          { href: `/parlamentar/${parlId}/contratos`, icon: FileText, label: "Contratos Suspeitos", count: `${shellContracts} de fachada`, risk: shellContracts > 0 },
          { href: `/parlamentar/${parlId}/relatorio`, icon: Shield, label: "Relatório IA", count: "Gerar análise", risk: false },
        ].map(({ href, icon: Icon, label, count, risk }, i) => (
          <Link key={href} href={href}
            className="p-5 flex flex-col gap-3 hover:bg-gray-50 transition-colors no-underline text-black"
            style={{ borderRight: i < 3 ? "2px solid black" : "none" }}>
            <div className="flex items-center justify-between">
              <Icon size={20} />
              {risk && <AlertTriangle size={14} style={{ color: "#dc2626" }} />}
            </div>
            <div>
              <p className="font-black text-sm">{label}</p>
              <p className="mono-label mt-0.5">{count}</p>
            </div>
            <div className="flex items-center gap-1 mono-label">
              Acessar <ChevronRight size={11} />
            </div>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
