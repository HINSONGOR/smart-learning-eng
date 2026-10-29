# 教材 JSON 格式（日後加入老師筆記用）

IELTS 文章及 Reading Lab 題目由使用者提供教材後整理加入。以下是系統接受的格式。資料寫入 `data/` 前會經系統驗證，格式不正確時會清楚報錯，不會自動覆蓋。

> 下面例子中的英文全部是**格式示範用的佔位文字**，不是教材內容。

## 文章 `data/articles.json`

```json
[
  {
    "id": "article-001",
    "title": "Article title in English",
    "titleZh": "中文標題（選填）",
    "summaryZh": "文章中文解釋或重點（選填）",
    "category": "ielts",
    "topic": "Environment",
    "level": "B2",
    "ieltsBand": "6.5",
    "source": "老師筆記",
    "createdAt": "2026-11-01T00:00:00.000Z",
    "paragraphs": [
      { "sentences": [ { "en": "First sentence.", "zh": "第一句中文翻譯（選填）" } ] }
    ],
    "glossary": [
      { "word": "example", "partOfSpeech": "noun", "meaningZh": "例子", "definitionEn": "選填", "exampleEn": "選填", "exampleZh": "選填" }
    ]
  }
]
```

- `category`：`ielts`、`daily` 或 `workplace`
- `level`：`A1`–`C2` 或 `""`；`ieltsBand`：`4.0`–`9.0`（以 0.5 為單位）或 `""`
- `glossary` 是老師的生字表；選字查詢會優先使用它

## Reading Lab 題目 `data/reading-exercises.json`

所有題型共用的欄位：

```json
{
  "id": "exercise-001",
  "title": "Exercise title",
  "type": "sentence-completion",
  "category": "ielts",
  "ieltsBand": "6.0",
  "instructions": "Complete the sentences. Write NO MORE THAN TWO WORDS.",
  "passage": { "title": "Passage title", "paragraphs": ["Paragraph 1", "Paragraph 2"] },
  "source": "老師筆記",
  "createdAt": "2026-11-01T00:00:00.000Z",
  "questions": [
    { "id": "q1", "number": 1, "prompt": "Text with a ___ blank.", "answers": ["answer", "another accepted answer"], "explanation": "簡單解釋" }
  ]
}
```

| 題型 `type` | 額外欄位 | `answers` 填寫 |
|---|---|---|
| `sentence-completion` | 無；`prompt` 用 `___` 表示空格 | 可接受的答案文字（忽略大小寫及標點） |
| `flow-chart` | `flowSteps: [{ "text": "Step with ___", "questionId": "q1" }, { "text": "Step without blank" }]` | 答案文字 |
| `diagram-labelling` | `diagram: { "image": "pic.png", "labels": [{ "questionId": "q1", "x": 30, "y": 40 }] }`；圖片放在 `data/images/`，x／y 是百分比位置 | 答案文字 |
| `matching` | `matchingOptions: [{ "key": "A", "text": "..." }]` | 選項代號，例如 `["C"]` |
| `multiple-choice` | 每題加 `options: [{ "key": "A", "text": "..." }]` | 選項代號，例如 `["B"]` |
