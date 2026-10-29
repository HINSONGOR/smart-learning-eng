import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { Flashcards } from "@/features/vocabulary/Flashcards";

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Flashcards />
    </Suspense>
  );
}
