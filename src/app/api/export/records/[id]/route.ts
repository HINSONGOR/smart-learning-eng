// 匯出單次練習的詳細答案 Word 檔
import { handleDocx, learnerIdFrom } from "@/lib/api";
import { exportRecord } from "@/services/exportService";
import { assertLearner } from "@/services/settingsService";

export async function GET(request: Request, ctx: RouteContext<"/api/export/records/[id]">) {
  return handleDocx(async () => {
    const { id } = await ctx.params;
    return exportRecord(await assertLearner(learnerIdFrom(request)), id);
  });
}
