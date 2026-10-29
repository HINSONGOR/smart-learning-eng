import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { Dictation } from "@/features/listening/Dictation";

export default function DictationPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Dictation />
    </Suspense>
  );
}
