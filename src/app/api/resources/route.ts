import { handle, queryObject, readBody } from "@/lib/api";
import { createResource, listResources } from "@/services/resourceService";

export async function GET(request: Request) {
  return handle(async () => listResources(queryObject(request)));
}

export async function POST(request: Request) {
  return handle(async () => createResource(await readBody(request)), 201);
}
