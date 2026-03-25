import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { AlertTriangle, Users, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function GhostEmployees() {
  const { id } = useParams<{ id: string }>();
  const parlId = parseInt(id ?? "0");

  const { data: parlData } = trpc.parliamentarian.getById.useQuery({ id: parlId });
  const { data, isLoading } = trpc.analysis.ghostEmployees.useQuery({ parliamentarianId: parlId });

  if (isLoading) return (
    <AppLayout parliamentarianId={parlId} parliamentarianName="...">
      <div className="py-20 text-center"><p className="mono-label animate-pulse">ANALISANDO FOLHA DE PAGAMENTO...</p></div>
    </AppLayout>
  );

  const ghosts = data?.ghosts ?? [];
  const all = data?.all ?? [];
  const multipleEmployers = data?.multipleEmployers ?? [];

  const attendanceChartData = all.map(e => ({
    name: e.name.split(" ")[0],
    attendance: Math.round((e.attendance_rate ?? 0) * 100),
    isGhost: e.is_ghost_suspect,
  }));

  const salaryChartData = all.map(e => ({
    name: e.name.split(" ")[0],
    salary: parseFloat(String(e.salary ?? 0)),
    isGhost: e.is_ghost_suspect,
  }));

  return (
    <AppLayout parliamentarianId={parlId} parliamentarianName={parlData?.name}>
      <div className="mb-8" style={{ borderBottom: "3px solid black", paddingBottom: "2rem" }}>
        <p className="mono-label mb-2">[ MÓDULO DE ANÁLISE ]</p>
        <h1 className="text-4xl font-black mb-2">FUNCIONÁRIOS<br />FANTASMAS</h1>
        <p className="text-sm" style={{ color: "#666" }}>
          Cruzamento de folha de pagamento com registros de presença e atividade parlamentar.
        </p>
      </div>

      {/* Alert */}
      {ghosts.length > 0 && (
        <div className="flex items-start gap-3 p-4 mb-8" style={{ background: "#dc2626", color: "white" }}>
          <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-black">{ghosts.length} FUNCIONÁRIO{ghosts.length > 1 ? "S" : ""} COM SUSPEITA DE FANTASMA</p>
            <p className="text-sm mt-1 opacity-90">
              Folha de pagamento irregular detectada. Taxa de presença inferior a 20% nos últimos 6 meses.
              Custo estimado: R$ {(data?.ghostPayroll ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 mb-8" style={{ border: "2px solid black" }}>
        {[
          { label: "Total Funcionários", value: all.length, icon: Users, sub: "na folha" },
          { label: "Suspeitos Fantasma", value: ghosts.length, icon: AlertTriangle, sub: "< 20% presença", alert: ghosts.length > 0 },
          { label: "Múltiplos Vínculos", value: multipleEmployers.length, icon: Users, sub: "empregos simultâneos", alert: multipleEmployers.length > 0 },
          { label: "Custo Suspeito/Mês", value: `R$ ${((data?.ghostPayroll ?? 0) / 1000).toFixed(1)}k`, icon: DollarSign, sub: "em salários", alert: (data?.ghostPayroll ?? 0) > 0 },
        ].map((stat, i) => (
          <div key={i} className="p-5" style={{ borderRight: i < 3 ? "2px solid black" : "none" }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="mono-label mb-1">{stat.label}</p>
                <p className={`text-3xl font-black ${stat.alert ? "text-red-600" : ""}`}>{stat.value}</p>
                <p className="mono-label mt-1">{stat.sub}</p>
              </div>
              <stat.icon size={18} style={{ color: stat.alert ? "#dc2626" : "#bbb" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 mb-8" style={{ border: "2px solid black" }}>
        <div className="p-6" style={{ borderRight: "2px solid black" }}>
          <p className="mono-label mb-1">TAXA DE PRESENÇA</p>
          <h3 className="font-black text-lg mb-4">Por Funcionário (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attendanceChartData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "Space Mono" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontFamily: "Space Mono" }} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Presença"]} />
              <Bar dataKey="attendance" radius={0}>
                {attendanceChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.isGhost ? "#dc2626" : "#1a1a1a"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mono-label mt-2"><span style={{ color: "#dc2626" }}>■</span> Suspeito &nbsp; <span style={{ color: "#1a1a1a" }}>■</span> Regular</p>
        </div>
        <div className="p-6">
          <p className="mono-label mb-1">SALÁRIOS</p>
          <h3 className="font-black text-lg mb-4">Por Funcionário (R$)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salaryChartData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "Space Mono" }} />
              <YAxis tick={{ fontSize: 10, fontFamily: "Space Mono" }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Salário"]} />
              <Bar dataKey="salary" radius={0}>
                {salaryChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.isGhost ? "#dc2626" : "#1a1a1a"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Employee table */}
      <div className="brutal-card">
        <p className="mono-label mb-1">LISTA COMPLETA</p>
        <h3 className="font-black text-lg mb-4">Funcionários da Folha de Pagamento</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid black" }}>
                {["Nome", "Cargo", "Salário", "Presença", "Vínculo", "Status"].map(h => (
                  <th key={h} className="text-left py-2 px-3 mono-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {all.map((emp, i) => (
                <tr key={emp.id} style={{ borderBottom: i < all.length - 1 ? "1px solid #eee" : "none" }}>
                  <td className="py-3 px-3 font-bold">{emp.name}</td>
                  <td className="py-3 px-3 text-xs" style={{ color: "#666" }}>{emp.role_title}</td>
                  <td className="py-3 px-3 font-mono text-xs">R$ {parseFloat(String(emp.salary ?? 0)).toLocaleString("pt-BR")}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100" style={{ border: "1px solid #ddd" }}>
                        <div className="h-full" style={{ width: `${(emp.attendance_rate ?? 0) * 100}%`, background: (emp.attendance_rate ?? 0) < 0.2 ? "#dc2626" : "#1a1a1a" }} />
                      </div>
                      <span className="mono-label">{Math.round((emp.attendance_rate ?? 0) * 100)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {emp.multiple_employers ? (
                      <span className="data-tag" style={{ color: "#ea580c", borderColor: "#ea580c" }}>MÚLTIPLO</span>
                    ) : (
                      <span className="mono-label">Único</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {emp.is_ghost_suspect ? (
                      <div className="flex items-center gap-1.5">
                        <XCircle size={14} style={{ color: "#dc2626" }} />
                        <span className="font-bold text-xs" style={{ color: "#dc2626" }}>SUSPEITO</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle size={14} style={{ color: "#16a34a" }} />
                        <span className="font-bold text-xs" style={{ color: "#16a34a" }}>REGULAR</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ghost details */}
      {ghosts.length > 0 && (
        <div className="mt-8">
          <p className="mono-label mb-2">[ DETALHAMENTO ]</p>
          <h3 className="font-black text-xl mb-4">Funcionários Suspeitos — Evidências</h3>
          <div className="space-y-0" style={{ border: "2px solid black" }}>
            {ghosts.map((g, i) => (
              <div key={g.id} className="p-5" style={{ borderBottom: i < ghosts.length - 1 ? "2px solid black" : "none" }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-black">{g.name}</h4>
                      <span className="data-tag risk-critical">FANTASMA SUSPEITO</span>
                    </div>
                    <p className="mono-label mb-2">{g.role_title} · CPF: {g.cpf}</p>
                    <p className="text-sm" style={{ color: "#555" }}>{g.ghost_reason}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="mono-label">Salário</p>
                    <p className="font-black text-xl">R$ {parseFloat(String(g.salary ?? 0)).toLocaleString("pt-BR")}</p>
                    <p className="mono-label">Presença: {Math.round((g.attendance_rate ?? 0) * 100)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
