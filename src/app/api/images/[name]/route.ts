// 提供 data/images/ 內的圖表圖片（Diagram Labelling 用）。只容許簡單檔名，不可存取其他資料夾。
import { promises as fs } from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import { getDataDir } from "@/repositories/jsonFileStore";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(_request: Request, ctx: RouteContext<"/api/images/[name]">) {
  await connection();
  const { name } = await ctx.params;
  const ext = path.extname(name).toLowerCase();
  if (!/^[\w.-]+$/.test(name) || name.startsWith(".") || !TYPES[ext]) {
    return new Response("Invalid file name", { status: 400 });
  }
  try {
    const file = await fs.readFile(path.join(getDataDir(), "images", name));
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": TYPES[ext],
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
