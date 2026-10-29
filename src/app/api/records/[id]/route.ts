import { handle, learnerIdFrom } from "@/lib/api";
import { deleteRecord, getRecord } from "@/services/recordService";
import { assertLearner } from "@/services/settingsService";

export async function GET(request: Request, ctx: RouteContext<"/api/records/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    return getRecord(await assertLearner(learnerIdFrom(request)), id);
  });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/records/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    await deleteRecord(await assertLearner(learnerIdFrom(request)), id);
    return { ok: true };
  });
}
