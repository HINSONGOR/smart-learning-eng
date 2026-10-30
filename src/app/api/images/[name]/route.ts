// 提供 Diagram Labelling 的圖片。只容許簡單檔名，不可存取其他資料夾。
// - 本機版：讀取 data/images/
// - 雲端版：讀取 Firestore images/{檔名}（{ contentType, data: base64 }，每張上限約 700 KB）
import { promises as fs } from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import { isAuthEnabled, getSessionLearnerId } from "@/lib/auth";
import { collection } from "@/lib/firestoreCollections";
import { isCloudBackend } from "@/repositories";
import { getDataDir } from "@/repositories/jsonFileStore";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

async function loadImage(name: string): Promise<Uint8Array | null> {
  if (isCloudBackend()) {
    const snapshot = await collection("images").doc(name).get();
    const data = snapshot.data()?.data;
    return typeof data === "string" ? new Uint8Array(Buffer.from(data, "base64")) : null;
  }
  try {
    return new Uint8Array(await fs.readFile(path.join(getDataDir(), "images", name)));
  } catch {
    return null;
  }
}

export async function GET(_request: Request, ctx: RouteContext<"/api/images/[name]">) {
  await connection();
  if (isAuthEnabled() && !(await getSessionLearnerId())) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { name } = await ctx.params;
  const ext = path.extname(name).toLowerCase();
  if (!/^[\w.-]+$/.test(name) || name.startsWith(".") || !TYPES[ext]) {
    return new Response("Invalid file name", { status: 400 });
  }
  const file = await loadImage(name).catch(() => null);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": TYPES[ext],
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "Cache-Control": "private, no-cache",
    },
  });
}
