import { useParams } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Shield, AlertTriangle, FileText, Loader2, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Streamdown } from "streamdown";

const REPORT_TYPES = [
  { value: "full", label: "Relatório Completo", desc: "Análise abrangente de todas as irregularidades identificadas" },
  { value: "ghost_employees", label: "Funcionários Fantasmas", desc: "Foco em irregularidades na folha de pagamento" },
  { value: "assets", label: "Análise Patrimonial", desc: "Incompatibilidade entre patrimônio e renda declarada" },
  { value: "contracts", label: "Contratos Suspeitos", desc: "Empresas de fachada e vínculos em contratos públicos" },
  { value: "summary", label: "Sumário Executivo", desc: "Resumo conciso dos principais achados" },
] as const;

type ReportType = typeof REPORT_TYPES[number]["value"];

export default function AuditReport() {
  const { id } = useParams<{ id: string }>();
  const parlId = parseInt(id ?? "0");
  const [selectedType, setSelectedType] = useState<ReportType>("full");
  const [generatedReport, setGeneratedReport] = useState<{ narrative: string; riskLevel: string; type: string } | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);

  const { data: parlData } = trpc.parliamentarian.getById.useQuery({ id: parlId });
  const { data: trustScore } = trpc.analysis.trustScore.useQuery({ parliamentarianId: parlId });
  const { data: reports, refetch: refetchReports } = trpc.analysis.reports.useQuery({ parliamentarianId: parlId });

  const generateMutation = trpc.report.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedReport({ narrative: data.narrative, riskLevel: data.riskLevel, type: selectedType });
      refetchReports();
    },
  });

  const riskColors: Record<string, string> = {
    critical: "#dc2626",
    high: "#ea580c",
    medium: "#ca8a04",
    low: "#16a34a",
  };

  const riskLabels: Record<string, string> = {
    critical: "RISCO CRÍTICO",
    high: "ALTO RISCO",
    medium: "RISCO MÉDIO",
    low: "BAIXO RISCO",
  };

  return (
    <AppLayout parliamentarianId={parlId} parliamentarianName={parlData?.name}>
      <div className="mb-8" style={{ borderBottom: "3px solid black", paddingBottom: "2rem" }}>
        <p className="mono-label mb-2">[ MÓDULO DE ANÁLISE ]</p>
        <h1 className="text-4xl font-black mb-2">RELATÓRIO<br />INVESTIGATIVO IA</h1>
        <p className="text-sm" style={{ color: "#666" }}>
          Relatórios narrativos gerados por inteligência artificial com base no cruzamento de dados públicos.
          Contextualiza padrões suspeitos e sugere áreas prioritárias de investigação.
        </p>
      </div>

      {/* Score summary */}
      {trustScore && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 mb-8" style={{ border: "2px solid black" }}>
          {[
            { label: "Score Geral", value: `${Math.round(trustScore.overall_score)}/100`, color: riskColors[trustScore.overall_score < 30 ? "critical" : trustScore.overall_score < 50 ? "high" : trustScore.overall_score < 70 ? "medium" : "low"] },
            { label: "Func. Fantasmas", value: String(trustScore.ghost_employee_count ?? 0), color: (trustScore.ghost_employee_count ?? 0) > 0 ? "#dc2626" : "#16a34a" },
            { label: "Contratos Suspeitos", value: String(trustScore.suspicious_contract_count ?? 0), color: (trustScore.suspicious_contract_count ?? 0) > 0 ? "#dc2626" : "#16a34a" },
            { label: "Discrepância Patrimonial", value: `R$ ${(parseFloat(String(trustScore.asset_discrepancy_value ?? 0)) / 1000000).toFixed(1)}M`, color: parseFloat(String(trustScore.asset_discrepancy_value ?? 0)) > 0 ? "#dc2626" : "#16a34a" },
          ].map((s, i) => (
            <div key={i} className="p-5" style={{ borderRight: i < 3 ? "2px solid black" : "none" }}>
              <p className="mono-label mb-1">{s.label}</p>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Report type selector */}
      <div className="mb-8">
        <p className="mono-label mb-3">TIPO DE RELATÓRIO</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0" style={{ border: "2px solid black" }}>
          {REPORT_TYPES.map((rt, i) => (
            <button
              key={rt.value}
              onClick={() => setSelectedType(rt.value)}
              className="p-4 text-left transition-colors"
              style={{
                borderRight: (i % 3 !== 2) ? "2px solid black" : "none",
                borderBottom: i < 3 ? "2px solid black" : "none",
                background: selectedType === rt.value ? "black" : "white",
                color: selectedType === rt.value ? "white" : "black",
              }}
            >
              <p className="font-black text-sm">{rt.label}</p>
              <p className="mono-label mt-1" style={{ color: selectedType === rt.value ? "#aaa" : "#666" }}>{rt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <div className="mb-8">
        <button
          onClick={() => generateMutation.mutate({ parliamentarianId: parlId, reportType: selectedType })}
          disabled={generateMutation.isPending}
          className="brutal-btn text-sm"
          style={{ minWidth: "240px" }}
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              GERANDO RELATÓRIO...
            </>
          ) : (
            <>
              <Shield size={15} />
              GERAR RELATÓRIO COM IA
            </>
          )}
        </button>
        {generateMutation.isPending && (
          <p className="mono-label mt-2 animate-pulse">Analisando dados e cruzando informações... isso pode levar alguns segundos.</p>
        )}
        {generateMutation.isError && (
          <p className="mt-2 text-sm font-bold flex items-center gap-1" style={{ color: "#dc2626" }}>
            <AlertTriangle size={13} />
            Erro ao gerar relatório. Tente novamente.
          </p>
        )}
      </div>

      {/* Generated report */}
      {generatedReport && (
        <div className="mb-10 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="mono-label mb-1">RELATÓRIO GERADO</p>
              <h3 className="font-black text-2xl">
                {REPORT_TYPES.find(r => r.value === generatedReport.type)?.label}
              </h3>
            </div>
            <div className="text-right">
              <span className="data-tag" style={{ color: riskColors[generatedReport.riskLevel], borderColor: riskColors[generatedReport.riskLevel] }}>
                {riskLabels[generatedReport.riskLevel]}
              </span>
            </div>
          </div>
          <div className="brutal-card">
            <div className="prose prose-sm max-w-none" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              <Streamdown>{generatedReport.narrative}</Streamdown>
            </div>
          </div>
        </div>
      )}

      {/* Report history */}
      {reports && reports.length > 0 && (
        <div>
          <p className="mono-label mb-2">[ HISTÓRICO ]</p>
          <h3 className="font-black text-xl mb-4">Relatórios Anteriores</h3>
          <div style={{ border: "2px solid black" }}>
            {reports.map((r, i) => (
              <div key={r.id} style={{ borderBottom: i < reports.length - 1 ? "2px solid black" : "none" }}>
                <button
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedHistory(expandedHistory === r.id ? null : r.id)}
                >
                  <div className="flex items-center gap-4">
                    <FileText size={16} />
                    <div>
                      <p className="font-black text-sm">{r.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="mono-label flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(r.generated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="data-tag" style={{ color: riskColors[r.risk_level ?? "low"], borderColor: riskColors[r.risk_level ?? "low"] }}>
                          {riskLabels[r.risk_level ?? "low"]}
                        </span>
                      </div>
                    </div>
                  </div>
                  {expandedHistory === r.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {expandedHistory === r.id && (
                  <div className="p-4 pt-0" style={{ borderTop: "1px solid #eee" }}>
                    <div className="prose prose-sm max-w-none mt-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                      <Streamdown>{r.narrative ?? ""}</Streamdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
