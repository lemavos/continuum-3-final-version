import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { dashboardApi } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell 
} from "recharts";
import { 
  Flame, HardDrive, FileText, BarChart3, Plus, CheckCircle2, Circle, Target
} from "lucide-react";
import type { DashboardSummaryDTO } from "@/types";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.summary()
      .then((r) => setSummary(r.data))
      .catch((err) => console.error("Erro ao carregar dashboard:", err))
      .finally(() => setLoading(false));
  }, []);

  // Transforma o mapa de completions do seu backend nos últimos 7 dias REAIS
  const getLast7Days = () => {
    if (!summary?.habitActivity?.dailyCompletions) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const str = d.toISOString().split('T')[0];
      return {
        label: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        done: (summary.habitActivity.dailyCompletions[str] || 0) > 0
      };
    });
  };

  if (loading) return <AppLayout><div className="p-8 text-zinc-500">Sincronizando dados reais...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        
        {/* Header Direto ao Ponto */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <button onClick={() => navigate("/notes")} className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-zinc-200 transition-all">
            + Nova Nota
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* 1. Habit Tracker REAL (Consome seu habitActivity) */}
          <div className="col-span-12 md:col-span-8 bg-zinc-950 border border-white/5 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-medium text-white">Atividade de Hábitos</h2>
              </div>
              <span className="text-2xl font-black text-white">{summary?.habitActivity?.currentStreak || 0}d streak</span>
            </div>

            <div className="grid grid-cols-7 gap-3">
              {getLast7Days().map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={`w-full aspect-square rounded-xl flex items-center justify-center border ${
                    day.done ? "bg-purple-600/20 border-purple-500" : "bg-zinc-900 border-zinc-800"
                  }`}>
                    {day.done ? <CheckCircle2 className="w-6 h-6 text-purple-400" /> : <Circle className="w-6 h-6 text-zinc-800" />}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Storage REAL (Consome seu storageUsage) */}
          <div className="col-span-12 md:col-span-4 bg-zinc-950 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-zinc-400 mb-4 text-sm">
                <HardDrive className="w-4 h-4" /> Uso de Armazenamento
              </div>
              <p className="text-3xl font-bold text-white tracking-tighter">
                {summary?.storageUsage?.formattedUsed || "0MB"}
              </p>
            </div>
            <div className="space-y-2 mt-4">
              <Progress value={summary?.storageUsage?.percentageUsed || 0} className="h-1.5" />
              <p className="text-[10px] text-zinc-500">Limite de {summary?.storageUsage?.formattedLimit}</p>
            </div>
          </div>

          {/* 3. Notas Recentes REAIS (Consome seu recentNotes) */}
          <div className="col-span-12 md:col-span-7 bg-zinc-950 border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-500" /> Últimas Notas
            </h3>
            <div className="space-y-2">
              {summary?.recentNotes?.map((note) => (
                <div key={note.id} onClick={() => navigate(`/notes/${note.id}`)} className="p-3 bg-white/5 rounded-lg border border-transparent hover:border-white/10 cursor-pointer flex justify-between items-center transition-all">
                  <span className="text-sm text-zinc-200 truncate pr-4">{note.title}</span>
                  <span className="text-[10px] text-zinc-600 uppercase whitespace-nowrap">
                    {new Date(note.updatedAtTimestamp).toLocaleDateString()}
                  </span>
                </div>
              )) || <p className="text-zinc-600 text-xs">Nenhuma nota recente.</p>}
            </div>
          </div>

          {/* 4. Stats Gerais REAIS (Consome seu stats) */}
          <div className="col-span-12 md:col-span-5 grid grid-cols-2 gap-4">
             <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6">
                <p className="text-zinc-500 text-xs font-bold uppercase mb-2 text-[10px]">Total Notas</p>
                <p className="text-3xl font-bold text-white leading-none">{summary?.stats?.totalNotes || 0}</p>
             </div>
             <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6">
                <p className="text-zinc-500 text-xs font-bold uppercase mb-2 text-[10px]">Hábitos Ativos</p>
                <p className="text-3xl font-bold text-orange-500 leading-none">{summary?.stats?.activeHabits || 0}</p>
             </div>
             <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6 col-span-2">
                <p className="text-zinc-500 text-xs font-bold uppercase mb-2 text-[10px]">Total Entidades</p>
                <p className="text-3xl font-bold text-white leading-none">{summary?.stats?.totalEntities || 0}</p>
             </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}