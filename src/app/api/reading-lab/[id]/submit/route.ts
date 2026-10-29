import { handle, readBody } from "@/lib/api";
import { submitExercise } from "@/services/readingLabService";

export async function POST(request: Request, ctx: RouteContext<"/api/reading-lab/[id]/submit">) {
  return handle(async () => {
    const { id } = await ctx.params;
    return submitExercise(id, await readBody(request));
  }, 201);
}
