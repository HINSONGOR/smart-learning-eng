// 登入狀態：是否需要登入、目前登入者、學習者名稱（登入頁用，不包含電郵）
import { getSessionLearnerId, isAuthEnabled, learnerAccounts } from "@/lib/auth";
import { handle } from "@/lib/api";
import { settingsRepository } from "@/repositories";

export async function GET() {
  return handle(
    async () => {
      const authEnabled = isAuthEnabled();
      const settings = await settingsRepository.read();
      const accounts = learnerAccounts();
      return {
        authEnabled,
        learnerId: authEnabled ? await getSessionLearnerId() : null,
        learners: settings.learners
          .filter((l) => !authEnabled || accounts.has(l.id))
          .map(({ id, name }) => ({ id, name })),
      };
    },
    200,
    { public: true },
  );
}
