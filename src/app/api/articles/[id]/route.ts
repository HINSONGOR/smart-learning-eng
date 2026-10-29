import { handle, learnerIdFrom } from "@/lib/api";
import { getArticle } from "@/services/articleService";
import { assertLearner } from "@/services/settingsService";

export async function GET(request: Request, ctx: RouteContext<"/api/articles/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    return getArticle(await assertLearner(learnerIdFrom(request)), id);
  });
}
