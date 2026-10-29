// 匯出練習歷史列表 Word 檔
import { handleDocx, learnerIdFrom } from "@/lib/api";
import { PRACTICE_KIND_IDS, type PracticeKind } from "@/lib/constants";
import { exportRecordList } from "@/services/exportService";
import { assertLearner } from "@/services/settingsService";

export async function GET(request: Request) {
  return handleDocx(async () => {
    const learnerId = await assertLearner(learnerIdFrom(request));
    const kind = new URL(request.url).searchParams.get("kind") ?? "";
    const validKind = (PRACTICE_KIND_IDS as readonly string[]).includes(kind) ? (kind as PracticeKind) : "";
    return exportRecordList(learnerId, validKind);
  });
}
