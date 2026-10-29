import { handle, learnerIdFrom, readBody } from "@/lib/api";
import { PRACTICE_KIND_IDS, type PracticeKind } from "@/lib/constants";
import { listRecords, saveClientRecord } from "@/services/recordService";
import { assertLearner } from "@/services/settingsService";

export async function GET(request: Request) {
  return handle(async () => {
    const learnerId = await assertLearner(learnerIdFrom(request));
    const kind = new URL(request.url).searchParams.get("kind") ?? "";
    const validKind = (PRACTICE_KIND_IDS as readonly string[]).includes(kind)
      ? (kind as PracticeKind)
      : "";
    return listRecords(learnerId, validKind);
  });
}

export async function POST(request: Request) {
  return handle(async () => saveClientRecord(await readBody(request)), 201);
}
