import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { CategoryOverview } from "@/features/categories/CategoryOverview";

export default function CategoryPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CategoryOverview />
    </Suspense>
  );
}
