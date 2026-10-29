import { handle, readBody } from "@/lib/api";
import { setArticleFlags } from "@/services/articleService";
import { assertLearner } from "@/services/settingsService";

export async function PATCH(request: Request, ctx: RouteContext<"/api/articles/[id]/progress">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { learnerId, ...flags } = ((await readBody(request)) ?? {}) as Record<string, unknown>;
    return setArticleFlags(await assertLearner(learnerId), id, flags);
  });
}
