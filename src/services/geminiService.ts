// 可選的 Gemini 查字功能。
// - 只有在 .env.local 設定了 GEMINI_API_KEY 才會使用。
// - API key 只在伺服器端使用，不會傳到瀏覽器。
// - 每次只傳送選取的字詞，以及（如設定容許）該句原句。
import "server-only";
import { z } from "zod";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const TIMEOUT_MS = 20_000;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

const geminiAnswerSchema = z.object({
  partOfSpeech: z.string().default(""),
  meaningZh: z.string().min(1),
  definitionEn: z.string().default(""),
  sentenceZh: z.string().default(""),
});
export type GeminiAnswer = z.infer<typeof geminiAnswerSchema>;

export class GeminiError extends Error {}

export function buildPrompt(text: string, sentence: string): string {
  const lines = [
    "You are an English-Chinese dictionary for a learner in Hong Kong.",
    "Reply in JSON only with these keys:",
    '- "partOfSpeech": one of noun, verb, adjective, adverb, phrase, phrasal verb, preposition, conjunction, pronoun, other',
    '- "meaningZh": a short meaning in Traditional Chinese (繁體中文), matching the sentence context if given',
    '- "definitionEn": a short, simple English definition',
    '- "sentenceZh": a natural Traditional Chinese translation of the sentence, or "" if no sentence is given',
    "",
    `Word or phrase: ${text}`,
  ];
  if (sentence) lines.push(`Sentence: ${sentence}`);
  return lines.join("\n");
}

/** 解析 Gemini 回應中的 JSON（容許包含 ```json 包裝） */
export function parseGeminiText(raw: string): GeminiAnswer {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    throw new GeminiError("Gemini 回應格式不正確");
  }
  const parsed = geminiAnswerSchema.safeParse(json);
  if (!parsed.success) throw new GeminiError("Gemini 回應缺少中文解釋");
  return parsed.data;
}

export async function geminiLookup(text: string, sentence: string): Promise<GeminiAnswer> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new GeminiError("未設定 Gemini API key");
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildPrompt(text, sentence) }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch {
    throw new GeminiError("無法連線至 Gemini（請檢查網絡）");
  }

  if (response.status === 429) throw new GeminiError("Gemini 免費額度暫時用完，請稍後再試");
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new GeminiError("Gemini API key 無效或沒有權限，請檢查 .env.local 設定");
  }
  if (response.status === 404) throw new GeminiError(`找不到 Gemini 模型「${model}」，請檢查 GEMINI_MODEL 設定`);
  if (!response.ok) throw new GeminiError(`Gemini 服務錯誤（${response.status}）`);

  const body = (await response.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  } | null;
  const raw = body?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!raw) throw new GeminiError("Gemini 沒有回傳結果");
  return parseGeminiText(raw);
}
