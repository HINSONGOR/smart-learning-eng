import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { ExerciseRunner } from "@/features/reading-lab/ExerciseRunner";

export default function ExercisePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ExerciseRunner />
    </Suspense>
  );
}
