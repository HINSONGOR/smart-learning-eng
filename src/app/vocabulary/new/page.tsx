import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { VocabularyForm } from "@/features/vocabulary/VocabularyForm";

export default function NewVocabularyPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <VocabularyForm mode="create" />
    </Suspense>
  );
}
