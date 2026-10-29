import { handle, readBody } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import {
  deleteResource,
  getResource,
  setResourceFavorite,
  updateResource,
} from "@/services/resourceService";

export async function GET(_request: Request, ctx: RouteContext<"/api/resources/[id]">) {
  return handle(async () => getResource((await ctx.params).id));
}

export async function PUT(request: Request, ctx: RouteContext<"/api/resources/[id]">) {
  return handle(async () => updateResource((await ctx.params).id, await readBody(request)));
}

/** 只用於切換收藏 */
export async function PATCH(request: Request, ctx: RouteContext<"/api/resources/[id]">) {
  return handle(async () => {
    const body = (await readBody(request)) as { isFavorite?: unknown } | null;
    if (typeof body?.isFavorite !== "boolean") throw new ValidationError("缺少收藏狀態");
    return setResourceFavorite((await ctx.params).id, body.isFavorite);
  });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/resources/[id]">) {
  return handle(async () => {
    await deleteResource((await ctx.params).id);
    return { ok: true };
  });
}
