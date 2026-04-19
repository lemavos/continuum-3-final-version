import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeTrackingApi } from '@/lib/api';

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

// Global timer state to ensure smooth counting
let globalElapsedSeconds = 0;
let globalTimerIntervalId: NodeJS.Timeout | null = null;
let globalActiveTimerId: string | null = null;
let globalActiveEntityId: string | null = null;

/** 
 * Hook for managing time tracking operations
 */
export const useTimeTracking = () => {
  const queryClient = useQueryClient();
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);

  // Query: Get total time for an entity
  const getTotalTime = (entityId: string) => {
    return useQuery({
      queryKey: ['timeTracking', 'total', entityId],
      queryFn: () => timeTrackingApi.getTotalTime(entityId).then(r => r.data),
      refetchInterval: false, // Disabled to avoid re-renders
      staleTime: 10000, // Cache for 10 seconds
    });
  };

  // Query: Get daily breakdown
  const getDailyBreakdown = (entityId: string) => {
    return useQuery({
      queryKey: ['timeTracking', 'daily', entityId],
      queryFn: () => timeTrackingApi.getDailyBreakdown(entityId).then(r => r.data),
      staleTime: 30000, // Cache for 30 seconds
    });
  };

  // Query: Get all summaries
  const getAllSummaries = () => {
    return useQuery({
      queryKey: ['timeTracking', 'summaries'],
      queryFn: () => timeTrackingApi.getAllSummaries().then(r => r.data),
      refetchInterval: false, // Manual refetch only
      staleTime: 5000, // Cache for 5 seconds
    });
  };

  // Query: Get active timer
  const getActiveTimer = (entityId: string) => {
    return useQuery({
      queryKey: ['timeTracking', 'activeTimer', entityId],
      queryFn: () => timeTrackingApi.getActiveTimer(entityId).then(r => r.data),
      refetchInterval: false, // Use local timer instead
      staleTime: 2000, // Cache for 2 seconds
    });
  };

  // Mutation: Start timer
  const startTimerMutation = useMutation({
    mutationFn: (entityId: string) => {
      console.log('API call: startTimer for entityId:', entityId);
      return timeTrackingApi.startTimer(entityId).then(r => r.data);
    },
    onSuccess: (data: TimerSession, entityId: string) => {
      console.log('Timer started successfully:', data, 'for entity:', entityId);
      
      // Update global state
      globalActiveTimerId = data.id;
      globalActiveEntityId = entityId;
      globalElapsedSeconds = data.elapsedSeconds || 0;
      
      // Update component state
      setActiveTimerId(data.id);
      setActiveEntityId(entityId);
      setElapsedSeconds(data.elapsedSeconds || 0);
      
      // Save to localStorage for recovery
      localStorage.setItem('activeTimerId', data.id);
      localStorage.setItem('activeEntityId', entityId);
      localStorage.setItem('timerStarted', new Date().toISOString());
      localStorage.setItem('timerElapsed', String(data.elapsedSeconds || 0));
      
      // Start central timer if not already running
      if (!globalTimerIntervalId) {
        globalTimerIntervalId = setInterval(() => {
          globalElapsedSeconds += 1;
          localStorage.setItem('timerElapsed', String(globalElapsedSeconds));
        }, 1000);
      }
      
      queryClient.invalidateQueries({ queryKey: ['timeTracking'] });
    },
    onError: (error) => {
      console.error('Failed to start timer:', error);
    },
  });

  // Mutation: Stop timer
  const stopTimerMutation = useMutation({
    mutationFn: (data: { sessionId: string; note?: string }) => {
      console.log('API call: stopTimer with sessionId:', data.sessionId);
      return timeTrackingApi.stopTimer(data.sessionId, data.note).then(r => r.data);
    },
    onSuccess: () => {
      console.log('Timer stopped successfully');
      
      // Clear global state
      globalActiveTimerId = null;
      globalActiveEntityId = null;
      globalElapsedSeconds = 0;
      
      if (globalTimerIntervalId) {
        clearInterval(globalTimerIntervalId);
        globalTimerIntervalId = null;
      }
      
      // Update component state
      setActiveTimerId(null);
      setActiveEntityId(null);
      setElapsedSeconds(0);
      
      // Clear localStorage
      localStorage.removeItem('activeTimerId');
      localStorage.removeItem('activeEntityId');
      localStorage.removeItem('timerElapsed');
      
      queryClient.invalidateQueries({ queryKey: ['timeTracking'] });
    },
    onError: (error) => {
      console.error('Failed to stop timer:', error);
    },
  });

  // Mutation: Add time manually
  const addTimeMutation = useMutation({
    mutationFn: (data: { entityId: string; date: string; durationSeconds: number; note?: string }) =>
      timeTrackingApi.addTime(data.entityId, data.date, data.durationSeconds, data.note).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeTracking'] });
    },
  });

  // Mutation: Delete entry
  const deleteEntryMutation = useMutation({
    mutationFn: (entryId: string) =>
      timeTrackingApi.deleteEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeTracking'] });
    },
  });

  // Initialize Service Worker for background timer support
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/timer-service-worker.js')
        .then(reg => {
          console.log('Timer Service Worker registered:', reg);
          
          // Request periodic sync permission if available
          if ('periodicSync' in reg) {
            reg.periodicSync.register('sync-timer', { minInterval: 30 * 1000 });
          }
        })
        .catch(err => console.warn('Service Worker registration failed:', err));
        
      // Listen for timer updates from Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'TIMER_UPDATE' && event.data.data.elapsedSeconds) {
          globalElapsedSeconds = event.data.data.elapsedSeconds;
          setElapsedSeconds(event.data.data.elapsedSeconds);
        }
      });
    }
  }, []);
  
  // Notify Service Worker when timer starts/stops
  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      if (activeTimerId) {
        navigator.serviceWorker.controller.postMessage({
          type: 'START_BACKGROUND_TIMER',
          data: {
            sessionId: activeTimerId,
            entityId: activeEntityId,
            elapsedSeconds: elapsedSeconds,
          }
        });
      } else {
        navigator.serviceWorker.controller.postMessage({
          type: 'STOP_BACKGROUND_TIMER'
        });
      }
    }
  }, [activeTimerId, elapsedSeconds, activeEntityId]);
  useEffect(() => {
    const savedTimerId = localStorage.getItem('activeTimerId');
    const savedEntityId = localStorage.getItem('activeEntityId');
    const savedElapsed = localStorage.getItem('timerElapsed');
    const savedStartTime = localStorage.getItem('timerStarted');
    
    if (savedTimerId && savedEntityId) {
      let elapsedTime = parseInt(savedElapsed || '0', 10);
      
      // Calculate elapsed time based on when the timer was saved
      if (savedStartTime) {
        const now = new Date().getTime();
        const startTime = new Date(savedStartTime).getTime();
        const timePassed = Math.floor((now - startTime) / 1000);
        elapsedTime += timePassed;
      }
      
      setActiveTimerId(savedTimerId);
      setActiveEntityId(savedEntityId);
      setElapsedSeconds(elapsedTime);
      
      globalActiveTimerId = savedTimerId;
      globalActiveEntityId = savedEntityId;
      globalElapsedSeconds = elapsedTime;
      
      // Resume timer interval
      if (!globalTimerIntervalId) {
        globalTimerIntervalId = setInterval(() => {
          globalElapsedSeconds += 1;
          setElapsedSeconds(prev => prev + 1);
          localStorage.setItem('timerElapsed', String(globalElapsedSeconds));
        }, 1000);
      }
    }
  }, []);
  
  // Sync global state to local state periodically
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (globalActiveTimerId) {
        setElapsedSeconds(globalElapsedSeconds);
      }
    }, 500);
    
    return () => clearInterval(syncInterval);
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
    activeEntityId,
    elapsedSeconds, // Export elapsed seconds for UI
    isStarting: startTimerMutation.isPending,
    isStopping: stopTimerMutation.isPending,
    isAdding: addTimeMutation.isPending,
    isDeleting: deleteEntryMutation.isPending,
    
    // Helpers
    formatSeconds,
  };
};
