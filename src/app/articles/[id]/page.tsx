import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { ArticleReader } from "@/features/articles/ArticleReader";

export default function ArticlePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ArticleReader />
    </Suspense>
  );
}
