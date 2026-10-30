import { defineConfig } from "vitest/config";
import os from "node:os";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "src/test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // 測試永遠使用暫存資料夾，絕不寫入真正的 data/（個別測試會再改用獨立資料夾）
    // 測試一律使用本機 JSON 版本，不連接雲端，也不需要登入
    env: { DATA_DIR: path.join(os.tmpdir(), "smart-english-test-fallback"), DATA_BACKEND: "", AUTH_MODE: "" },
  },
});
