"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLearner } from "@/components/providers/LearnerProvider";
import { Badge, Card, EmptyState, ErrorMessage, LinkButton, LoadingState, PageHeader } from "@/components/ui";
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from "@/lib/constants";
import { withQuery } from "@/lib/apiClient";
import { useApi } from "@/lib/useApi";
import type { ArticleView, VocabularyView } from "@/types";

export function CategoryOverview() {
  const params = useParams<{ category: string }>();
  const id = params.category as CategoryId;
  const { learnerId, ready } = useLearner();
  const valid = (CATEGORY_IDS as readonly string[]).includes(id);
  const vocab = useApi<VocabularyView[]>(ready && valid ? withQuery("/api/vocabulary", { learnerId, category: id }) : null);
  const articles = useApi<ArticleView[]>(ready && valid ? withQuery("/api/articles", { learnerId }) : null);

  if (!valid) {
    return <EmptyState title="找不到這個分類" action={<LinkButton href="/">返回首頁</LinkButton>} />;
  }
  const category = CATEGORIES[id];
  const words = vocab.data ?? [];
  const categoryArticles = (articles.data ?? []).filter((a) => a.category === id);
  const topics = [...new Set([...category.topics, ...words.map((w) => w.topic)])];
  const isIelts = id === "ielts";

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <span className={`inline-block h-6 w-1.5 rounded-full ${category.color.accent}`} />
            {category.label}
          </span>
        }
        subtitle={`${category.labelZh}・${category.description}`}
        actions={
          <>
            <LinkButton href={`/practice/session?mode=en-zh&category=${id}`}>開始生字練習</LinkButton>
            <LinkButton href={`/vocabulary/cards?category=${id}`} variant="secondary">
              單字卡
            </LinkButton>
          </>
        }
      />

      {isIelts && (
        <section>
          <h2 className="mb-3 font-semibold text-slate-800">IELTS 技能</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {category.skills.map((skill) =>
              skill.href ? (
                <Link
                  key={skill.id}
                  href={skill.href}
                  className="rounded-xl border border-indigo-200 bg-white p-3 text-center shadow-sm hover:bg-indigo-50"
                >
                  <p className="font-medium text-slate-900">{skill.label}</p>
                  <p className="text-xs text-teal-700">可以使用</p>
                </Link>
              ) : (
                <div key={skill.id} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center" aria-disabled>
                  <p className="font-medium text-slate-500">{skill.label}</p>
                  <p className="text-xs text-slate-400">尚未推出（第二階段）</p>
                </div>
              ),
            )}
          </div>
        </section>
      )}

      {(vocab.loading || articles.loading) && <LoadingState />}
      <ErrorMessage message={vocab.error || articles.error} onRetry={() => { vocab.reload(); articles.reload(); }} />

      {vocab.data && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">主題及生字（{words.length}）</h2>
            <Link href={`/vocabulary?category=${id}`} className="text-sm text-teal-700 hover:underline">
              管理生字
            </Link>
          </div>
          {words.length === 0 ? (
            <EmptyState
              title={isIelts ? "尚未加入 IELTS 生字" : "這個分類還沒有生字"}
              description={
                isIelts
                  ? "IELTS 內容會由你日後提供的教材整理加入。你亦可以先在生字庫自行新增生字。"
                  : "可以在生字庫新增生字。"
              }
              action={<LinkButton href={`/vocabulary/new?category=${id}`}>新增生字</LinkButton>}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => {
                const count = words.filter((w) => w.topic === topic).length;
                return (
                  <Link
                    key={topic}
                    href={`/vocabulary?category=${id}&topic=${encodeURIComponent(topic)}`}
                    className={`flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm hover:shadow-sm ${category.color.border}`}
                  >
                    <span className="font-medium text-slate-800">{topic}</span>
                    <Badge className={count ? category.color.badge : "bg-slate-100 text-slate-500"}>{count} 個生字</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {articles.data && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">文章（{categoryArticles.length}）</h2>
            <Link href="/articles" className="text-sm text-teal-700 hover:underline">
              文章庫
            </Link>
          </div>
          {categoryArticles.length === 0 ? (
            <EmptyState
              title={isIelts ? "尚未加入 IELTS 文章" : "這個分類還沒有文章"}
              description="文章會由你日後提供的教材整理加入。"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {categoryArticles.map((a) => (
                <Card key={a.id}>
                  <Link href={`/articles/${a.id}`} className="font-medium text-slate-900 hover:text-teal-700">
                    {a.title}
                  </Link>
                  {a.titleZh && <p className="text-sm text-slate-600">{a.titleZh}</p>}
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
