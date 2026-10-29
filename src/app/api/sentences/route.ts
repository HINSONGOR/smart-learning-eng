import { handle, queryObject } from "@/lib/api";
import { listPracticeSentences } from "@/services/sentenceService";

export async function GET(request: Request) {
  return handle(async () => listPracticeSentences(queryObject(request)));
}
