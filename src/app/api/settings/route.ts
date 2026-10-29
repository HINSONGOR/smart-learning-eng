import { handle, readBody } from "@/lib/api";
import { getSettings, updateSettings } from "@/services/settingsService";

export async function GET() {
  return handle(() => getSettings());
}

export async function PUT(request: Request) {
  return handle(async () => updateSettings(await readBody(request)));
}
