import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { AlertTriangle, FileText, DollarSign, Building, Link } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const RISK_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#16a34a",
};

const RISK_LABELS: Record<string, string> = {
  critical: "CRÍTICO",
  high: "ALTO",
  medium: "MÉDIO",
  low: "BAIXO",
};

export default function ContractAnalysis() {
  const { id } = useParams<{ id: string }>();
  const parlId = parseInt(id ?? "0");

  const { data: parlData } = trpc.parliamentarian.getById.useQuery({ id: parlId });
  const { data, isLoading } = trpc.analysis.contracts.useQuery({ parliamentarianId: parlId });

  if (isLoading) return (
    <AppLayout parliamentarianId={parlId} parliamentarianName="...">
      <div className="py-20 text-center"><p className="mono-label animate-pulse">ANALISANDO CONTRATOS...</p></div>
    </AppLayout>
  );

  const all = data?.all ?? [];
  const shellCompanies = data?.shellCompanies ?? [];
  const linkedContracts = data?.linkedContracts ?? [];
  const totalValue = data?.totalValue ?? 0;
  const suspiciousValue = data?.suspiciousValue ?? 0;

  const chartData = all.map(c => ({
    name: c.contractor_name.length > 20 ? c.contractor_name.slice(0, 18) + "…" : c.contractor_name,
    value: parseFloat(String(c.value)),
    risk: c.risk_level ?? "low",
  })).sort((a, b) => b.value - a.value);

  return (
    <AppLayout parliamentarianId={parlId} parliamentarianName={parlData?.name}>
      <div className="mb-8" style={{ borderBottom: "3px solid black", paddingBottom: "2rem" }}>
        <p className="mono-label mb-2">[ MÓDULO DE ANÁLISE ]</p>
        <h1 className="text-4xl font-black mb-2">CONTRATOS<br />SUSPEITOS</h1>
        <p className="text-sm" style={{ color: "#666" }}>
          Análise de contratos públicos para detectar empresas de fachada, concentração e vínculos com parlamentares. Fonte: TCU.
        </p>
      </div>

      {shellCompanies.length > 0 && (
        <div className="flex items-start gap-3 p-4 mb-8" style={{ background: "#dc2626", color: "white" }}>
          <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-black">{shellCompanies.length} EMPRESA{shellCompanies.length > 1 ? "S" : ""} DE FACHADA IDENTIFICADA{shellCompanies.length > 1 ? "S" : ""}</p>
            <p className="text-sm mt-1 opacity-90">
              Valor total em contratos suspeitos: R$ {suspiciousValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.
              Empresas sem histórico operacional ou com vínculos diretos ao parlamentar.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 mb-8" style={{ border: "2px solid black" }}>
        {[
          { label: "Total Contratos", value: all.length, sub: "analisados", icon: FileText },
          { label: "Empresas Fachada", value: shellCompanies.length, sub: "identificadas", icon: Building, alert: shellCompanies.length > 0 },
          { label: "Vínculos Diretos", value: linkedContracts.length, sub: "com parlamentar", icon: Link, alert: linkedContracts.length > 0 },
          { label: "Valor Suspeito", value: `R$ ${(suspiciousValue / 1000000).toFixed(1)}M`, sub: "em contratos", icon: DollarSign, alert: suspiciousValue > 0 },
        ].map((stat, i) => (
          <div key={i} className="p-5" style={{ borderRight: i < 3 ? "2px solid black" : "none" }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="mono-label mb-1">{stat.label}</p>
                <p className={`text-3xl font-black ${(stat as any).alert ? "text-red-600" : ""}`}>{stat.value}</p>
                <p className="mono-label mt-1">{stat.sub}</p>
              </div>
              <stat.icon size={18} style={{ color: (stat as any).alert ? "#dc2626" : "#bbb" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="brutal-card mb-8">
        <p className="mono-label mb-1">VALOR POR CONTRATO</p>
        <h3 className="font-black text-lg mb-4">Distribuição por Empresa Contratada</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 10, fontFamily: "Space Mono" }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontFamily: "Space Mono" }} width={160} />
            <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Valor"]} />
            <Bar dataKey="value" radius={0}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={RISK_COLORS[entry.risk] ?? "#1a1a1a"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-4 mt-3">
          {Object.entries(RISK_LABELS).map(([k, v]) => (
            <span key={k} className="mono-label flex items-center gap-1">
              <span style={{ display: "inline-block", width: 10, height: 10, background: RISK_COLORS[k] }} />
              {v}
            </span>
          ))}
        </div>
      </div>

      {/* Contract list */}
      <div>
        <p className="mono-label mb-2">[ LISTA COMPLETA ]</p>
        <h3 className="font-black text-xl mb-4">Todos os Contratos Analisados</h3>
        <div style={{ border: "2px solid black" }}>
          {all.map((c, i) => (
            <div key={c.id} className="p-5" style={{ borderBottom: i < all.length - 1 ? "2px solid black" : "none" }}>
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h4 className="font-black">{c.contractor_name}</h4>
                    <span className="data-tag" style={{ color: RISK_COLORS[c.risk_level ?? "low"], borderColor: RISK_COLORS[c.risk_level ?? "low"] }}>
                      {RISK_LABELS[c.risk_level ?? "low"]}
                    </span>
                    {c.is_shell_company && <span className="data-tag risk-critical">FACHADA</span>}
                    {c.has_parliamentarian_link && <span className="data-tag risk-high">VÍNCULO</span>}
                  </div>
                  <p className="mono-label mb-1">CNPJ: {c.contractor_cnpj} · Nº {c.contract_number}</p>
                  <p className="text-sm mb-2" style={{ color: "#555" }}>{c.object_description}</p>
                  {c.link_description && (
                    <div className="flex items-start gap-2 p-3 mt-2" style={{ background: "#fff7ed", border: "1px solid #ea580c" }}>
                      <AlertTriangle size={14} style={{ color: "#ea580c", flexShrink: 0, marginTop: 2 }} />
                      <p className="text-xs font-bold" style={{ color: "#ea580c" }}>{c.link_description}</p>
                    </div>
                  )}
                  <div className="flex gap-4 mt-3">
                    <span className="mono-label">{c.contracting_entity}</span>
                    <span className="mono-label">
                      {c.start_date ? new Date(c.start_date).getFullYear() : "—"} –{" "}
                      {c.end_date ? new Date(c.end_date).getFullYear() : "—"}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="mono-label">Valor</p>
                  <p className="font-black text-2xl">R$ {parseFloat(String(c.value)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
