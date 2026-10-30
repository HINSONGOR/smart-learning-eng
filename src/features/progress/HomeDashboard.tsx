"use client";

import Link from "next/link";
import { useLearner } from "@/components/providers/LearnerProvider";
import { Badge, Card, ErrorMessage, LinkButton, LoadingState, Notice, StatCard } from "@/components/ui";
import { CATEGORY_LIST, PRACTICE_KINDS } from "@/lib/constants";
import { withQuery } from "@/lib/apiClient";
import { formatDateTime, percent } from "@/lib/text";
import { useApi } from "@/lib/useApi";
import type { HomeStats } from "@/types";

export function HomeDashboard() {
  const { learnerId, learner, ready, settings } = useLearner();
  const { data, error, loading, reload } = useApi<HomeStats>(
    ready ? withQuery("/api/stats", { learnerId }) : null,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {learner ? `${learner.name}，你好！` : "你好！"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">今日想學甚麼？揀一個分類開始，或者先溫習待重溫生字。</p>
      </div>

      <section aria-labelledby="categories" className="grid gap-3 sm:grid-cols-3">
        <h2 id="categories" className="sr-only">
          三大學習分類
        </h2>
        {CATEGORY_LIST.map((category) => {
          const counts = data?.byCategory[category.id];
          return (
            <Link
              key={category.id}
              href={`/categories/${category.id}`}
              className={`group rounded-xl border-2 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${category.color.border}`}
            >
              <div className={`mb-3 h-1.5 w-10 rounded-full ${category.color.accent}`} />
              <p className="text-lg font-bold text-slate-900">{category.label}</p>
              <p className="text-sm text-slate-600">{category.labelZh}</p>
              <p className="mt-2 text-xs text-slate-500">{category.description}</p>
              {counts && (
                <p className="mt-3 text-xs text-slate-600">
                  生字 {counts.vocabulary}・文章 {counts.articles}
                  {category.id === "ielts" && `・閱讀練習 ${counts.exercises}`}
                </p>
              )}
            </Link>
          );
        })}
      </section>

      {loading && <LoadingState text="載入學習統計…" />}
      <ErrorMessage message={error} onRetry={reload} />

      {data && (
        <>
          <section aria-labelledby="stats">
            <h2 id="stats" className="mb-3 font-semibold text-slate-800">
              學習統計
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="已學習生字" value={data.practicedVocabulary} hint={`生字庫共 ${data.totalVocabulary} 個`} />
              <StatCard label="待重溫生字" value={data.reviewCount} hint={`錯題 ${data.wrongListCount} 個`} />
              <StatCard
                label="練習答對率"
                value={data.accuracy === null ? "—" : `${data.accuracy}%`}
                hint={data.totalAnswers ? `${data.correctAnswers} / ${data.totalAnswers} 題` : "未有練習"}
              />
              <StatCard label="已掌握生字" value={data.masteredCount} hint={`收藏 ${data.favoriteCount} 個`} />
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <Card>
              <h2 className="font-semibold text-slate-800">今日溫習</h2>
              {data.reviewCount > 0 ? (
                <p className="mt-1 text-sm text-slate-600">你有 {data.reviewCount} 個待重溫生字。</p>
              ) : (
                <p className="mt-1 text-sm text-slate-600">目前沒有待重溫生字。可以練習新生字或閱讀文章。</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <LinkButton href="/practice/session?mode=review" variant={data.reviewCount ? "primary" : "secondary"}>
                  重溫生字
                </LinkButton>
                <LinkButton href="/vocabulary/cards" variant="secondary">
                  單字卡
                </LinkButton>
                {data.wrongListCount > 0 && (
                  <LinkButton href="/practice/session?mode=wrong-redo" variant="secondary">
                    錯題重做（{data.wrongListCount}）
                  </LinkButton>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">最近練習</h2>
                <Link href="/history" className="text-sm text-teal-700 hover:underline">
                  全部紀錄
                </Link>
              </div>
              {data.recentRecords.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">還沒有練習紀錄。</p>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100">
                  {data.recentRecords.map((r) => (
                    <li key={r.id}>
                      <Link href={`/history/${r.id}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:text-teal-700">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{r.title}</span>
                          <span className="text-xs text-slate-500">
                            {PRACTICE_KINDS[r.kind]}・{formatDateTime(r.date)}
                          </span>
                        </span>
                        <Badge className="shrink-0 bg-slate-100 text-slate-700">
                          {r.scored ? `${percent(r.correct, r.total) ?? 0}%` : `${r.total} 句`}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </>
      )}

      {settings && (
        <Notice tone="info">
          {settings.storage === "cloud" ? (
            <>💾 資料儲存在 Firebase 雲端，但免費方案<strong>沒有自動備份</strong>。請每星期在</>
          ) : (
            <>
              💾 所有資料只儲存在這部電腦的 <code>data</code> 資料夾，<strong>不是雲端備份</strong>。請定期在
            </>
          )}{" "}
          <Link href="/settings#backup" className="font-medium underline">
            設定 → 備份
          </Link>{" "}
          下載備份，存放在電腦或 USB。
        </Notice>
      )}
    </div>
  );
}
