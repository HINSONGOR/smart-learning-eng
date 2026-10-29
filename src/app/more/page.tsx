// 手機版「更多」：列出所有功能
import Link from "next/link";
import { NAV_GROUPS } from "@/lib/navigation";
import { PageHeader } from "@/components/ui";

export default function MorePage() {
  return (
    <div>
      <PageHeader title="全部功能" />
      <div className="space-y-5">
        {NAV_GROUPS.filter((g) => g.title).map((group) => (
          <section key={group.title}>
            <h2 className="mb-2 text-sm font-semibold text-slate-500">{group.title}</h2>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="flex items-center gap-3 px-4 py-3 text-slate-800 hover:bg-slate-50">
                    <span aria-hidden>{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
