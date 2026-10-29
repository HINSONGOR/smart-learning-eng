import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { QuizSession } from "@/features/practice/QuizSession";

export default function PracticeSessionPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <QuizSession />
    </Suspense>
  );
}
