# Time Tracking Feature - Usage Examples

## Basic Usage

### Starting a Timer

```typescript
import { useTimeTracking } from '@/hooks/useTimeTracking';

function MyComponent() {
  const { startTimer, stopTimer } = useTimeTracking();

  const handleStartClick = async () => {
    try {
      await startTimer('entity-123');
      console.log('Timer started');
    } catch (error) {
      console.error('Failed to start timer');
    }
  };

  const handleStopClick = async () => {
    try {
      await stopTimer({ sessionId: 'timer-session-id' });
      console.log('Timer stopped and time logged');
    } catch (error) {
      console.error('Failed to stop timer');
    }
  };

  return (
    <div>
      <button onClick={handleStartClick}>Start</button>
      <button onClick={handleStopClick}>Stop</button>
    </div>
  );
}
```

## In your Dashboard

### Show Quick Summary

```typescript
function Dashboard() {
  const { getAllSummaries } = useTimeTracking();
  const { data: summaries } = getAllSummaries();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {summaries?.map(summary => (
        <Card key={summary.entityId}>
          <h3>{summary.entityTitle}</h3>
          <p className="text-2xl font-bold">{summary.formattedTotal}</p>
          <p className="text-sm text-gray-500">
            {summary.entriesCount} sessions
          </p>
          {summary.hasActiveTimer && (
            <p className="text-green-400">Active now</p>
          )}
        </Card>
      ))}
    </div>
  );
}
```

### Show Active Timers Only

```typescript
function ActiveTimersWidget() {
  const { getAllSummaries } = useTimeTracking();
  const { data: summaries } = getAllSummaries();

  const activeTimers = summaries?.filter(s => s.hasActiveTimer) || [];

  if (activeTimers.length === 0) {
    return <p>No active timers</p>;
  }

  return (
    <div className="space-y-2">
      <h3>Currently Tracking</h3>
      {activeTimers.map(timer => (
        <div 
          key={timer.entityId} 
          className="flex justify-between items-center p-2 bg-yellow-100"
        >
          <span>{timer.entityTitle}</span>
          <span className="font-mono font-bold text-green-600">
            {formatSeconds(timer.activeSessionDuration || 0)}
          </span>
        </div>
      ))}
    </div>
  );
}
```

## In Entity Detail Page

### Show Time Stats

```typescript
function EntityDetail({ entityId }) {
  const { getTotalTime, getDailyBreakdown } = useTimeTracking();
  
  const { data: totalTime } = getTotalTime(entityId);
  const { data: dailyBreakdown } = getDailyBreakdown(entityId);

  return (
    <div>
      <div className="stats-grid">
        <StatCard 
          label="Total Time" 
          value={totalTime?.formattedTotal} 
          subtext={`${totalTime?.entriesCount} sessions`}
        />
        <StatCard 
          label="Total Hours" 
          value={totalTime?.totalHours.toFixed(1)} 
          subtext={`${totalTime?.totalHours.toFixed(1)}h`}
        />
      </div>

      <div className="recent-logs">
        <h3>Recent Activity</h3>
        {Object.entries(dailyBreakdown || {})
          .slice(0, 7)
          .map(([date, entry]) => (
            <div key={date} className="log-entry">
              <span>{formatDate(date)}</span>
              <span className="font-mono">{entry.formattedDuration}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
```

## In Sidebar/Navigation

### Show If Timer is Running

```typescript
function NavBar() {
  const { activeTimerId, formatSeconds } = useTimeTracking();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeTimerId) return;
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimerId]);

  if (!activeTimerId) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-green-500 text-white p-4 rounded-lg">
      <p className="font-mono text-lg">{formatSeconds(elapsed)}</p>
      <p className="text-sm">Timer running...</p>
    </div>
  );
}
```

## Advanced Scenarios

### Stop All Active Timers

```typescript
async function stopAllTimers() {
  const { getAllSummaries, stopTimer } = useTimeTracking();
  const { data: summaries } = getAllSummaries();

  const activeTimers = summaries?.filter(s => s.hasActiveTimer) || [];

  for (const timer of activeTimers) {
    try {
      await stopTimer({ sessionId: timer.entityId });
    } catch (error) {
      console.error(`Failed to stop timer for ${timer.entityId}`);
    }
  }
}
```

### Batch Add Time

```typescript
async function addBatchTime(entries: Array<{ entityId: string; hours: number; date: string }>) {
  const { addTime } = useTimeTracking();

  for (const entry of entries) {
    try {
      await addTime({
        entityId: entry.entityId,
        date: entry.date,
        durationSeconds: entry.hours * 3600,
      });
    } catch (error) {
      console.error(`Failed to add time for ${entry.entityId}`);
    }
  }
}
```

### Weekly Report

```typescript
function WeeklyReport({ entityId }) {
  const { getTimeInRange } = useTimeTracking();
  
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data: weeklyEntries } = useQuery({
    queryKey: ['weeklyReport', entityId],
    queryFn: () => getTimeInRange(entityId, weekAgo, today).data,
  });

  const totalWeekSeconds = weeklyEntries?.reduce(
    (sum, entry) => sum + entry.durationSeconds, 
    0
  ) || 0;

  const avgPerDay = totalWeekSeconds / weeklyEntries?.length || 0;

  return (
    <div className="space-y-4">
      <h2>This Week's Summary</h2>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-gray-500">Total</p>
          <p className="text-2xl font-bold">{formatSeconds(totalWeekSeconds)}</p>
        </Card>
        <Card>
          <p className="text-gray-500">Average per Day</p>
          <p className="text-2xl font-bold">{formatSeconds(avgPerDay)}</p>
        </Card>
      </div>
    </div>
  );
}
```

### Session Recovery

```typescript
function SessionRecoveryWidget() {
  const { getActiveTimer } = useTimeTracking();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAndRecoverSession = async () => {
      const savedTimerId = localStorage.getItem('activeTimerId');
      if (!savedTimerId) return;

      // Query if that timer still exists
      const timer = await getActiveTimer('some-entity-id').data;
      
      if (timer) {
        // Session exists, show recovery option
        showRecoveryPrompt(timer);
      }
    };

    checkAndRecoverSession();
  }, []);

  return null;
}
```

### Manual Time Entry Form

```typescript
function AddTimeForm({ entityId, onSuccess }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [note, setNote] = useState('');

  const { addTime, isAdding } = useTimeTracking();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const totalSeconds = hours * 3600 + minutes * 60;

    try {
      await addTime({
        entityId,
        date,
        durationSeconds: totalSeconds,
        note,
      });
      onSuccess?.();
      // Reset form
      setHours(1);
      setMinutes(0);
      setNote('');
    } catch (error) {
      alert('Failed to add time');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Date</label>
        <input 
          type="date" 
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Hours</label>
          <input 
            type="number" 
            min="0"
            value={hours}
            onChange={(e) => setHours(parseInt(e.target.value))}
          />
        </div>
        <div>
          <label>Minutes</label>
          <input 
            type="number" 
            min="0" 
            max="59"
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value))}
          />
        </div>
      </div>

      <div>
        <label>Note (Optional)</label>
        <textarea 
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you work on?"
        />
      </div>

      <button type="submit" disabled={isAdding}>
        {isAdding ? 'Adding...' : 'Add Time'}
      </button>
    </form>
  );
}
```

### Daily Time Log

```typescript
function DailyLog({ date }) {
  const { getDailyBreakdown } = useTimeTracking();
  const { data: entries } = getDailyBreakdown('some-entity');

  const dayEntries = entries?.[date] || [];

  if (!dayEntries) {
    return <p>No entries for this day</p>;
  }

  return (
    <div className="space-y-2">
      <h3>{format(new Date(date), 'EEEE, MMMM d')}</h3>
      <div className="border rounded p-4">
        <div className="flex justify-between items-center">
          <span>Total</span>
          <span className="font-mono font-bold text-lg">
            {dayEntries.formattedDuration}
          </span>
        </div>
        {dayEntries.note && (
          <p className="text-sm text-gray-600 mt-2">{dayEntries.note}</p>
        )}
      </div>
    </div>
  );
}
```

### Time Entry History with Pagination

```typescript
function TimeHistory({ entityId }) {
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;

  const { getDailyBreakdown } = useTimeTracking();
  const { data: allEntries } = getDailyBreakdown(entityId);

  const entries = Object.entries(allEntries || {})
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA));

  const paginatedEntries = entries.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage
  );

  const totalPages = Math.ceil(entries.length / itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {paginatedEntries.map(([date, entry]) => (
          <div key={date} className="flex justify-between p-2 border-b">
            <span>{format(new Date(date), 'MMM d')}</span>
            <span className="font-mono">{entry.formattedDuration}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <button 
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Previous
        </button>
        <span>Page {page + 1} of {totalPages}</span>
        <button 
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page === totalPages - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

**These examples demonstrate real-world usage patterns for the Time Tracking feature.**
