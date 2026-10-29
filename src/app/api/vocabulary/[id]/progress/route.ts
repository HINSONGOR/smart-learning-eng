import { handle, readBody } from "@/lib/api";
import { assertLearner } from "@/services/settingsService";
import { setVocabularyFlags } from "@/services/vocabularyService";

export async function PATCH(request: Request, ctx: RouteContext<"/api/vocabulary/[id]/progress">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { learnerId, ...flags } = ((await readBody(request)) ?? {}) as Record<string, unknown>;
    return setVocabularyFlags(await assertLearner(learnerId), id, flags);
  });
}
