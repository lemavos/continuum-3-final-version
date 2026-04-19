# Tracked Entities with Daily Timers - Complete Implementation Guide

## 📋 Overview

This is a complete feature that allows users to track time spent on different entities (projects, habits, etc.) using daily timers. Users can:

- ⏱️ **Start/Stop Timers** - Track time in real-time
- 📊 **View Statistics** - See total time, daily breakdown, weekly summaries
- ➕ **Manual Entry** - Add time retrospectively
- 💾 **Persistent Sessions** - Recover interrupted timers from localStorage
- 📱 **Live Updates** - Real-time timer display with 1-second refresh

## 🏗️ Architecture

### Backend (Java/Spring Boot)

#### Domain Models

**TimeEntry** - Represents accumulated time on an entity for a specific date
```java
@Document(collection = "time_entries")
public class TimeEntry {
    String id;
    String userId;
    String entityId;
    String vaultId;
    LocalDate date;
    Long durationSeconds;      // Sum of all sessions that day
    String note;
    TimeEntrySource source;     // TIMER | MANUAL | RECOVERED
    Instant createdAt;
}
```

**TimerSession** - Tracks an active or completed timer session
```java
@Document(collection = "timer_sessions")
public class TimerSession {
    String id;
    String userId;
    String entityId;
    String vaultId;
    Instant startedAt;
    Instant stoppedAt;          // null while running
    TimerStatus status;         // RUNNING | COMPLETED | ABANDONED
    Instant createdAt;
}
```

**TimeEntrySource** (Enum)
- `TIMER` - Created from an active timer session
- `MANUAL` - Manually added by the user
- `RECOVERED` - Recovered from an interrupted session

**TimerStatus** (Enum)
- `RUNNING` - Timer is currently active
- `COMPLETED` - Timer was stopped and time was logged
- `ABANDONED` - Timer was abandoned without logging

#### Services

**TimeTrackingService** - Main business logic
- `startTimer()` - Start new timer (prevents multiple timers)
- `stopTimer()` - Stop timer and create time entry
- `addTime()` - Manually add time
- `getTotalTime()` - Get accumulated time for entity
- `getDailyBreakdown()` - Get time grouped by date
- `getTimeInRange(from, to)` - Get time entries in date range
- `getAllEntitiesSummary()` - Get summaries for all entities in vault
- `recoverSession()` - Recover interrupted timer
- `deleteEntityTimeData()` - Cascade delete when entity is deleted

#### Repositories

**TimeEntryRepository** - MongoDB queries for time entries
```
findByUserIdAndEntityIdOrderByDateDesc()
findByUserIdAndDateOrderByCreatedAtDesc()
findByUserIdAndEntityIdAndDateBetweenOrderByDateDesc()
findByUserIdAndEntityIdAndDate()
```

**TimerSessionRepository** - MongoDB queries for timer sessions
```
findByUserIdAndEntityIdAndStatus()
findByUserIdAndStatus()
findFirstByUserIdAndEntityIdOrderByCreatedAtDesc()
existsByUserIdAndEntityIdAndStatus()
```

#### Controllers

**TimeTrackingController** - REST endpoints

```
POST   /api/time-tracking/start
       → Start a timer for an entity

POST   /api/time-tracking/stop
       → Stop timer and save time entry

POST   /api/time-tracking/add
       → Manually add time to an entity

GET    /api/time-tracking/:entityId/total
       → Get total time summary

GET    /api/time-tracking/:entityId/daily
       → Get daily breakdown (grouped by date)

GET    /api/time-tracking/:entityId/range?from=2024-01-01&to=2024-01-31
       → Get time entries in range

GET    /api/time-tracking/summary/all
       → Get summaries for all entities

GET    /api/time-tracking/:entityId/active
       → Get active timer for entity

GET    /api/time-tracking/active/all
       → Get all active timers for user

DELETE /api/time-tracking/:entryId
       → Delete a time entry

POST   /api/time-tracking/:entityId/recover
       → Recover interrupted timer
```

### Frontend (React + TypeScript)

#### Custom Hook: `useTimeTracking`

```typescript
const {
  // Queries
  getTotalTime,
  getDailyBreakdown,
  getAllSummaries,
  getActiveTimer,
  
  // Mutations
  startTimer,
  stopTimer,
  addTime,
  deleteEntry,
  
  // State
  activeTimerId,
  isStarting,
  isStopping,
  isAdding,
  
  // Helpers
  formatSeconds,
} = useTimeTracking();
```

**Features:**
- Auto-recovery from localStorage on mount
- Real-time state synchronization
- Automatic query invalidation
- Easy-to-use mutation functions

#### Components

**TimerWidget** - Reusable timer component
```typescript
<TimerWidget
  entityId="project-123"
  entityName="Build SaaS"
  onTimerStart={(sessionId) => {}}
  onTimerStop={(duration) => {}}
  compact={false}
/>
```

- Displays live timer (HH:MM:SS)
- Start/Stop buttons
- Auto-updates every second
- Compact mode for inline use

**TimeTrackingList** - List of all trackable entities
- Shows total time per entity
- Quick-start timer buttons
- Entity summaries (entries count, total hours)
- Card-based grid layout
- Navigation to detail view

**TimeTrackingDetail** - Detailed view for single entity
- Large timer widget
- Statistics cards (Total, This Week, Sessions)
- Manual time entry dialog
- 30-day history with delete option
- Weekly stats calculation

#### Pages

**TimeTracking.tsx** - Main page wrapper
**TimeTrackingDetail.tsx** - Detail page wrapper

### Database (MongoDB)

Collections:
```
time_entries
├── userId (indexed)
├── entityId (indexed)
├── vaultId (indexed)
├── date (indexed)
└── createdAt (indexed)

timer_sessions
├── userId (indexed)
├── entityId (indexed)
├── vaultId (indexed)
└── status (indexed)
```

## 🔧 Integration Steps

### 1. **Backend Setup**

The backend code is already created in:
```
backend/src/main/java/tech/lemnova/continuum/
├── domain/timetracking/
│   ├── TimeEntry.java
│   ├── TimerSession.java
│   ├── TimeEntrySource.java
│   └── TimerStatus.java
├── application/service/
│   └── TimeTrackingService.java
├── controller/
│   ├── TimeTrackingController.java
│   └── dto/timetracking/
│       ├── AddTimeRequest.java
│       ├── StartTimerRequest.java
│       ├── StopTimerRequest.java
│       ├── TimeEntryResponse.java
│       ├── TimerSessionResponse.java
│       └── TimeEntitySummary.java
└── infra/repository/
    ├── TimeEntryRepository.java
    └── TimerSessionRepository.java
```

### 2. **Frontend Setup**

Add routes to your app router:

```typescript
// In your routing configuration
import TimeTracking from '@/pages/TimeTracking';
import TimeTrackingDetail from '@/pages/TimeTrackingDetail';

const routes = [
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

### 3. **Update Navigation**

Add link to Time Tracking in your sidebar/navbar:

```typescript
<NavLink to="/time-tracking" icon={Clock} label="Time Tracking" />
```

### 4. **Update Entity Deletion**

When an entity is deleted, call cleanup:

```typescript
// In your EntityService or controller
timeTrackingService.deleteEntityTimeData(entityId);
```

## 🚀 Usage Examples

### Start a Timer
```typescript
const { startTimer } = useTimeTracking();

// Start timer for an entity
await startTimer('entity-123');
```

### Add Manual Time
```typescript
const { addTime } = useTimeTracking();

// Add 2 hours manually
await addTime({
  entityId: 'entity-123',
  date: '2024-01-15',
  durationSeconds: 7200,
  note: 'Worked on API development'
});
```

### Get Total Time
```typescript
const { data: summary } = getTotalTime('entity-123');

console.log(summary.formattedTotal);  // "10:30:45"
console.log(summary.totalHours);      // 10.5125
```

### Show Timer Widget
```typescript
<TimerWidget
  entityId="project-123"
  entityName="Build SaaS"
  onTimerStart={(id) => console.log('Started')}
  onTimerStop={(duration) => console.log(`Tracked ${duration}s`)}
/>
```

## 🔄 Real-time Updates

The system auto-updates:
- Timers refresh every 1 second when running
- Summaries refresh every 5 seconds
- Active timers are tracked in localStorage for recovery
- State syncs automatically across tabs

## 🛡️ Security

- User ID validation on all operations
- Vault ID isolation (users can only access their vault)
- Time entries are scoped to userId
- No cross-user data leakage

## 📊 Key Features

### ✅ Multiple timers prevention
Only one timer can run per entity. Starting a new timer automatically stops the old one.

### ✅ Session recovery
If a timer is interrupted (page closed, network error), it can be recovered from localStorage.

### ✅ Flexible time entry
- From timer (accurate)
- Manual entry (for past work)
- Recovered (from interrupted sessions)

### ✅ Daily aggregation
Multiple time entries per day are summed automatically.

### ✅ Statistics
- Total accumulated time
- Daily breakdown
- Weekly summaries
- Session count

### ✅ Performance
- Indexed MongoDB queries
- Efficient GROUP BY aggregations
- Real-time UI updates without lag

## 🎯 Use Cases

1. **Project Tracking** - Track time spent on different projects
2. **Habit Tracking** - Log time spent on daily habits (exercise, study, etc.)
3. **Billable Hours** - Accurate time logging for client work
4. **Productivity Analytics** - Weekly/monthly time summaries
5. **Goal Management** - Track progress toward time-based goals

## 🔮 Future Enhancements

- Weekly heatmap visualization
- Monthly/yearly summaries
- Timezone support
- Offline timer (service worker)
- Timer notifications
- Time entry tags/categories
- Export to CSV
- Team/shared projects
- Pomodoro integration
- Automatic timer via activity detection

## 📝 Notes

- All timestamps are in seconds for consistency
- MongoDB auto-indexes ensure query performance
- LocalStorage prevents losing active timers on reload
- Service handles concurrent timer requests gracefully
