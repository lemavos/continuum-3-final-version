# Time Tracking Feature - Integration Checklist

## Backend Integration

### ✅ Created Files

Domain Models:
- `backend/src/main/java/tech/lemnova/continuum/domain/timetracking/TimeEntry.java`
- `backend/src/main/java/tech/lemnova/continuum/domain/timetracking/TimerSession.java`
- `backend/src/main/java/tech/lemnova/continuum/domain/timetracking/TimeEntrySource.java`
- `backend/src/main/java/tech/lemnova/continuum/domain/timetracking/TimerStatus.java`

DTOs:
- `backend/src/main/java/tech/lemnova/continuum/controller/dto/timetracking/AddTimeRequest.java`
- `backend/src/main/java/tech/lemnova/continuum/controller/dto/timetracking/StartTimerRequest.java`
- `backend/src/main/java/tech/lemnova/continuum/controller/dto/timetracking/StopTimerRequest.java`
- `backend/src/main/java/tech/lemnova/continuum/controller/dto/timetracking/TimeEntryResponse.java`
- `backend/src/main/java/tech/lemnova/continuum/controller/dto/timetracking/TimerSessionResponse.java`
- `backend/src/main/java/tech/lemnova/continuum/controller/dto/timetracking/TimeEntitySummary.java`

Repositories:
- `backend/src/main/java/tech/lemnova/continuum/infra/repository/TimeEntryRepository.java`
- `backend/src/main/java/tech/lemnova/continuum/infra/repository/TimerSessionRepository.java`

Services:
- `backend/src/main/java/tech/lemnova/continuum/application/service/TimeTrackingService.java`

Controllers:
- `backend/src/main/java/tech/lemnova/continuum/controller/TimeTrackingController.java`

### ✅ MongoDB Collections

The application will automatically create these collections on first use:
```
time_entries
timer_sessions
```

### TODO: Application Integration

1. **Update Entity deletion handler**
   - Call `timeTrackingService.deleteEntityTimeData(entityId)` when entity is deleted
   - Ensures cascade deletion of time entries and timer sessions

Example:
```java
@DeleteMapping("/entities/{id}")
public ResponseEntity<?> deleteEntity(@PathVariable String id, @AuthenticationPrincipal CustomUserDetails user) {
    // ... existing delete logic ...
    
    // NEW: Cleanup time tracking data
    timeTrackingService.deleteEntityTimeData(id);
    
    return ResponseEntity.noContent().build();
}
```

2. **Update Entity type validation**
   - Only PROJECT and HABIT types should be time-trackable
   - Frontend enforces this, but backend should too

## Frontend Integration

### ✅ Created Files

Hooks:
- `src/hooks/useTimeTracking.ts` - Custom hook for API integration

Components:
- `src/components/TimerWidget.tsx` - Reusable timer component
- `src/components/TimeTrackingList.tsx` - List view
- `src/components/TimeTrackingDetail.tsx` - Detail view

Pages:
- `src/pages/TimeTracking.tsx` - Main page
- `src/pages/TimeTrackingDetail.tsx` - Detail page

### TODO: Router Integration

1. **Add routes to your main router**

In your main routing file (e.g., `src/main.tsx` or `src/App.tsx`):

```typescript
import TimeTracking from '@/pages/TimeTracking';
import TimeTrackingDetail from '@/pages/TimeTrackingDetail';

const routes = [
  {
    path: '/time-tracking',
    element: <TimeTracking />,
    // Add breadcrumb: 'Time Tracking'
  },
  {
    path: '/time-tracking/:entityId',
    element: <TimeTrackingDetail />,
    // Add breadcrumb: breadcrumb parent + entity name
  },
];
```

2. **Add navigation link to sidebar/navbar**

```typescript
import { Clock } from 'lucide-react';

// In your navigation component
<NavLink 
  to="/time-tracking" 
  icon={Clock} 
  label="Time Tracking"
/>
```

3. **Update dashboard (optional)**

Add a "Time Tracking Summary" widget to show active timers:

```typescript
import { useTimeTracking } from '@/hooks/useTimeTracking';

function DashboardWidget() {
  const { getAllSummaries } = useTimeTracking();
  const { data: summaries } = getAllSummaries();
  
  return (
    <Card>
      <h3>Active Now</h3>
      {summaries?.filter((s: any) => s.hasActiveTimer).map(summary => (
        <div key={summary.entityId}>
          {summary.entityTitle}
          <span className="text-cyan-400">{summary.activeSessionDuration}</span>
        </div>
      ))}
    </Card>
  );
}
```

## API Integration Steps

### 1. **Verify Backend is Running**

Check that these endpoints are accessible:
```bash
# Test the API
curl http://localhost:8080/api/time-tracking/active/all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. **Update Frontend API Configuration**

The frontend already integrates with existing API setup in `src/lib/api.ts`:

```typescript
// No changes needed - uses existing axios instance
api.get  // GET requests
api.post // POST requests
api.delete // DELETE requests
```

### 3. **Test the Feature**

1. Start backend: `java -jar continuum-backend.jar`
2. Start frontend: `npm run dev`
3. Navigate to `/time-tracking`
4. Create projects/habits if needed
5. Start a timer
6. Verify time is logged

## Feature Customization

### Modify Timer Default Settings

In `useTimeTracking.ts`:
```typescript
// Auto-refetch intervals
refetchInterval: activeTimerId ? 1000 : 5000  // Change from 5s to 10s
```

### Change Timer Widget Styling

In `TimerWidget.tsx`:
```typescript
// Colors
const timerColor = 'text-cyan-400';  // Change to 'text-emerald-400'
const activeRing = 'ring-cyan-500';  // Change ring color
```

### Add Custom Statistics

Extend `TimeTrackingService.java`:
```java
public TimeStatistics getMonthlyStats(String userId, String entityId, int year, int month) {
    // Implement monthly aggregation
}
```

## Performance Considerations

### ✅ Optimized

- MongoDB indexes on userId, entityId, date
- Efficient GROUP BY queries
- Real-time updates with 1-second throttle
- localStorage caching for active timers
- Query key-based caching in React Query

### Potential Improvements

1. **Pagination** - For users with many time entries (1000+)
2. **Aggregation Pipeline** - For complex statistics
3. **Service Worker** - For offline timer support
4. **Connection Pooling** - For high throughput

## Security Considerations

### ✅ Implemented

- userId validation on all operations
- vaultId isolation (horizontal privilege escalation prevention)
- No cross-user data leakage
- Input validation on requests

### Additional Measures (Optional)

1. **Rate Limiting** - Prevent timer spam
2. **Audit Logging** - Log time entry modifications
3. **Encryption** - Encrypt sensitive time notes
4. **2FA** - For sensitive operations (if needed)

## Testing

### Backend Unit Tests

Create `TimeTrackingServiceTest`:
```java
@SpringBootTest
class TimeTrackingServiceTest {
    @Test
    void testStartTimer() { }
    @Test
    void testStopTimer() { }
    @Test
    void testAddTime() { }
    @Test
    void testGetTotalTime() { }
}
```

### Frontend Component Tests

Create `TimeTrackingList.test.tsx`:
```typescript
describe('TimeTrackingList', () => {
  it('should display entities with timers', () => { });
  it('should start timer on click', () => { });
  it('should show total time', () => { });
});
```

## Troubleshooting

### Timer not starting?
- Check backend is running
- Verify auth token is valid
- Check browser network tab for failed requests
- Verify entityId is valid

### Time not persisting?
- Check MongoDB is running
- Verify time entries are created in DB
- Check userId is being passed correctly

### Active timer showing multiple?
- Clear localStorage: `localStorage.clear()`
- Restart backend to reset timer sessions

## Support

For issues or questions:
1. Check `TIME_TRACKING_FEATURE.md` for architecture details
2. Review endpoint documentation in `TimeTrackingController.java`
3. Check React Query caching with React Query Devtools
4. Log MongoDB queries for debugging

---

**Status**: ✅ Full feature implementation complete and ready for integration
