import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface TimeEntry {
  id: string;
  entityId: string;
  date: string;
  durationSeconds: number;
  formattedDuration: string;
  note?: string;
  source: 'TIMER' | 'MANUAL' | 'RECOVERED';
  createdAt: string;
  updatedAt: string;
}

export interface TimerSession {
  id: string;
  entityId: string;
  startedAt: string;
  stoppedAt?: string;
  status: 'RUNNING' | 'COMPLETED' | 'ABANDONED';
  elapsedSeconds: number;
  formattedElapsed: string;
  createdAt: string;
}

export interface TimeEntitySummary {
  entityId: string;
  entityTitle?: string;
  totalSeconds: number;
  formattedTotal: string;
  totalHours: number;
  entriesCount: number;
  activeSessionDuration?: number;
  hasActiveTimer: boolean;
}

/**
 * Hook for managing time tracking operations
 */
export const useTimeTracking = () => {
  const queryClient = useQueryClient();
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const elapsedRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Query: Get total time for an entity
  const getTotalTime = (entityId: string) => {
    return useQuery({
      queryKey: ['timeTracking', 'total', entityId],
      queryFn: () => api.get(`/api/time-tracking/${entityId}/total`).then(r => r.data),
      refetchInterval: activeTimerId === entityId ? 1000 : false,
    });
  };

  // Query: Get daily breakdown
  const getDailyBreakdown = (entityId: string) => {
    return useQuery({
      queryKey: ['timeTracking', 'daily', entityId],
      queryFn: () => api.get(`/api/time-tracking/${entityId}/daily`).then(r => r.data),
    });
  };

  // Query: Get all summaries
  const getAllSummaries = () => {
    return useQuery({
      queryKey: ['timeTracking', 'summaries'],
      queryFn: () => api.get('/api/time-tracking/summary/all').then(r => r.data),
      refetchInterval: 5000, // Update every 5 seconds for active timers
    });
  };

  // Query: Get active timer
  const getActiveTimer = (entityId: string) => {
    return useQuery({
      queryKey: ['timeTracking', 'activeTimer', entityId],
      queryFn: () => api.get(`/api/time-tracking/${entityId}/active`).then(r => r.data),
      refetchInterval: activeTimerId === entityId ? 1000 : 5000,
    });
  };

  // Mutation: Start timer
  const startTimerMutation = useMutation({
    mutationFn: (entityId: string) =>
      api.post('/api/time-tracking/start', { entityId }).then(r => r.data),
    onSuccess: (data: TimerSession) => {
      setActiveTimerId(data.id);
      queryClient.invalidateQueries({ queryKey: ['timeTracking'] });
      
      // Save to localStorage for recovery
      localStorage.setItem('activeTimerId', data.id);
      localStorage.setItem('timerStarted', new Date().toISOString());
    },
  });

  // Mutation: Stop timer
  const stopTimerMutation = useMutation({
    mutationFn: (data: { sessionId: string; note?: string }) =>
      api.post('/api/time-tracking/stop', data).then(r => r.data),
    onSuccess: () => {
      setActiveTimerId(null);
      localStorage.removeItem('activeTimerId');
      queryClient.invalidateQueries({ queryKey: ['timeTracking'] });
    },
  });

  // Mutation: Add time manually
  const addTimeMutation = useMutation({
    mutationFn: (data: { entityId: string; date: string; durationSeconds: number; note?: string }) =>
      api.post('/api/time-tracking/add', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeTracking'] });
    },
  });

  // Mutation: Delete entry
  const deleteEntryMutation = useMutation({
    mutationFn: (entryId: string) =>
      api.delete(`/api/time-tracking/${entryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeTracking'] });
    },
  });

  // Recovery: Check for interrupted timers on mount
  useEffect(() => {
    const savedTimerId = localStorage.getItem('activeTimerId');
    if (savedTimerId) {
      setActiveTimerId(savedTimerId);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Format seconds to HH:MM:SS
  const formatSeconds = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  return {
    // Queries
    getTotalTime,
    getDailyBreakdown,
    getAllSummaries,
    getActiveTimer,
    
    // Mutations
    startTimer: startTimerMutation.mutate,
    startTimerAsync: startTimerMutation.mutateAsync,
    stopTimer: stopTimerMutation.mutate,
    stopTimerAsync: stopTimerMutation.mutateAsync,
    addTime: addTimeMutation.mutate,
    addTimeAsync: addTimeMutation.mutateAsync,
    deleteEntry: deleteEntryMutation.mutate,
    
    // Status
    activeTimerId,
    isStarting: startTimerMutation.isPending,
    isStopping: stopTimerMutation.isPending,
    isAdding: addTimeMutation.isPending,
    isDeleting: deleteEntryMutation.isPending,
    
    // Helpers
    formatSeconds,
  };
};
