import { useLocation, Link } from "wouter";
import { Search, Shield, AlertTriangle, ChevronRight, ArrowLeft, Users, FileText } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "#16a34a" : score >= 50 ? "#ca8a04" : score >= 30 ? "#ea580c" : "#dc2626";
  const label = score >= 70 ? "BAIXO RISCO" : score >= 50 ? "RISCO MÉDIO" : score >= 30 ? "ALTO RISCO" : "RISCO CRÍTICO";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="mono-label">{label}</span>
        <span className="font-black text-2xl" style={{ color }}>{score}</span>
      </div>
      <div className="h-2 bg-gray-100" style={{ border: "1px solid black" }}>
        <div className="h-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

export default function SearchResults() {
  const [location, navigate] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const initialQuery = decodeURIComponent(params.get("q") ?? "");
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);

  const { data: results, isLoading, error } = trpc.parliamentarian.search.useQuery(
    { query: query.trim() },
    { enabled: query.trim().length > 0 }
  );

  // BUG 8 fix: removed stale first-result-only trust score query.
  // Each ResultCard already fetches its own score individually (see below).

  const handleSearch = useCallback(() => {
    if (!searchInput.trim()) return;
    setQuery(searchInput);
    navigate(`/search?q=${encodeURIComponent(searchInput)}`);
  }, [searchInput, navigate]);

  const roleLabel: Record<string, string> = {
    deputado_federal: "Dep. Federal",
    senador: "Senador(a)",
    vereador: "Vereador(a)",
    governador: "Governador(a)",
    prefeito: "Prefeito(a)",
    candidato: "Candidato(a)",
  };

  // Fetch scores for all results
  const scoreQueries = (results ?? []).map(r => r.id);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header style={{ borderBottom: "3px solid black" }}>
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-3 no-underline text-black">
            <div className="w-8 h-8 bg-black flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-black text-sm tracking-widest uppercase">Parliament Monitor</span>
          </Link>
          <Link href="/" className="brutal-btn-outline text-xs">
            <ArrowLeft size={13} />
            Início
          </Link>
        </div>
      </header>

      <div className="container py-10">
        {/* Search bar */}
        <div className="max-w-2xl mb-10">
          <p className="mono-label mb-3">[ BUSCA DE PARLAMENTARES ]</p>
          <div className="flex gap-0" style={{ border: "3px solid black" }}>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="CPF ou nome..."
              className="flex-1 px-5 py-3 text-base font-semibold outline-none bg-white"
            />
            <button onClick={handleSearch} className="brutal-btn" style={{ border: "none", borderLeft: "3px solid black" }}>
              <Search size={15} />
              BUSCAR
            </button>
          </div>
        </div>

        {/* Results */}
        {isLoading && (
          <div className="py-12 text-center">
            <p className="mono-label animate-pulse">ANALISANDO DADOS...</p>
          </div>
        )}

        {error && (
          <div className="brutal-card flex items-center gap-3 max-w-xl">
            <AlertTriangle size={20} />
            <p className="font-bold">Erro ao buscar dados. Tente novamente.</p>
          </div>
        )}

        {!isLoading && results && results.length === 0 && (
          <div className="py-12">
            <p className="mono-label mb-2">RESULTADO</p>
            <h2 className="text-3xl font-black mb-4">Nenhum parlamentar encontrado</h2>
            <p style={{ color: "#666" }}>Verifique o CPF ou nome informado e tente novamente.</p>
          </div>
        )}

        {results && results.length > 0 && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <p className="mono-label">{results.length} RESULTADO{results.length > 1 ? "S" : ""} ENCONTRADO{results.length > 1 ? "S" : ""}</p>
            </div>
            <div className="grid gap-0" style={{ border: "2px solid black" }}>
              {results.map((p, i) => (
                <ResultCard key={p.id} parliamentarian={p} index={i} total={results.length} roleLabel={roleLabel} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ parliamentarian: p, index, total, roleLabel }: {
  parliamentarian: any;
  index: number;
  total: number;
  roleLabel: Record<string, string>;
}) {
  const [, navigate] = useLocation();
  const { data: trustScore } = trpc.analysis.trustScore.useQuery({ parliamentarianId: p.id });

  const score = trustScore?.overall_score ?? null;
  const riskColor = score === null ? "#666" : score >= 70 ? "#16a34a" : score >= 50 ? "#ca8a04" : score >= 30 ? "#ea580c" : "#dc2626";
  const riskLabel = score === null ? "—" : score >= 70 ? "BAIXO RISCO" : score >= 50 ? "RISCO MÉDIO" : score >= 30 ? "ALTO RISCO" : "RISCO CRÍTICO";

  return (
    <div
      className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
      style={{ borderBottom: index < total - 1 ? "2px solid black" : "none" }}
      onClick={() => navigate(`/parlamentar/${p.id}`)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h3 className="font-black text-xl">{p.name}</h3>
            <span className="data-tag">{p.party}/{p.state}</span>
            <span className="data-tag">{roleLabel[p.role] ?? p.role}</span>
          </div>
          <p className="mono-label mb-3">{p.cpf}</p>
          {p.bio && <p className="text-sm leading-relaxed max-w-xl" style={{ color: "#555" }}>{p.bio}</p>}
          <div className="flex flex-wrap gap-4 mt-3">
            {p.source_tse && <span className="mono-label">TSE ✓</span>}
            {p.source_camara && <span className="mono-label">CÂMARA ✓</span>}
            {p.source_senado && <span className="mono-label">SENADO ✓</span>}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          {score !== null ? (
            <div>
              <p className="text-4xl font-black" style={{ color: riskColor }}>{score}</p>
              <p className="mono-label" style={{ color: riskColor }}>{riskLabel}</p>
              <p className="mono-label mt-1">Score / 100</p>
            </div>
          ) : (
            <div className="w-16 h-16 border-2 border-gray-200 flex items-center justify-center">
              <span className="mono-label">—</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs font-bold uppercase tracking-wider" style={{ color: "#888" }}>
        Analisar parlamentar <ChevronRight size={12} />
      </div>
    </div>
  );
}
