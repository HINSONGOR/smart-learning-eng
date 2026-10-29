import { handle } from "@/lib/api";
import { listTopics } from "@/services/vocabularyService";

export async function GET() {
  return handle(() => listTopics());
}
