// 下載全部資料作備份（本機版及雲端版都適用）。
// 雲端免費方案沒有自動備份，請定期下載保存。
import "server-only";
import {
  articleRepository,
  exerciseRepository,
  progressRepository,
  recordRepository,
  resourceRepository,
  settingsRepository,
  vocabularyRepository,
} from "@/repositories";

export const BACKUP_FORMAT = "smart-english-backup-v1";

export async function createBackup() {
  const [vocabulary, articles, exercises, resources, settings, progress, records] = await Promise.all([
    vocabularyRepository.list(),
    articleRepository.list(),
    exerciseRepository.list(),
    resourceRepository.list(),
    settingsRepository.read(),
    progressRepository.read(),
    recordRepository.listAll(),
  ]);
  const backup = {
    format: BACKUP_FORMAT,
    createdAt: new Date().toISOString(),
    data: {
      vocabulary,
      articles,
      "reading-exercises": exercises,
      "learning-resources": resources,
      settings,
      "learner-progress": progress,
      "practice-records": records,
    },
  };
  const date = backup.createdAt.slice(0, 10);
  return {
    buffer: Buffer.from(JSON.stringify(backup, null, 2), "utf8"),
    filename: `smart-english-backup-${date}.json`,
    contentType: "application/json",
  };
}
