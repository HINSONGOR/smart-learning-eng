import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { ResourceForm } from "@/features/resources/ResourceForm";

export default function EditResourcePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResourceForm mode="edit" />
    </Suspense>
  );
}
