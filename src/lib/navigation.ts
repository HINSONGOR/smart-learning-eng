// 導航項目（桌面側欄及手機「更多」頁共用）

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "",
    items: [{ href: "/", label: "首頁 Home", icon: "🏠" }],
  },
  {
    title: "學習分類",
    items: [
      { href: "/categories/ielts", label: "IELTS English", icon: "🎓" },
      { href: "/categories/daily", label: "Daily English", icon: "☕" },
      { href: "/categories/workplace", label: "Workplace English", icon: "💼" },
    ],
  },
  {
    title: "生字",
    items: [
      { href: "/vocabulary", label: "生字庫 Vocabulary", icon: "📚" },
      { href: "/vocabulary/cards", label: "單字卡 Flashcards", icon: "🃏" },
    ],
  },
  {
    title: "練習",
    items: [
      { href: "/practice", label: "練習中心", icon: "✏️" },
      { href: "/reading-lab", label: "Reading Practice Lab", icon: "📝" },
      { href: "/dictation", label: "聽寫 Dictation", icon: "🎧" },
      { href: "/shadowing", label: "跟讀 Shadowing", icon: "🎙️" },
    ],
  },
  {
    title: "內容",
    items: [
      { href: "/articles", label: "文章庫 Article Library", icon: "📖" },
      { href: "/resources", label: "資源庫 YouTube / BBC", icon: "🔗" },
    ],
  },
  {
    title: "紀錄及設定",
    items: [
      { href: "/history", label: "練習歷史 History", icon: "📊" },
      { href: "/settings", label: "設定 Settings", icon: "⚙️" },
    ],
  },
];

export const BOTTOM_NAV: NavItem[] = [
  { href: "/", label: "首頁", icon: "🏠" },
  { href: "/vocabulary", label: "生字", icon: "📚" },
  { href: "/practice", label: "練習", icon: "✏️" },
  { href: "/articles", label: "文章", icon: "📖" },
  { href: "/more", label: "更多", icon: "☰" },
];
