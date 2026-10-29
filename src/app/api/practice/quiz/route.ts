// 生字練習出題
import { handle, learnerIdFrom, queryObject } from "@/lib/api";
import { createVocabularyQuiz } from "@/services/practiceService";
import { assertLearner } from "@/services/settingsService";

export async function GET(request: Request) {
  return handle(async () => {
    const learnerId = await assertLearner(learnerIdFrom(request));
    return createVocabularyQuiz(learnerId, queryObject(request));
  });
}
