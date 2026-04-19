# Time Tracking Feature - Quick Start Guide

## 🚀 5-Minute Integration

### Step 1: Backend is Ready ✅

No action needed. All backend files are created in:
```
backend/src/main/java/tech/lemnova/continuum/
```

The feature auto-registers with Spring Boot.

**Collections automatically created in MongoDB:**
- `time_entries`
- `timer_sessions`

### Step 2: Add Frontend Routes

Edit your router configuration file (likely `src/main.tsx` or `src/App.tsx`):

```typescript
import TimeTracking from '@/pages/TimeTracking';
import TimeTrackingDetail from '@/pages/TimeTrackingDetail';

const routes = [
  // ... existing routes ...
  {
    path: '/time-tracking',
    element: <TimeTracking />,
  },
  {
    path: '/time-tracking/:entityId',
    element: <TimeTrackingDetail />,
  },
];
```

### Step 3: Add Navigation Link

In your sidebar/navbar component, add:

```typescript
import { Clock } from 'lucide-react';
import { NavLink } from '@/components/NavLink'; // or your nav component

<NavLink to="/time-tracking" icon={Clock} label="Time Tracking" />
```

### Step 4: Restart and Test

```bash
# Backend - already running
# Frontend
npm run dev
```

Visit `http://localhost:5173/time-tracking`

---

## 🧪 Quick Test

1. **Create a Project** (if you don't have one)
   - Go to Entities or Dashboard
   - Create a new PROJECT or HABIT

2. **Start Timer**
   - Go to Time Tracking
   - Click "Start" on any entity
   - Wait 30 seconds

3. **Stop Timer**
   - Click "Stop"
   - Verify time is logged
   - Go to entity detail to see in history

---

## 📊 Available Features

### As a User

- ⏱️ Start/stop timers
- ➕ Manually add time
- 📅 View daily breakdown
- 📈 See total time spent
- 🕐 Live timer display
- 💾 Automatic session recovery

### As a Developer

- `useTimeTracking()` hook for API calls
- `<TimerWidget />` component for embedding
- `<TimeTrackingList />` for entity list
- `<TimeTrackingDetail />` for detailed view
- REST API with 10 endpoints
- MongoDB persistence

---

## 🎯 Common Tasks

### Show Timer on Dashboard

```typescript
import { useTimeTracking } from '@/hooks/useTimeTracking';

export function DashboardWidget() {
  const { getAllSummaries } = useTimeTracking();
  const { data: summaries } = getAllSummaries();

  const active = summaries?.filter(s => s.hasActiveTimer) || [];

  return (
    <div>
      <h3>Currently Tracking</h3>
      {active.map(timer => (
        <div key={timer.entityId}>
          {timer.entityTitle}
          <span className="font-bold">{timer.activeSessionDuration}s</span>
        </div>
      ))}
    </div>
  );
}
```

### Embed Timer in Entity Page

```typescript
import { TimerWidget } from '@/components/TimerWidget';

export function EntityPage({ entityId, entityName }) {
  return (
    <div>
      <h1>{entityName}</h1>
      
      {/* Embed timer */}
      <TimerWidget
        entityId={entityId}
        entityName={entityName}
      />

      {/* Rest of page */}
    </div>
  );
}
```

### Add Time Manually

```typescript
import { useTimeTracking } from '@/hooks/useTimeTracking';

export function AddTimeButton({ entityId }) {
  const { addTime } = useTimeTracking();

  const handleAdd = async () => {
    await addTime({
      entityId,
      date: '2024-01-15',
      durationSeconds: 3600, // 1 hour
      note: 'Worked on features',
    });
  };

  return <button onClick={handleAdd}>Add 1 Hour</button>;
}
```

---

## 📚 Documentation

For detailed information:

| Document | Purpose |
|----------|---------|
| [TIME_TRACKING_FEATURE.md](/TIME_TRACKING_FEATURE.md) | Complete feature guide |
| [TIME_TRACKING_INTEGRATION.md](/TIME_TRACKING_INTEGRATION.md) | Integration instructions |
| [TIME_TRACKING_EXAMPLES.md](/TIME_TRACKING_EXAMPLES.md) | Code examples |
| [TIME_TRACKING_ARCHITECTURE.md](/TIME_TRACKING_ARCHITECTURE.md) | Architecture details |
| [TIME_TRACKING_DELIVERY.md](/TIME_TRACKING_DELIVERY.md) | What was delivered |

---

## ❓ FAQ

**Q: Do I need to setup MongoDB manually?**
A: No, Spring Boot handles it automatically.

**Q: Where are the timers stored?**
A: In MongoDB collection `timer_sessions` and time entries in `time_entries`.

**Q: Can users have multiple timers running?**
A: No, only one timer per entity. Starting a new one stops the old.

**Q: What happens if the user closes the browser?**
A: Timer is recovered from localStorage when they return.

**Q: Is it secure?**
A: Yes, userId validated on all operations. Users can only access their own data.

**Q: Can I customize the UI?**
A: Yes, all components are in `src/components/` and fully editable.

---

## ⚠️ Common Issues

### Timer doesn't start
- Check backend is running
- Verify auth token is valid
- Open Dev Tools network tab to see errors

### Time not persisting
- Check MongoDB is running
- Verify entity ID is correct
- Check browser console for errors

### Wrong time calculated
- Ensure all times are in seconds
- Check date format is YYYY-MM-DD
- Verify no timezone issues

---

## 🔗 API Reference

**Quick endpoint reference:**

```bash
# Start timer
POST /api/time-tracking/start
{ "entityId": "..." }

# Stop timer
POST /api/time-tracking/stop
{ "sessionId": "..." }

# Add time manually
POST /api/time-tracking/add
{ "entityId": "...", "date": "2024-01-15", "durationSeconds": 3600 }

# Get total time
GET /api/time-tracking/:entityId/total

# View all summaries
GET /api/time-tracking/summary/all
```

---

## ✨ That's It!

You now have a complete time tracking system. Enjoy!

For advanced customization, see the full documentation files.
