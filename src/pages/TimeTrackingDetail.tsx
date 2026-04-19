import AppLayout from "@/components/AppLayout";
import { TimeTrackingDetail } from "@/components/TimeTrackingDetail";

/**
 * Time tracking detail page - view and manage a specific entity's time
 */
export default function TimeTrackingDetailPage() {
  return (
    <AppLayout>
      <TimeTrackingDetail />
    </AppLayout>
  );
}
