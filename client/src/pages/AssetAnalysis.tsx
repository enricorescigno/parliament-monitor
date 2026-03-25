import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { AlertTriangle, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ["#1a1a1a", "#555", "#888", "#bbb", "#ddd"];

export default function AssetAnalysis() {
  const { id } = useParams<{ id: string }>();
  const parlId = parseInt(id ?? "0");

  const { data: parlData } = trpc.parliamentarian.getById.useQuery({ id: parlId });
  const { data, isLoading } = trpc.analysis.assets.useQuery({ parliamentarianId: parlId });
  const { data: trustScore } = trpc.analysis.trustScore.useQuery({ parliamentarianId: parlId });

  if (isLoading) return (
    <AppLayout parliamentarianId={parlId} parliamentarianName="...">
      <div className="py-20 text-center"><p className="mono-label animate-pulse">ANALISANDO PATRIMÔNIO...</p></div>
    </AppLayout>
  );

  const byYear = data?.byYear ?? {};
  const years = data?.years ?? [];
  const growthRate = data?.growthRate ?? 0;
  const raw = data?.raw ?? [];

  const lineData = years.map(y => ({
    year: y,
    total: byYear[y]?.total ?? 0,
  }));

  // Asset types pie
  const typeMap: Record<string, number> = {};
  for (const a of raw) {
    const t = a.asset_type ?? "Outros";
    typeMap[t] = (typeMap[t] ?? 0) + parseFloat(String(a.value));
  }
  const pieData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

  const latestTotal = years.length > 0 ? (byYear[years[years.length - 1]]?.total ?? 0) : 0;
  const firstTotal = years.length > 0 ? (byYear[years[0]]?.total ?? 0) : 0;
  const absoluteGrowth = latestTotal - firstTotal;

  const declaredIncome = parseFloat(String(parlData?.declared_income_monthly ?? 0));
  const yearlyIncome = declaredIncome * 12 * (years.length > 1 ? years[years.length - 1] - years[0] : 1);
  const isIncompatible = absoluteGrowth > yearlyIncome * 1.5;

  const assetScore = trustScore?.asset_consistency_score ?? 100;
  const isHighRisk = assetScore < 50;

  return (
    <AppLayout parliamentarianId={parlId} parliamentarianName={parlData?.name}>
      <div className="mb-8" style={{ borderBottom: "3px solid black", paddingBottom: "2rem" }}>
        <p className="mono-label mb-2">[ MÓDULO DE ANÁLISE ]</p>
        <h1 className="text-4xl font-black mb-2">ANÁLISE<br />PATRIMONIAL</h1>
        <p className="text-sm" style={{ color: "#666" }}>
          Comparação da evolução patrimonial com a renda declarada. Fonte: TSE — Declarações de Bens.
        </p>
      </div>

      {isIncompatible && (
        <div className="flex items-start gap-3 p-4 mb-8" style={{ background: "#dc2626", color: "white" }}>
          <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-black">PATRIMÔNIO INCOMPATÍVEL COM RENDA DECLARADA</p>
            <p className="text-sm mt-1 opacity-90">
              Crescimento patrimonial de R$ {absoluteGrowth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({growthRate.toFixed(0)}%)
              supera em mais de 150% a renda declarada no período. Recomenda-se investigação aprofundada.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 mb-8" style={{ border: "2px solid black" }}>
        {[
          { label: "Patrimônio Atual", value: `R$ ${(latestTotal / 1000000).toFixed(2)}M`, sub: `Declarado em ${years[years.length - 1] ?? "—"}` },
          { label: "Crescimento Total", value: `${growthRate.toFixed(0)}%`, sub: `R$ ${(absoluteGrowth / 1000).toFixed(0)}k`, alert: isHighRisk },
          { label: "Score Patrimonial", value: `${Math.round(assetScore)}/100`, sub: isHighRisk ? "INCOMPATÍVEL" : "COMPATÍVEL", alert: isHighRisk },
          { label: "Renda Declarada/Ano", value: `R$ ${(declaredIncome * 12 / 1000).toFixed(0)}k`, sub: "Salário oficial" },
        ].map((stat, i) => (
          <div key={i} className="p-5" style={{ borderRight: i < 3 ? "2px solid black" : "none" }}>
            <p className="mono-label mb-1">{stat.label}</p>
            <p className={`text-3xl font-black ${stat.alert ? "text-red-600" : ""}`}>{stat.value}</p>
            <p className={`mono-label mt-1 ${stat.alert ? "text-red-600" : ""}`}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 mb-8" style={{ border: "2px solid black" }}>
        <div className="p-6" style={{ borderRight: "2px solid black" }}>
          <p className="mono-label mb-1">EVOLUÇÃO PATRIMONIAL</p>
          <h3 className="font-black text-lg mb-4">Por Ano de Declaração</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={lineData}>
              <XAxis dataKey="year" tick={{ fontSize: 11, fontFamily: "Space Mono" }} />
              <YAxis tick={{ fontSize: 10, fontFamily: "Space Mono" }} tickFormatter={v => `R$${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Patrimônio"]} />
              <Area type="monotone" dataKey="total" stroke="black" strokeWidth={2} fill="#f0f0f0" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="p-6">
          <p className="mono-label mb-1">COMPOSIÇÃO PATRIMONIAL</p>
          <h3 className="font-black text-lg mb-4">Por Tipo de Bem</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend formatter={(v) => <span style={{ fontFamily: "Space Mono", fontSize: "10px" }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Income vs asset comparison */}
      <div className="brutal-card mb-8">
        <p className="mono-label mb-1">ANÁLISE COMPARATIVA</p>
        <h3 className="font-black text-lg mb-6">Renda Acumulada vs. Crescimento Patrimonial</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="mono-label mb-1">Renda Oficial Acumulada</p>
            <p className="text-3xl font-black">R$ {(yearlyIncome / 1000).toFixed(0)}k</p>
            <p className="mono-label mt-1">No período analisado</p>
          </div>
          <div>
            <p className="mono-label mb-1">Crescimento Patrimonial</p>
            <p className={`text-3xl font-black ${isIncompatible ? "text-red-600" : ""}`}>
              R$ {(absoluteGrowth / 1000).toFixed(0)}k
            </p>
            <p className="mono-label mt-1">Variação declarada</p>
          </div>
          <div>
            <p className="mono-label mb-1">Razão Patrimônio/Renda</p>
            <p className={`text-3xl font-black ${isIncompatible ? "text-red-600" : ""}`}>
              {yearlyIncome > 0 ? (absoluteGrowth / yearlyIncome).toFixed(1) : "∞"}x
            </p>
            <p className="mono-label mt-1">{isIncompatible ? "INCOMPATÍVEL" : "Dentro do esperado"}</p>
          </div>
        </div>
      </div>

      {/* Asset list by year */}
      {years.map(year => (
        <div key={year} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-xl">{year}</h3>
            <p className="font-black text-xl">R$ {(byYear[year]?.total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
          <div style={{ border: "2px solid black" }}>
            {(byYear[year]?.items ?? []).map((asset, i) => (
              <div key={asset.id} className="p-4 flex items-center justify-between gap-4"
                style={{ borderBottom: i < (byYear[year]?.items.length ?? 0) - 1 ? "1px solid #eee" : "none" }}>
                <div>
                  <p className="font-bold text-sm">{asset.description}</p>
                  <span className="data-tag mt-1">{asset.asset_type}</span>
                </div>
                <p className="font-black text-lg flex-shrink-0">
                  R$ {parseFloat(String(asset.value)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </AppLayout>
  );
}
