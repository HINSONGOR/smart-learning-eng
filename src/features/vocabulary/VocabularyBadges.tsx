import { Badge } from "@/components/ui";
import { CATEGORIES, PART_OF_SPEECH_ZH } from "@/lib/constants";
import type { Vocabulary } from "@/types";

export function VocabularyBadges({ item }: { item: Vocabulary }) {
  const category = CATEGORIES[item.category];
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge className={category.color.badge}>{category.label}</Badge>
      <Badge>{item.topic}</Badge>
      <Badge>{PART_OF_SPEECH_ZH[item.partOfSpeech] ?? item.partOfSpeech}</Badge>
      {item.level && <Badge className="bg-sky-100 text-sky-800">{item.level}</Badge>}
      {item.ieltsBand && <Badge className="bg-indigo-100 text-indigo-800">Band {item.ieltsBand}</Badge>}
      {item.isDemo && <Badge className="bg-amber-100 text-amber-800">示範資料</Badge>}
    </div>
  );
}
