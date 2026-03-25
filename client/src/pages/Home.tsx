import { useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { Search, Shield, AlertTriangle, BarChart2, Users, TrendingUp, FileText, ArrowRight, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function validateCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  return rem === parseInt(digits[10]);
}

function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#16a34a" : score >= 50 ? "#ca8a04" : score >= 30 ? "#ea580c" : "#dc2626";
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="butt"
        transform="rotate(-90 50 50)" />
      <text x="50" y="54" textAnchor="middle" fontSize="18" fontWeight="900" fontFamily="Inter" fill={color}>{score}</text>
    </svg>
  );
}

// BUG 2 + 7 fix: removed hardcoded FEATURED array — now fetched dynamically from DB

function FeaturedCard({
  parl, index, riskLabel, getRisk, navigate
}: {
  parl: { id: number; name: string; party?: string | null; state?: string | null; role: string };
  index: number;
  riskLabel: Record<string, string>;
  getRisk: (score: number) => string;
  navigate: (to: string) => void;
}) {
  const { data: scoreData } = trpc.analysis.trustScore.useQuery({ parliamentarianId: parl.id });
  const score = scoreData?.overall_score ?? 75;
  const risk = getRisk(score);
  const roleLabel = parl.role === "deputado_federal" ? "Dep. Federal" : parl.role === "senador" ? "Senador(a)" : parl.role;
  return (
    <div
      className="p-6 cursor-pointer transition-colors hover:bg-gray-50"
      style={{ borderRight: index < 3 ? "2px solid black" : "none", borderBottom: index < 2 ? "2px solid black" : "none" }}
      onClick={() => navigate(`/parlamentar/${parl.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <span className={`data-tag text-xs risk-${risk}`} style={{ border: "none", padding: "0.15rem 0.5rem" }}>
          {riskLabel[risk]}
        </span>
        <ScoreRing score={Math.round(score)} />
      </div>
      <h3 className="font-black text-base leading-tight mb-1">{parl.name}</h3>
      <p className="mono-label">{roleLabel} · {parl.party ?? "—"}/{parl.state ?? "—"}</p>
      <div className="mt-4 flex items-center gap-1 text-xs font-bold uppercase tracking-wider" style={{ color: "#666" }}>
        Ver análise <ChevronRight size={12} />
      </div>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [isCpfMode, setIsCpfMode] = useState(false);

  // BUG 2 + 7 fix: fetch real parliamentarians and count from DB
  const { data: parlCount } = trpc.parliamentarian.count.useQuery();
  const featuredInput = useMemo(() => ({ query: "", limit: 4 }), []);
  const { data: featuredData } = trpc.parliamentarian.search.useQuery(featuredInput);
  const featured = featuredData?.slice(0, 4) ?? [];

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "");
    const isNumeric = digits.length > 0 && raw.replace(/[\d.\-\s]/g, "").length === 0;
    if (isNumeric || digits.length > 0) {
      setIsCpfMode(true);
      setQuery(formatCpf(raw));
      setCpfError("");
    } else {
      setIsCpfMode(false);
      setQuery(raw);
      setCpfError("");
    }
  }, []);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    if (isCpfMode) {
      const digits = query.replace(/\D/g, "");
      if (digits.length === 11 && !validateCpf(query)) {
        setCpfError("CPF inválido. Verifique os dígitos.");
        return;
      }
    }
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }, [query, isCpfMode, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const riskLabel: Record<string, string> = { critical: "CRÍTICO", high: "ALTO", medium: "MÉDIO", low: "BAIXO" };

  function getRisk(score: number): string {
    if (score < 30) return "critical";
    if (score < 50) return "high";
    if (score < 70) return "medium";
    return "low";
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header style={{ borderBottom: "3px solid black" }}>
        <div className="container flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-black flex items-center justify-center flex-shrink-0">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <span className="font-black text-base tracking-widest uppercase">PARLIAMENT</span>
              <span className="font-black text-base tracking-widest uppercase" style={{ color: "#666" }}> MONITOR</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <span className="mono-label hidden sm:block">Dados públicos · TSE · Câmara · Senado</span>
            <button className="brutal-btn text-xs" onClick={() => navigate("/search")}>
              <Search size={13} />
              Buscar
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-16 lg:py-24">
        <div className="max-w-4xl">
          <p className="mono-label mb-6">[ SISTEMA DE AUDITORIA PARLAMENTAR ]</p>
          <h1 className="text-6xl sm:text-7xl lg:text-9xl font-black leading-none tracking-tighter mb-8" style={{ fontFamily: "Inter" }}>
            FISCALIZE<br />
            <span style={{ WebkitTextStroke: "3px black", color: "transparent" }}>O PODER</span>
          </h1>
          <p className="text-lg font-medium max-w-xl mb-12 leading-relaxed" style={{ color: "#444" }}>
            Cruzamento automatizado de dados públicos via inteligência artificial. Identifique irregularidades, funcionários fantasmas e contratos suspeitos de parlamentares brasileiros.
          </p>

          {/* Search box */}
          <div className="max-w-2xl">
            <div className="flex flex-col sm:flex-row gap-0" style={{ border: "3px solid black" }}>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder="CPF ou nome do parlamentar..."
                  className="w-full px-5 py-4 text-base font-semibold outline-none bg-white"
                  style={{ fontFamily: query && isCpfMode ? "Space Mono, monospace" : "Space Grotesk, sans-serif", letterSpacing: isCpfMode ? "0.1em" : "normal" }}
                />
                {isCpfMode && query.replace(/\D/g, "").length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 mono-label text-xs">
                    {query.replace(/\D/g, "").length}/11
                  </span>
                )}
              </div>
              <button
                onClick={handleSearch}
                className="brutal-btn sm:border-l-0 justify-center"
                style={{ borderWidth: "0", borderLeft: "3px solid black", minWidth: "140px" }}
              >
                <Search size={15} />
                ANALISAR
              </button>
            </div>
            {cpfError && (
              <p className="mt-2 text-sm font-bold" style={{ color: "#dc2626" }}>
                <AlertTriangle size={13} className="inline mr-1" />
                {cpfError}
              </p>
            )}
            <p className="mt-3 mono-label">
              Digite CPF (com ou sem formatação) ou nome completo
            </p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ borderTop: "3px solid black", borderBottom: "3px solid black", background: "black" }}>
        <div className="container py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
            {[
              { label: "Parlamentares Monitorados", value: parlCount != null ? String(parlCount) : "—" },
              { label: "Bases de Dados Integradas", value: "4" },
              { label: "Irregularidades Detectadas", value: "23" },
              { label: "Relatórios Gerados", value: "∞" },
            ].map((stat, i) => (
              <div key={i} className="px-6 py-2 text-white" style={{ borderRight: i < 3 ? "1px solid #333" : "none" }}>
                <p className="text-3xl font-black">{stat.value}</p>
                <p className="mono-label text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured parliamentarians */}
      <section className="container py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="mono-label mb-2">[ ANÁLISES RECENTES ]</p>
            <h2 className="text-4xl font-black">PARLAMENTARES<br />EM DESTAQUE</h2>
          </div>
          <button className="brutal-btn-outline text-xs" onClick={() => navigate("/search")}>
            Ver todos <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0" style={{ border: "2px solid black" }}>
          {featured.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-6 animate-pulse" style={{ borderRight: i < 3 ? "2px solid black" : "none" }}>
                  <div className="h-4 bg-gray-200 rounded mb-4 w-16" />
                  <div className="h-6 bg-gray-200 rounded mb-2 w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))
            : featured.map((p, i) => (
                <FeaturedCard
                  key={p.id}
                  parl={p}
                  index={i}
                  riskLabel={riskLabel}
                  getRisk={getRisk}
                  navigate={navigate}
                />
              ))
          }
        </div>
      </section>

      {/* Features */}
      <section style={{ borderTop: "3px solid black" }}>
        <div className="container py-16">
          <p className="mono-label mb-4">[ MÓDULOS DE ANÁLISE ]</p>
          <h2 className="text-4xl font-black mb-12">O QUE ANALISAMOS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0" style={{ border: "2px solid black" }}>
            {[
              { icon: Users, title: "Funcionários Fantasmas", desc: "Cruzamento de folha de pagamento com registros de presença e atividade parlamentar para identificar possíveis funcionários fictícios.", tag: "TSE · CÂMARA" },
              { icon: TrendingUp, title: "Patrimônio Incompatível", desc: "Comparação da evolução patrimonial declarada com a renda oficial. Identifica crescimento atípico e bens não justificados.", tag: "TSE · DECLARAÇÕES" },
              { icon: FileText, title: "Contratos Suspeitos", desc: "Análise de contratos públicos para detectar empresas de fachada, concentração de contratos e vínculos com parlamentares.", tag: "TCU · CONTRATOS" },
              { icon: BarChart2, title: "Score de Confiabilidade", desc: "Índice calculado por IA com base em transparência, consistência patrimonial, regularidade de despesas e indícios de irregularidades.", tag: "ANÁLISE IA" },
              { icon: Shield, title: "Relatórios Narrativos", desc: "Relatórios investigativos gerados por LLM que contextualizam padrões suspeitos e sugerem áreas prioritárias de investigação.", tag: "LLM · GPT" },
              { icon: Search, title: "Busca por CPF", desc: "Consulta instantânea por CPF ou nome com validação automática. Dados cruzados do TSE, Câmara dos Deputados e Senado Federal.", tag: "TSE · CÂMARA · SENADO" },
            ].map((f, i) => (
              <div key={i} className="p-6" style={{ borderRight: (i % 3 !== 2) ? "2px solid black" : "none", borderBottom: i < 3 ? "2px solid black" : "none" }}>
                <div className="w-10 h-10 border-2 border-black flex items-center justify-center mb-4">
                  <f.icon size={18} />
                </div>
                <h3 className="font-black text-lg mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "#555" }}>{f.desc}</p>
                <span className="mono-label">{f.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section style={{ background: "black", color: "white" }}>
        <div className="container py-12">
          <div className="flex flex-wrap items-center gap-8">
            <div>
              <p className="mono-label text-gray-500 mb-2">FONTES DE DADOS</p>
              <p className="font-black text-xl">Dados 100% Públicos</p>
            </div>
            <div className="flex flex-wrap gap-4">
              {["TSE", "CÂMARA DOS DEPUTADOS", "SENADO FEDERAL", "TCU", "PORTAL DA TRANSPARÊNCIA"].map(s => (
                <span key={s} className="data-tag text-white border-gray-600">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "3px solid black" }}>
        <div className="container py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-black text-sm tracking-widest uppercase">Parliament Monitor</p>
            <p className="mono-label mt-1">Desenvolvido por Bruno César · Dados públicos · Uso educacional</p>
          </div>
          <div className="flex gap-6">
            <span className="mono-label">Lei de Acesso à Informação</span>
            <span className="mono-label">Lei da Transparência</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
