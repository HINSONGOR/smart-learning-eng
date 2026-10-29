// 系統固定選項：分類、主題、詞性、難度等。
// UI 及驗證都從這裡讀取，修改時只需改一處。

export const CATEGORY_IDS = ["ielts", "daily", "workplace"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface SkillInfo {
  id: string;
  label: string;
  /** 第一階段已可使用的技能會連到對應頁面；未完成的不提供連結 */
  href?: string;
}

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  labelZh: string;
  description: string;
  topics: string[];
  skills: SkillInfo[];
  /** Tailwind class 必須是完整字串，Tailwind 才能掃描到 */
  color: {
    badge: string;
    border: string;
    accent: string;
    soft: string;
  };
}

export const CATEGORIES: Record<CategoryId, CategoryInfo> = {
  ielts: {
    id: "ielts",
    label: "IELTS English",
    labelZh: "IELTS 英文",
    description: "IELTS 生字、閱讀文章及閱讀題型練習",
    // 只是主題建議，新增生字時可以自行輸入其他主題
    topics: ["Education", "Environment", "Technology", "Health", "Society", "Work", "General"],
    skills: [
      { id: "vocabulary", label: "Vocabulary", href: "/vocabulary?category=ielts" },
      { id: "reading", label: "Reading", href: "/reading-lab" },
      { id: "listening", label: "Listening" },
      { id: "writing", label: "Writing" },
      { id: "speaking", label: "Speaking" },
    ],
    color: {
      badge: "bg-indigo-100 text-indigo-800",
      border: "border-indigo-200",
      accent: "bg-indigo-600",
      soft: "bg-indigo-50",
    },
  },
  daily: {
    id: "daily",
    label: "Daily English",
    labelZh: "日常生活英文",
    description: "購物、餐廳、旅遊、交通及日常對話",
    topics: ["Shopping", "Restaurant", "Travel", "Transportation", "Daily Conversation"],
    skills: [],
    color: {
      badge: "bg-emerald-100 text-emerald-800",
      border: "border-emerald-200",
      accent: "bg-emerald-600",
      soft: "bg-emerald-50",
    },
  },
  workplace: {
    id: "workplace",
    label: "Workplace English",
    labelZh: "職場英文",
    description: "面試、電話、電郵、職場對話及客戶服務",
    topics: [
      "Job Interview",
      "Telephone Conversation",
      "Email Writing",
      "Workplace Conversation",
      "Customer Service",
    ],
    skills: [],
    color: {
      badge: "bg-amber-100 text-amber-800",
      border: "border-amber-200",
      accent: "bg-amber-600",
      soft: "bg-amber-50",
    },
  },
};

export const CATEGORY_LIST = CATEGORY_IDS.map((id) => CATEGORIES[id]);

export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "phrase",
  "phrasal verb",
  "preposition",
  "conjunction",
  "pronoun",
  "other",
] as const;

export const PART_OF_SPEECH_ZH: Record<string, string> = {
  noun: "名詞",
  verb: "動詞",
  adjective: "形容詞",
  adverb: "副詞",
  phrase: "片語",
  "phrasal verb": "片語動詞",
  preposition: "介詞",
  conjunction: "連接詞",
  pronoun: "代名詞",
  other: "其他",
};

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const IELTS_BANDS = [
  "4.0", "4.5", "5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0",
] as const;

export const RESOURCE_TYPES = {
  youtube: "YouTube 影片",
  bbc: "BBC",
  article: "文章",
  podcast: "Podcast",
  other: "其他",
} as const;
export type ResourceType = keyof typeof RESOURCE_TYPES;
export const RESOURCE_TYPE_IDS = Object.keys(RESOURCE_TYPES) as [ResourceType, ...ResourceType[]];

export const EXERCISE_TYPES = {
  "sentence-completion": "Sentence Completion",
  "flow-chart": "Flow-chart Completion",
  "diagram-labelling": "Diagram Labelling",
  matching: "Matching",
  "multiple-choice": "Multiple Choice",
} as const;
export type ExerciseType = keyof typeof EXERCISE_TYPES;
export const EXERCISE_TYPE_IDS = Object.keys(EXERCISE_TYPES) as [ExerciseType, ...ExerciseType[]];

export const EXERCISE_TYPE_ZH: Record<ExerciseType, string> = {
  "sentence-completion": "句子填充",
  "flow-chart": "流程圖填充",
  "diagram-labelling": "圖表標籤",
  matching: "配對",
  "multiple-choice": "多項選擇",
};

export const VOCAB_PRACTICE_MODES = {
  "en-zh": { label: "英文選中文", description: "看英文生字，選出正確中文解釋" },
  "zh-en": { label: "中文選英文", description: "看中文解釋，選出正確英文生字" },
  "fill-blank": { label: "填充題", description: "在例句空格選出正確生字" },
  "sentence-reading": { label: "例句閱讀", description: "閱讀英文例句，選出正確中文翻譯" },
  definition: { label: "English Definition Quiz", description: "看英文生字，選出正確英文解釋" },
  review: { label: "生字重溫", description: "只練習標記為「待重溫」的生字" },
  "wrong-redo": { label: "錯題重做", description: "只練習以前答錯的生字" },
} as const;
export type VocabPracticeMode = keyof typeof VOCAB_PRACTICE_MODES;
export const VOCAB_PRACTICE_MODE_IDS = Object.keys(VOCAB_PRACTICE_MODES) as [
  VocabPracticeMode,
  ...VocabPracticeMode[],
];

export const PRACTICE_KINDS = {
  vocabulary: "生字練習",
  "reading-lab": "Reading Lab",
  dictation: "聽寫 Dictation",
  shadowing: "跟讀 Shadowing",
} as const;
export type PracticeKind = keyof typeof PRACTICE_KINDS;
export const PRACTICE_KIND_IDS = Object.keys(PRACTICE_KINDS) as [PracticeKind, ...PracticeKind[]];

/** 練習選項需要至少 4 個不同答案 */
export const MIN_CHOICES = 4;
