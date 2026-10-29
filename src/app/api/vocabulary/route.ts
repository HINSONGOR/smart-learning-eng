import { handle, learnerIdFrom, queryObject, readBody } from "@/lib/api";
import { assertLearner } from "@/services/settingsService";
import { createVocabulary, listVocabulary } from "@/services/vocabularyService";

export async function GET(request: Request) {
  return handle(async () => {
    const learnerId = await assertLearner(learnerIdFrom(request));
    return listVocabulary(learnerId, queryObject(request));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const body = ((await readBody(request)) ?? {}) as Record<string, unknown>;
    const { learnerId, markForReview, ...input } = body;
    const options = markForReview
      ? { learnerId: await assertLearner(learnerId), markForReview: true }
      : {};
    return createVocabulary(input, options);
  }, 201);
}
