// 匯出 Word 文件（.docx）。使用開源套件 docx 在本機產生，不經任何雲端服務。
import "server-only";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { CATEGORIES, PART_OF_SPEECH_ZH, PRACTICE_KINDS, type PracticeKind } from "@/lib/constants";
import { modeLabel } from "@/lib/labels";
import { formatDateTime, percent } from "@/lib/text";
import type { PracticeRecord, VocabularyView } from "@/types";
import { getRecord, listRecords } from "./recordService";
import { getSettings } from "./settingsService";
import { listVocabulary, type VocabularyFilter } from "./vocabularyService";

const FONT = { ascii: "Calibri", hAnsi: "Calibri", eastAsia: "Microsoft JhengHei" };

const SCOPE_LABEL: Record<VocabularyFilter["scope"], string> = {
  all: "全部生字",
  favorites: "收藏生字",
  review: "待重溫生字",
  wrong: "錯題生字",
  mastered: "已掌握生字",
  learning: "未掌握生字",
};

function text(value: string, options: { bold?: boolean; color?: string; size?: number } = {}) {
  return new TextRun({ text: value, font: FONT, ...options });
}

function para(value: string, options: { bold?: boolean; color?: string; size?: number } = {}) {
  return new Paragraph({ children: [text(value, options)], spacing: { after: 60 } });
}

function cell(children: Paragraph[], header = false) {
  return new TableCell({
    children,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: header ? { type: ShadingType.CLEAR, fill: "E6F4F1", color: "auto" } : undefined,
  });
}

function table(headers: string[], rows: Paragraph[][][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h) => cell([para(h, { bold: true })], true)) }),
      ...rows.map((row) => new TableRow({ children: row.map((c) => cell(c)) })),
    ],
  });
}

function heading(value: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [text(value, { bold: true, size: 32 })], spacing: { after: 120 } });
}

function toDocx(children: Array<Paragraph | Table>) {
  const doc = new Document({
    creator: "Smart English",
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}

async function learnerName(learnerId: string) {
  const settings = await getSettings();
  return settings.learners.find((l) => l.id === learnerId)?.name ?? learnerId;
}

function vocabularyRow(v: VocabularyView): Paragraph[][] {
  return [
    [para(v.word, { bold: true }), para(PART_OF_SPEECH_ZH[v.partOfSpeech] ?? v.partOfSpeech, { color: "666666", size: 18 })],
    [para(v.meaningZh), ...(v.definitionEn ? [para(v.definitionEn, { color: "555555", size: 18 })] : [])],
    [para(v.exampleEn), ...(v.exampleZh ? [para(v.exampleZh, { color: "666666", size: 18 })] : [])],
    [para(`${CATEGORIES[v.category].label}`, { size: 18 }), para(v.topic, { size: 18 }), ...(v.ieltsBand ? [para(`Band ${v.ieltsBand}`, { size: 18 })] : [])],
    [para(`✓ ${v.progress.correctCount}  ✗ ${v.progress.wrongCount}`, { size: 18 })],
  ];
}

export async function exportVocabulary(learnerId: string, filter: unknown) {
  const [items, name] = await Promise.all([listVocabulary(learnerId, filter), learnerName(learnerId)]);
  const f = (filter ?? {}) as Partial<VocabularyFilter>;
  const conditions = [
    SCOPE_LABEL[f.scope ?? "all"] ?? "全部生字",
    f.category ? CATEGORIES[f.category].label : "",
    f.topic ?? "",
    f.level ?? "",
    f.ieltsBand ? `Band ${f.ieltsBand}` : "",
    f.search ? `搜尋「${f.search}」` : "",
  ].filter(Boolean);

  const children: Array<Paragraph | Table> = [
    heading("生字表"),
    para(`學習者：${name}　匯出日期：${formatDateTime(new Date().toISOString())}`, { color: "555555" }),
    para(`範圍：${conditions.join("・")}　共 ${items.length} 個生字`, { color: "555555" }),
  ];
  if (items.length === 0) {
    children.push(para("沒有符合條件的生字。"));
  } else {
    children.push(table(["生字", "中文／英文解釋", "例句", "分類", "紀錄"], items.map(vocabularyRow)));
  }
  return { buffer: await toDocx(children), filename: `生字表-${name}.docx` };
}

function recordSection(record: PracticeRecord): Array<Paragraph | Table> {
  const summary = record.scored
    ? `答對 ${record.correct} / ${record.total} 題（${percent(record.correct, record.total) ?? 0}%）`
    : `跟讀 ${record.total} 句（不計分）`;
  const children: Array<Paragraph | Table> = [
    heading(record.title),
    para(`${modeLabel(record.kind, record.mode)}・${formatDateTime(record.date)}`, { color: "555555" }),
    para(summary, { bold: true }),
  ];
  record.answers.forEach((a, i) => {
    const mark = a.isCorrect === null ? "•" : a.isCorrect ? "✓" : "✗";
    const color = a.isCorrect === null ? "333333" : a.isCorrect ? "1B7F4B" : "B42318";
    children.push(new Paragraph({ children: [text(`${i + 1}. ${mark} ${a.prompt}`, { bold: true, color })], spacing: { before: 160, after: 40 } }));
    if (a.userAnswer) children.push(para(`你的答案：${a.userAnswer}`));
    if (a.isCorrect === false && a.correctAnswer) children.push(para(`正確答案：${a.correctAnswer}`, { color: "1B7F4B" }));
    for (const line of a.explanation.split("\n").filter(Boolean)) children.push(para(line, { color: "555555", size: 20 }));
  });
  return children;
}

export async function exportRecord(learnerId: string, id: string) {
  const record = await getRecord(learnerId, id);
  const name = await learnerName(learnerId);
  const children = [para(`學習者：${name}`, { color: "555555" }), ...recordSection(record)];
  return { buffer: await toDocx(children), filename: `練習紀錄-${name}-${record.date.slice(0, 10)}.docx` };
}

export async function exportRecordList(learnerId: string, kind: PracticeKind | "") {
  const [records, name] = await Promise.all([listRecords(learnerId, kind), learnerName(learnerId)]);
  const children: Array<Paragraph | Table> = [
    heading("練習歷史"),
    para(`學習者：${name}　匯出日期：${formatDateTime(new Date().toISOString())}`, { color: "555555" }),
    para(`類型：${kind ? PRACTICE_KINDS[kind] : "全部"}　共 ${records.length} 次練習`, { color: "555555" }),
  ];
  if (records.length === 0) {
    children.push(para("沒有練習紀錄。"));
  } else {
    children.push(
      table(
        ["練習名稱", "題型", "完成日期", "題數", "正確", "正確率"],
        records.map((r) => [
          [para(r.title)],
          [para(modeLabel(r.kind, r.mode))],
          [para(formatDateTime(r.date))],
          [new Paragraph({ alignment: AlignmentType.RIGHT, children: [text(String(r.total))] })],
          [new Paragraph({ alignment: AlignmentType.RIGHT, children: [text(r.scored ? String(r.correct) : "—")] })],
          [new Paragraph({ alignment: AlignmentType.RIGHT, children: [text(r.scored ? `${percent(r.correct, r.total) ?? 0}%` : "不計分")] })],
        ]),
      ),
    );
  }
  return { buffer: await toDocx(children), filename: `練習歷史-${name}.docx` };
}
