import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { HistoryDetail } from "@/features/progress/HistoryDetail";

export default function HistoryDetailPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <HistoryDetail />
    </Suspense>
  );
}
