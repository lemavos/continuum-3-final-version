import AppLayout from "@/components/AppLayout";
import { TimeTrackingList } from "@/components/TimeTrackingList";

/**
 * Time Tracking page - main entry point
 */
export default function TimeTracking() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <TimeTrackingList />
      </div>
    </AppLayout>
  );
}
