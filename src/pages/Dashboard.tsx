import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { dashboardApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { Progress } from "@/components/ui/progress";
import { 
  Flame, HardDrive, FileText, Plus, Share2, Activity, FolderOpen
} from "lucide-react";
import type { Plan, DashboardSummaryDTO } from "@/types";
import { PLAN_LIMITS } from "@/types";

// ==========================================
// 1. COMPONENTE DE SKELETON (CARREGAMENTO)
// ==========================================
const DashboardSkeleton = () => (
  <AppLayout>
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-8">
        <div className="h-8 w-64 bg-zinc-900 rounded-md animate-pulse"></div>
        <div className="h-10 w-32 bg-zinc-900 rounded-md animate-pulse"></div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Grafo Placeholder */}
        <div className="col-span-12 lg:col-span-8 h-[380px] bg-zinc-900/50 border border-white/5 rounded-2xl animate-pulse"></div>
        {/* Limits Placeholder */}
        <div className="col-span-12 lg:col-span-4 h-[380px] bg-zinc-900/50 border border-white/5 rounded-2xl animate-pulse"></div>
        {/* Heatmap Placeholder */}
        <div className="col-span-12 lg:col-span-7 h-[280px] bg-zinc-900/50 border border-white/5 rounded-2xl animate-pulse"></div>
        {/* Notes Placeholder */}
        <div className="col-span-12 lg:col-span-5 h-[280px] bg-zinc-900/50 border border-white/5 rounded-2xl animate-pulse"></div>
      </div>
    </div>
  </AppLayout>
);

// ==========================================
// 2. DASHBOARD PRINCIPAL
// ==========================================
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Limites do Plano (Exatamente como estava no seu código original)
  const { usage, applyUsageDelta } = usePlanGate();
  const plan: Plan = (user?.plan as Plan) || "FREE";
  const limits = PLAN_LIMITS[plan];

  useEffect(() => {
    dashboardApi.summary()
      .then((r) => setSummary(r.data))
      .catch((err) => console.error("Erro ao buscar summary:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!summary?.storageUsage || usage == null) return;
    const storageMB = Number((summary.storageUsage.usedBytes / (1024 * 1024)).toFixed(2));
    applyUsageDelta({ vaultSizeMB: storageMB - usage.vaultSizeMB });
  }, [summary?.storageUsage, usage, applyUsageDelta]);

  // Lógica original do seu Heatmap (35 dias reais do backend)
  const getHeatmapColor = (count: number) => {
    if (count === 0) return "bg-zinc-900 border border-zinc-800/50";
    if (count === 1) return "bg-purple-900/40 border border-purple-800/50";
    if (count === 2) return "bg-purple-700/60 border border-purple-600/50";
    if (count === 3) return "bg-purple-500 border border-purple-400";
    return "bg-purple-400 border border-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.4)]";
  };

  const generateHeatmap = () => {
    if (!summary?.habitActivity?.dailyCompletions) return null;
    const today = new Date();
    const weeks: { date: string; count: number }[][] = [];
    const days = [];

    for (let i = 34; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = summary.habitActivity.dailyCompletions[dateStr] || 0;
      days.push({ date: dateStr, count });
    }

    for (let w = 0; w < 5; w++) {
      weeks[w] = [];
      for (let d = 0; d < 7; d++) {
        const idx = w * 7 + d;
        if (idx < days.length) weeks[w].push(days[idx]);
      }
    }

    return (
      <div className="flex gap-1.5 mt-4">
        {weeks.map((week, w) => (
          <div key={w} className="flex flex-col gap-1.5">
            {week.map((day, d) => (
              <div
                key={`${w}-${d}`}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-[4px] cursor-pointer transition-transform hover:scale-110 ${getHeatmapColor(day.count)}`}
                title={`${day.date}: ${day.count} registros`}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Renderiza o Skeleton enquanto a API responde
  if (loading) return <DashboardSkeleton />;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-semibold text-white tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-zinc-500">Visão geral do seu cofre.</p>
          </div>
          <button 
            onClick={() => navigate("/notes")}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Nota
          </button>
        </header>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-12 gap-6">

          {/* 1. PREVIEW DO GRAFO (Área nobre) */}
          <div className="col-span-12 lg:col-span-8 bg-[#09090b] border border-white/5 rounded-2xl p-6 flex flex-col relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4 z-10">
              <h2 className="text-white font-medium flex items-center gap-2">
                <Share2 className="w-4 h-4 text-zinc-400" /> Knowledge Graph
              </h2>
              <span className="text-xs text-zinc-500">{summary?.stats?.totalNotes || 0} nós ativos</span>
            </div>
            
            {/* AQUI ENTRA O SEU COMPONENTE DE GRAFO SE VOCÊ TIVER UM */}
            <div className="flex-1 min-h-[280px] bg-zinc-950/50 rounded-xl border border-white/5 flex items-center justify-center relative overflow-hidden">
               {/* Isso é só um visual estético enquanto você não espeta a biblioteca de grafo real */}
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-900/0 to-transparent"></div>
               <div className="text-center z-10">
                 <Share2 className="w-8 h-8 text-zinc-700 mx-auto mb-2 opacity-50" />
                 <p className="text-sm text-zinc-500">Preview do Grafo em breve</p>
                 <p className="text-xs text-zinc-600">Espete o seu componente aqui.</p>
               </div>
            </div>
          </div>

          {/* 2. LIMITES DO PLANO E STORAGE (Direto do seu usePlanGate) */}
          <div className="col-span-12 lg:col-span-4 bg-[#09090b] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-white font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-zinc-400" /> System Usage
                </h2>
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-purple-500/10 text-purple-400 tracking-widest uppercase">
                  {plan}
                </span>
              </div>

              {usage ? (
                <div className="space-y-6">
                  {/* Notes Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Notas</span>
                      <span className="text-zinc-200">{usage.notesCount} / {limits.maxNotes === -1 ? "∞" : limits.maxNotes}</span>
                    </div>
                    <Progress value={limits.maxNotes === -1 ? 0 : Math.min((usage.notesCount / limits.maxNotes) * 100, 100)} className="h-1.5 bg-zinc-800" />
                  </div>
                  
                  {/* Entities Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Entidades</span>
                      <span className="text-zinc-200">{usage.entitiesCount} / {limits.maxEntities === -1 ? "∞" : limits.maxEntities}</span>
                    </div>
                    <Progress value={limits.maxEntities === -1 ? 0 : Math.min((usage.entitiesCount / limits.maxEntities) * 100, 100)} className="h-1.5 bg-zinc-800" />
                  </div>

                  {/* Habits Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Hábitos</span>
                      <span className="text-zinc-200">{usage.habitsCount} / {limits.maxHabits === -1 ? "∞" : limits.maxHabits}</span>
                    </div>
                    <Progress value={limits.maxHabits === -1 ? 0 : Math.min((usage.habitsCount / limits.maxHabits) * 100, 100)} className="h-1.5 bg-zinc-800" />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-zinc-500">Carregando limites...</div>
              )}
            </div>

            {/* Storage Info */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
                    <HardDrive className="w-3 h-3" /> Storage Vault
                  </div>
                  <span className="text-2xl font-bold text-white tracking-tight">
                    {summary?.storageUsage?.formattedUsed || "0 MB"}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">
                  / {summary?.storageUsage?.formattedLimit || "∞"}
                </span>
              </div>
            </div>
          </div>

          {/* 3. HEATMAP REAL (Habit Activity) */}
          <div className="col-span-12 lg:col-span-7 bg-[#09090b] border border-white/5 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-white font-medium flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" /> Consistência
                </h2>
                <p className="text-xs text-zinc-500 mt-1">Últimas 5 semanas de atividade</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-white">{summary?.habitActivity?.currentStreak || 0}</span>
                <p className="text-[10px] text-orange-500 font-bold uppercase">Day Streak</p>
              </div>
            </div>
            
            {/* Heatmap gerado estritamente com seus dados */}
            <div className="overflow-x-auto pb-2">
              {generateHeatmap()}
            </div>
          </div>

          {/* 4. NOTAS RECENTES */}
          <div className="col-span-12 lg:col-span-5 bg-[#09090b] border border-white/5 rounded-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-medium flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-zinc-400" /> Notas Recentes
              </h2>
              <button onClick={() => navigate("/notes")} className="text-[10px] uppercase font-bold text-zinc-500 hover:text-white transition-colors">
                Ver Todas
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-3">
              {summary?.recentNotes && summary.recentNotes.length > 0 ? (
                summary.recentNotes.slice(0, 4).map((note) => (
                  <div
                    key={note.id}
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className="group flex flex-col p-3 bg-zinc-950/50 rounded-lg border border-transparent hover:border-white/10 cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-zinc-200 truncate pr-4 group-hover:text-purple-400 transition-colors">
                        {note.title}
                      </span>
                      <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                        {new Date(note.updatedAtTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {note.preview && (
                      <span className="text-xs text-zinc-500 truncate">{note.preview}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-6">
                  <FileText className="w-6 h-6 text-zinc-800 mb-2" />
                  <p className="text-xs text-zinc-500">Nenhuma nota recente.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}