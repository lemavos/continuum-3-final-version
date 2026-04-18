import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { BentoGrid, type BentoItem } from "@/components/ui/bento-grid";
import { dashboardApi, entitiesApi, trackingApi, graphApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { Progress } from "@/components/ui/progress";
import {
  Flame,
  HardDrive,
  FileText,
  BarChart3,
  Plus,
  Network,
  CheckCircle,
  Circle,
} from "lucide-react";
import type { Plan, DashboardSummaryDTO, Entity } from "@/types";
import { PLAN_LIMITS } from "@/types";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const { usage, applyUsageDelta } = usePlanGate();

  const plan: Plan = (user?.plan as Plan) || "FREE";
  const limits = PLAN_LIMITS[plan];

  // Fetch summary
  useEffect(() => {
    dashboardApi.summary()
      .then((r) => setSummary(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch habits
  const { data: habits } = useQuery({
    queryKey: ["entities", "HABIT"],
    queryFn: async () => {
      const response = await entitiesApi.list();
      return response.data.filter((entity: Entity) => entity.type === "HABIT");
    },
  });

  // Fetch today's tracking
  const { data: todayTracking } = useQuery({
    queryKey: ["tracking", "today"],
    queryFn: () => trackingApi.today().then(r => r.data),
  });

  // Fetch graph data for preview
  const { data: graphData } = useQuery({
    queryKey: ["graph", "data"],
    queryFn: () => graphApi.data().then(r => r.data),
  });

  useEffect(() => {
    if (!summary?.storageUsage || usage == null) return;

    const storageMB = Number((summary.storageUsage.usedBytes / (1024 * 1024)).toFixed(2));
    applyUsageDelta({ vaultSizeMB: storageMB - usage.vaultSizeMB });
  }, [summary?.storageUsage, usage, applyUsageDelta]);

  const formatDate = (value: string | number) => {
    return new Date(value).toLocaleDateString();
  };

  // Get pending habits today
  const getPendingHabits = () => {
    if (!habits || !todayTracking) return [];
    const today = new Date().toISOString().split('T')[0];
    return habits.filter((habit: Entity) => {
      const tracked = todayTracking.find((t: any) => t.entityId === habit.id && t.date === today);
      return !tracked;
    });
  };

  const pendingHabits = getPendingHabits();

  const bentoItems: BentoItem[] = [
    // Welcome/Storage Widget
    {
      title: `Welcome back, ${user?.username || "User"}`,
      meta: summary?.storageUsage ? `${summary.storageUsage.formattedUsed} of ${summary.storageUsage.formattedLimit}` : "Loading...",
      description: "Your storage usage and quick overview",
      icon: <HardDrive className="w-4 h-4 text-cyan-400" />,
      status: summary?.storageUsage
        ? summary.storageUsage.isUnlimited
          ? "Unlimited storage"
          : `${summary.storageUsage.percentageUsed.toFixed(1)}% used`
        : "",
      colSpan: 2,
      hasPersistentHover: true,
      customContent: summary?.storageUsage ? (
        <div className="mt-4">
          <Progress value={summary.storageUsage.percentageUsed} className="h-2" />
        </div>
      ) : null,
    },

    // Recent Notes
    {
      title: "Recent Notes",
      meta: summary?.recentNotes ? `${summary.recentNotes.length} recent` : "—",
      description: "Quick access to your latest notes",
      icon: <FileText className="w-4 h-4 text-cyan-400" />,
      status: "Recently updated",
      tags: ["Notes", "Recent"],
      colSpan: 2,
      customContent: summary?.recentNotes && summary.recentNotes.length > 0 ? (
        <div className="mt-4 space-y-2">
          {summary.recentNotes.slice(0, 3).map((note) => (
            <div
              key={note.id}
              className="flex items-center justify-between p-2 rounded-md bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors"
              onClick={() => navigate(`/notes/${note.id}`)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{note.title}</p>
                <p className="text-xs text-muted-foreground truncate">{note.preview}</p>
              </div>
              <div className="text-xs text-muted-foreground ml-2">
                {formatDate(note.updatedAtTimestamp)}
              </div>
            </div>
          ))}
          {summary.recentNotes.length > 3 && (
            <button
              onClick={() => navigate("/notes")}
              className="w-full text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View all notes →
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 text-center text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No notes yet</p>
          <p className="text-xs">Create your first note to get started</p>
          <button
            onClick={() => navigate("/notes")}
            className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Create note
          </button>
        </div>
      ),
      onClick: () => navigate("/notes"),
    },

    // Pending Habits Today
    {
      title: "Today's Habits",
      meta: `${pendingHabits.length} pending`,
      description: "Habits you haven't completed today",
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      status: "Complete your daily habits",
      tags: ["Habits", "Today"],
      colSpan: 2,
      customContent: pendingHabits.length > 0 ? (
        <div className="mt-4 space-y-2">
          {pendingHabits.slice(0, 3).map((habit: Entity) => (
            <div
              key={habit.id}
              className="flex items-center justify-between p-2 rounded-md bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors"
              onClick={() => navigate(`/entities/${habit.id}`)}
            >
              <div className="flex items-center gap-2">
                <Circle className="w-4 h-4 text-orange-400" />
                <p className="text-sm font-medium">{habit.title}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Mark as complete
                  navigate(`/entities/${habit.id}`);
                }}
                className="text-xs text-orange-400 hover:text-orange-300"
              >
                Complete
              </button>
            </div>
          ))}
          {pendingHabits.length > 3 && (
            <button
              onClick={() => navigate("/entities?type=HABIT")}
              className="w-full text-xs text-orange-400 hover:text-orange-300 transition-colors"
            >
              View all habits →
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 text-center text-muted-foreground">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-green-400" />
          <p className="text-sm">All habits completed today!</p>
          <p className="text-xs">Great job keeping up with your routines</p>
        </div>
      ),
      onClick: () => navigate("/entities?type=HABIT"),
    },

    // Graph Preview
    {
      title: "Knowledge Graph",
      meta: graphData ? `${graphData.nodes?.length || 0} nodes` : "—",
      description: "Preview of your knowledge connections",
      icon: <Network className="w-4 h-4 text-purple-400" />,
      status: "Click to explore",
      tags: ["Graph", "Connections"],
      colSpan: 2,
      customContent: (
        <div className="mt-4 text-center">
          <div className="w-full h-20 bg-slate-800/50 rounded-md flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => navigate("/graph")}>
            <Network className="w-8 h-8 text-purple-400 opacity-50" />
            <p className="text-xs text-muted-foreground ml-2">View Graph</p>
          </div>
        </div>
      ),
      onClick: () => navigate("/graph"),
    },

    // Plan Limits
    {
      title: "Plan Limits",
      meta: `${plan} plan`,
      description: "Your current usage limits",
      icon: <BarChart3 className="w-4 h-4 text-cyan-400" />,
      status: "Upgrade for more",
      tags: ["Plan", "Limits"],
      colSpan: 2,
      customContent: usage ? (
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Notes</span>
              <span className="text-muted-foreground">
                {usage.notesCount} / {limits.maxNotes === -1 ? "∞" : limits.maxNotes}
              </span>
            </div>
            <Progress
              value={limits.maxNotes === -1 ? 0 : Math.min((usage.notesCount / limits.maxNotes) * 100, 100)}
              className="h-1"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Entities</span>
              <span className="text-muted-foreground">
                {usage.entitiesCount} / {limits.maxEntities === -1 ? "∞" : limits.maxEntities}
              </span>
            </div>
            <Progress
              value={limits.maxEntities === -1 ? 0 : Math.min((usage.entitiesCount / limits.maxEntities) * 100, 100)}
              className="h-1"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Habits</span>
              <span className="text-muted-foreground">
                {usage.habitsCount} / {limits.maxHabits === -1 ? "∞" : limits.maxHabits}
              </span>
            </div>
            <Progress
              value={limits.maxHabits === -1 ? 0 : Math.min((usage.habitsCount / limits.maxHabits) * 100, 100)}
              className="h-1"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Storage</span>
              <span className="text-muted-foreground">
                {usage.vaultSizeMB}MB / {limits.maxVaultSizeMB}MB
              </span>
            </div>
            <Progress
              value={Math.min((usage.vaultSizeMB / limits.maxVaultSizeMB) * 100, 100)}
              className="h-1"
            />
          </div>
        </div>
      ) : null,
      onClick: () => navigate("/subscription"),
    },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-5xl mx-auto">
          <div className="space-y-1 mb-8">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-50">
              Hello, {user?.username || "User"}
            </h1>
            <p className="text-sm text-slate-400">Loading your dashboard...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bento-card p-5 animate-pulse">
                <div className="h-4 bg-slate-700 rounded mb-2"></div>
                <div className="h-3 bg-slate-700 rounded mb-4"></div>
                <div className="h-20 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-50">
            Hello, {user?.username || "User"}
          </h1>
          <p className="text-sm text-slate-400">
            Here's a summary of your activity
          </p>
        </div>

        <BentoGrid items={bentoItems} />
      </div>
    </AppLayout>
  );
}
