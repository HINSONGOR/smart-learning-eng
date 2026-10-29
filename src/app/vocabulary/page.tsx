import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { VocabularyList } from "@/features/vocabulary/VocabularyList";

export default function VocabularyPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <VocabularyList />
    </Suspense>
  );
}
