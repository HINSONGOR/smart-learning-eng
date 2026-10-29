import { handle } from "@/lib/api";
import { getPublicExercise } from "@/services/readingLabService";

export async function GET(_request: Request, ctx: RouteContext<"/api/reading-lab/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    return getPublicExercise(id);
  });
}
