"use client";

// 主要版面：桌面左側欄、手機底部分頁、頂部學習者切換。
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV, NAV_GROUPS } from "@/lib/navigation";
import { useLearner } from "./providers/LearnerProvider";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/vocabulary") return pathname === "/vocabulary" || pathname.startsWith("/vocabulary/new") || /^\/vocabulary\/[^/]+\/edit/.test(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

function LearnerSwitcher() {
  const { learners, learnerId, setLearnerId } = useLearner();
  if (learners.length === 0) return null;
  return (
    <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1" role="radiogroup" aria-label="選擇學習者">
      {learners.map((learner) => (
        <button
          key={learner.id}
          type="button"
          role="radio"
          aria-checked={learner.id === learnerId}
          onClick={() => setLearnerId(learner.id)}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            learner.id === learnerId ? "bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {learner.name}
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { error } = useLearner();

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-3 py-4 lg:block">
        <Link href="/" className="mb-4 block px-2 text-lg font-bold text-teal-700">
          Smart English
          <span className="block text-xs font-normal text-slate-500">免費英文學習系統</span>
        </Link>
        <nav aria-label="主要導航" className="space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title || "home"}>
              {group.title && (
                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.title}</p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                        isActive(pathname, item.href)
                          ? "bg-teal-50 font-medium text-teal-800"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span aria-hidden>{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:justify-end">
          <Link href="/" className="font-bold text-teal-700 lg:hidden">
            Smart English
          </Link>
          <LearnerSwitcher />
        </header>
        {error && (
          <div className="mx-4 mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
            {error}
          </div>
        )}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 lg:pb-10">{children}</main>
      </div>

      <nav
        aria-label="手機導航"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {BOTTOM_NAV.map((item) => {
          const active =
            item.href === "/more"
              ? pathname === "/more"
              : item.href === "/vocabulary"
                ? pathname.startsWith("/vocabulary")
                : item.href === "/practice"
                  ? ["/practice", "/reading-lab", "/dictation", "/shadowing"].some((p) => pathname.startsWith(p))
                  : isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-xs ${active ? "font-semibold text-teal-700" : "text-slate-500"}`}
            >
              <span className="text-lg leading-none" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
