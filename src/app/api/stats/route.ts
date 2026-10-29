import { handle, learnerIdFrom } from "@/lib/api";
import { assertLearner } from "@/services/settingsService";
import { getHomeStats } from "@/services/statsService";

export async function GET(request: Request) {
  return handle(async () => getHomeStats(await assertLearner(learnerIdFrom(request))));
}
