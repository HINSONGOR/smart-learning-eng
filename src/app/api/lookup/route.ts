import { handle, readBody } from "@/lib/api";
import { lookupText } from "@/services/lookupService";

export async function POST(request: Request) {
  return handle(async () => lookupText(await readBody(request)));
}
