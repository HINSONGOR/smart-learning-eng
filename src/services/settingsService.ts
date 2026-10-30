import "server-only";
import { z } from "zod";
import { isCloudBackend, settingsRepository } from "@/repositories";
import { learnerSchema, type Settings } from "@/lib/schemas";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { isAuthEnabled, requireSession } from "@/lib/auth";
import { parseInput } from "@/lib/validation";
import { isGeminiConfigured } from "./geminiService";

export interface PublicSettings extends Settings {
  geminiConfigured: boolean;
  storage: "local" | "cloud";
}

export async function getSettings(): Promise<PublicSettings> {
  const settings = await settingsRepository.read();
  return {
    ...settings,
    geminiConfigured: isGeminiConfigured(),
    storage: isCloudBackend() ? "cloud" : "local",
  };
}

/**
 * 確認學習者存在，避免寫入無效的 learnerId。
 * 雲端版只容許存取「目前登入者」自己的資料。
 */
export async function assertLearner(learnerId: unknown): Promise<string> {
  if (isAuthEnabled()) {
    const sessionLearnerId = await requireSession();
    if (learnerId !== sessionLearnerId) throw new ForbiddenError("只可以存取自己的學習紀錄");
    return sessionLearnerId;
  }
  const settings = await settingsRepository.read();
  if (typeof learnerId !== "string" || !settings.learners.some((l) => l.id === learnerId)) {
    throw new NotFoundError("找不到這位學習者，請重新選擇學習者");
  }
  return learnerId;
}

const settingsUpdateSchema = z.object({
  learners: z.array(learnerSchema).optional(),
  gemini: z.object({ includeSentence: z.boolean() }).optional(),
});

export async function updateSettings(input: unknown): Promise<PublicSettings> {
  const patch = parseInput(settingsUpdateSchema, input);
  await settingsRepository.update((current) => {
    const next: Settings = { ...current };
    if (patch.learners) {
      // 只容許修改現有學習者的名稱，不可新增或刪除（避免紀錄失去對應）
      next.learners = current.learners.map((learner) => {
        const updated = patch.learners?.find((l) => l.id === learner.id);
        return updated ? { ...learner, name: updated.name } : learner;
      });
    }
    if (patch.gemini) next.gemini = { ...current.gemini, ...patch.gemini };
    return { data: next, result: undefined };
  });
  return getSettings();
}
