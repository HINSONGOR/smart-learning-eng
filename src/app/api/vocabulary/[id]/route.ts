import { handle, learnerIdFrom, readBody } from "@/lib/api";
import { assertLearner } from "@/services/settingsService";
import { deleteVocabulary, getVocabulary, updateVocabulary } from "@/services/vocabularyService";

export async function GET(request: Request, ctx: RouteContext<"/api/vocabulary/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    return getVocabulary(await assertLearner(learnerIdFrom(request)), id);
  });
}

export async function PUT(request: Request, ctx: RouteContext<"/api/vocabulary/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    return updateVocabulary(id, await readBody(request));
  });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/vocabulary/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    await deleteVocabulary(id);
    return { ok: true };
  });
}
