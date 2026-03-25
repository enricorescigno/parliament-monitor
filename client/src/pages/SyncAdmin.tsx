import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { RefreshCw, Database, CheckCircle, XCircle, Clock, AlertTriangle, Play, Zap } from "lucide-react";

export default function SyncAdmin() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMode, setSyncMode] = useState<"quick" | "full" | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const { data: syncStatus, refetch: refetchStatus } = trpc.sync.status.useQuery(undefined, {
    refetchInterval: isSyncing ? 3000 : false,
  });
  const { data: syncLogs, refetch: refetchLogs } = trpc.sync.logs.useQuery();
  const { data: parlCount } = trpc.parliamentarian.count.useQuery();

  const quickSync = trpc.sync.quickSync.useMutation({
    onSuccess: (data) => {
      setLastResult(data);
      setIsSyncing(false);
      setSyncMode(null);
      refetchStatus();
      refetchLogs();
      toast.success(`Sincronização concluída! +${data.imported} importados, ${data.updated} atualizados.`);
    },
    onError: (e) => {
      setIsSyncing(false);
      setSyncMode(null);
      toast.error(`Erro na sincronização: ${e.message}`);
    },
  });

  const fullSync = trpc.sync.fullSync.useMutation({
    onSuccess: (data) => {
      setLastResult(data);
      setIsSyncing(false);
      setSyncMode(null);
      refetchStatus();
      refetchLogs();
      toast.success(`Sincronização completa! Deputados: +${data.deputados.imported}, Senadores: +${data.senadores.imported}`);
    },
    onError: (e) => {
      setIsSyncing(false);
      setSyncMode(null);
      toast.error(`Erro: ${e.message}`);
    },
  });

  const handleQuickSync = () => {
    setIsSyncing(true);
    setSyncMode("quick");
    setLastResult(null);
    quickSync.mutate();
  };

  const handleFullSync = () => {
    setIsSyncing(true);
    setSyncMode("full");
    setLastResult(null);
    fullSync.mutate();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatDate = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("pt-BR");
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b-4 border-black px-8 py-10">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-black tracking-[0.3em] uppercase text-gray-500 mb-2">
                  [ ADMINISTRAÇÃO ]
                </div>
                <h1 className="text-5xl font-black tracking-tight leading-none uppercase">
                  SINCRONIZAÇÃO
                  <br />
                  <span className="text-gray-400">DE DADOS</span>
                </h1>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-1">Total no banco</div>
                <div className="text-6xl font-black tabular-nums">
                  {parlCount ?? "—"}
                </div>
                <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">parlamentares</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-8 py-10 space-y-10">
          {/* Data sources info */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Câmara dos Deputados", count: "513+", desc: "Deputados Federais — Legislatura 57", icon: "🏛️", api: "dadosabertos.camara.leg.br" },
              { label: "Senado Federal", count: "81", desc: "Senadores em exercício", icon: "⚖️", api: "legis.senado.leg.br" },
              { label: "TSE", count: "—", desc: "Candidatos e declarações", icon: "🗳️", api: "dadosabertos.tse.jus.br" },
            ].map((src) => (
              <div key={src.label} className="border-2 border-black p-5">
                <div className="text-3xl mb-2">{src.icon}</div>
                <div className="text-2xl font-black mb-1">{src.count}</div>
                <div className="text-sm font-black uppercase tracking-wide mb-1">{src.label}</div>
                <div className="text-xs text-gray-600 mb-2">{src.desc}</div>
                <div className="text-xs font-mono text-gray-400 border-t border-gray-200 pt-2">{src.api}</div>
              </div>
            ))}
          </div>

          {/* Sync Actions */}
          <div className="border-4 border-black p-8">
            <div className="text-xs font-black tracking-[0.3em] uppercase text-gray-500 mb-6">
              [ AÇÕES DE SINCRONIZAÇÃO ]
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Quick Sync */}
              <div className="border-2 border-black p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Zap size={24} />
                  <div>
                    <div className="font-black text-lg uppercase">Sync Rápido</div>
                    <div className="text-xs text-gray-500">~2-5 minutos</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Importa a lista completa de todos os deputados federais (513+) e senadores (81) 
                  das APIs públicas. Sem detalhes de despesas — ideal para importação inicial rápida.
                </p>
                <ul className="text-xs text-gray-500 space-y-1 mb-6">
                  <li>✓ Lista de deputados federais (Câmara)</li>
                  <li>✓ Lista de senadores (Senado)</li>
                  <li>✓ Partido, estado, cargo</li>
                  <li>✓ Score inicial calculado</li>
                  <li>✗ Despesas detalhadas (use Sync Completo)</li>
                </ul>
                <button
                  onClick={handleQuickSync}
                  disabled={isSyncing}
                  className="w-full bg-black text-white font-black uppercase tracking-widest py-3 px-6 text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSyncing && syncMode === "quick" ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      SINCRONIZANDO...
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      INICIAR SYNC RÁPIDO
                    </>
                  )}
                </button>
              </div>

              {/* Full Sync */}
              <div className="border-2 border-black p-6 bg-black text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Database size={24} />
                  <div>
                    <div className="font-black text-lg uppercase">Sync Completo</div>
                    <div className="text-xs text-gray-400">~30-60 minutos</div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-6">
                  Importa todos os parlamentares com detalhes completos: despesas da cota parlamentar, 
                  dados biográficos e score calculado com base em dados reais.
                </p>
                <ul className="text-xs text-gray-400 space-y-1 mb-6">
                  <li>✓ Tudo do Sync Rápido</li>
                  <li>✓ CPF de cada parlamentar</li>
                  <li>✓ Despesas da cota parlamentar</li>
                  <li>✓ Score calculado com dados reais</li>
                  <li>✓ Dados biográficos completos</li>
                </ul>
                <button
                  onClick={handleFullSync}
                  disabled={isSyncing}
                  className="w-full bg-white text-black font-black uppercase tracking-widest py-3 px-6 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSyncing && syncMode === "full" ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      SINCRONIZANDO...
                    </>
                  ) : (
                    <>
                      <Database size={16} />
                      INICIAR SYNC COMPLETO
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sync in progress indicator */}
            {isSyncing && (
              <div className="mt-6 border-2 border-black bg-yellow-50 p-5">
                <div className="flex items-center gap-3">
                  <RefreshCw size={20} className="animate-spin" />
                  <div>
                    <div className="font-black uppercase text-sm">
                      {syncMode === "quick" ? "Sync Rápido" : "Sync Completo"} em andamento...
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Buscando dados das APIs públicas. Isso pode levar alguns minutos. 
                      Não feche esta página.
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-1 bg-gray-200 overflow-hidden">
                  <div className="h-full bg-black animate-pulse" style={{ width: "60%" }} />
                </div>
              </div>
            )}

            {/* Last result */}
            {lastResult && !isSyncing && (
              <div className="mt-6 border-2 border-black bg-green-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={20} className="text-green-600" />
                  <div className="font-black uppercase text-sm">Sincronização concluída com sucesso</div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { label: "Importados", value: lastResult.imported ?? (lastResult.deputados?.imported ?? 0) + (lastResult.senadores?.imported ?? 0) },
                    { label: "Atualizados", value: lastResult.updated ?? (lastResult.deputados?.updated ?? 0) + (lastResult.senadores?.updated ?? 0) },
                    { label: "Erros", value: lastResult.errors ?? (lastResult.deputados?.errors ?? 0) + (lastResult.senadores?.errors ?? 0) },
                  ].map((s) => (
                    <div key={s.label} className="border border-black p-3">
                      <div className="text-2xl font-black">{s.value}</div>
                      <div className="text-xs font-bold uppercase text-gray-500">{s.label}</div>
                    </div>
                  ))}
                </div>
                {lastResult.duration && (
                  <div className="mt-3 text-xs text-gray-500 text-center">
                    Duração: {formatDuration(lastResult.duration)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Current sync status */}
          {syncStatus && (
            <div className="border-2 border-black p-6">
              <div className="text-xs font-black tracking-[0.3em] uppercase text-gray-500 mb-4">
                [ ÚLTIMA SINCRONIZAÇÃO ]
              </div>
              <div className="flex items-center gap-4">
                {syncStatus.status === "success" && <CheckCircle size={24} className="text-green-600" />}
                {syncStatus.status === "error" && <XCircle size={24} className="text-red-600" />}
                {syncStatus.status === "running" && <RefreshCw size={24} className="animate-spin" />}
                <div>
                  <div className="font-black uppercase">
                    {syncStatus.status === "success" && "Sucesso"}
                    {syncStatus.status === "error" && "Erro"}
                    {syncStatus.status === "running" && "Em andamento"}
                    {" — "}
                    {syncStatus.source === "quick" ? "Sync Rápido" : "Sync Completo"}
                  </div>
                  <div className="text-xs text-gray-500">
                    Iniciado em: {formatDate(syncStatus.started_at)}
                    {syncStatus.completed_at && ` · Concluído: ${formatDate(syncStatus.completed_at)}`}
                  </div>
                </div>
                <div className="ml-auto flex gap-6 text-center">
                  <div>
                    <div className="text-xl font-black">{syncStatus.records_imported ?? 0}</div>
                    <div className="text-xs text-gray-500 uppercase font-bold">Importados</div>
                  </div>
                  <div>
                    <div className="text-xl font-black">{syncStatus.records_updated ?? 0}</div>
                    <div className="text-xs text-gray-500 uppercase font-bold">Atualizados</div>
                  </div>
                  <div>
                    <div className="text-xl font-black">{syncStatus.error_count ?? 0}</div>
                    <div className="text-xs text-gray-500 uppercase font-bold">Erros</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sync history */}
          {syncLogs && syncLogs.length > 0 && (
            <div>
              <div className="text-xs font-black tracking-[0.3em] uppercase text-gray-500 mb-4">
                [ HISTÓRICO DE SINCRONIZAÇÕES ]
              </div>
              <div className="border-2 border-black">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-black bg-black text-white">
                      <th className="text-left px-4 py-3 font-black uppercase text-xs tracking-widest">Tipo</th>
                      <th className="text-left px-4 py-3 font-black uppercase text-xs tracking-widest">Status</th>
                      <th className="text-left px-4 py-3 font-black uppercase text-xs tracking-widest">Iniciado</th>
                      <th className="text-right px-4 py-3 font-black uppercase text-xs tracking-widest">Importados</th>
                      <th className="text-right px-4 py-3 font-black uppercase text-xs tracking-widest">Erros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncLogs.map((log, i) => (
                      <tr key={log.id} className={`border-b border-gray-200 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                        <td className="px-4 py-3 font-bold uppercase text-xs">
                          {log.source === "quick" ? "⚡ Rápido" : "🔄 Completo"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase px-2 py-1 ${
                            log.status === "success" ? "bg-green-100 text-green-800" :
                            log.status === "error" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
                          }`}>
                            {log.status === "success" && <CheckCircle size={10} />}
                            {log.status === "error" && <XCircle size={10} />}
                            {log.status === "running" && <Clock size={10} />}
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 font-mono">{formatDate(log.started_at)}</td>
                        <td className="px-4 py-3 text-right font-black">{log.records_imported ?? 0}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">{log.error_count ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="border-2 border-black bg-yellow-50 p-5 flex gap-3">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-black uppercase mb-1">Aviso sobre dados importados</div>
              <p className="text-gray-600">
                Os dados são importados diretamente das APIs públicas oficiais (Câmara dos Deputados e Senado Federal). 
                Despesas, patrimônio e funcionários de parlamentares recém-importados serão populados gradualmente 
                conforme o Sync Completo for executado. O score inicial é calculado com base nos dados disponíveis 
                no momento da importação.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
