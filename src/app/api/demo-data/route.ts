// 示範資料：查詢數量，以及刪除所有標示為示範的生字及資源（不影響使用者自己加入的資料）。
import { handle } from "@/lib/api";
import { countDemoData, removeDemoData } from "@/services/vocabularyService";

export async function GET() {
  return handle(() => countDemoData());
}

export async function DELETE() {
  return handle(() => removeDemoData());
}
