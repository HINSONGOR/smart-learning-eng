// 下載全部資料備份（JSON）
import { handleFile } from "@/lib/api";
import { createBackup } from "@/services/backupService";

export async function GET() {
  return handleFile(() => createBackup());
}
