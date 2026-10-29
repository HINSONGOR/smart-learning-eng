import { handle, learnerIdFrom } from "@/lib/api";
import { listArticles } from "@/services/articleService";
import { assertLearner } from "@/services/settingsService";

export async function GET(request: Request) {
  return handle(async () => listArticles(await assertLearner(learnerIdFrom(request))));
}
