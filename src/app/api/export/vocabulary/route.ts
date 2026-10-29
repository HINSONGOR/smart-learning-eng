// 匯出生字表 Word 檔（可按篩選條件）
import { handleDocx, learnerIdFrom, queryObject } from "@/lib/api";
import { exportVocabulary } from "@/services/exportService";
import { assertLearner } from "@/services/settingsService";

export async function GET(request: Request) {
  return handleDocx(async () => {
    const learnerId = await assertLearner(learnerIdFrom(request));
    const filter = queryObject(request);
    delete filter.learnerId;
    return exportVocabulary(learnerId, filter);
  });
}
