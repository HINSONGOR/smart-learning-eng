import { handle, learnerIdFrom } from "@/lib/api";
import { listExerciseSummaries } from "@/services/readingLabService";
import { assertLearner } from "@/services/settingsService";

export async function GET(request: Request) {
  return handle(async () => listExerciseSummaries(await assertLearner(learnerIdFrom(request))));
}
