"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { myExamHistory } from "@/app/actions/student-learning";
import { ClipboardList, RefreshCw } from "lucide-react";
type Row = Awaited<ReturnType<typeof myExamHistory>>[number];
const statuses: Record<string, string> = {
  in_progress: "جارية",
  pending: "بانتظار التصحيح",
  passed: "ناجحة",
  failed: "مكتملة — لم تجتز",
};
export default function MyExams() {
  const [rows, setRows] = useState<Row[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [course, setCourse] = useState(""),
    [status, setStatus] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(await myExamHistory(await auth.currentUser?.getIdToken()));
    } catch {
      setError("تعذر تحميل محاولاتك. أعد المحاولة.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(
    () =>
      onAuthStateChanged(auth, () => {
        void load();
      }),
    [],
  );
  const groups = Object.values(
    rows.reduce<Record<string, Row[]>>((out, r) => {
      (out[r.examId] ||= []).push(r);
      return out;
    }, {}),
  );
  return (
    <div dir="rtl" className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-3xl bg-gradient-to-l from-blue-800 to-slate-950 p-7 text-white">
        <ClipboardList />
        <h1 className="mt-3 text-3xl font-black">امتحاناتي</h1>
        <p className="mt-2">سجل محاولاتك ونتائجك ومتابعة تصحيح إجاباتك.</p>
        <p className="mt-4">
          {rows.length} محاولة · {groups.length} امتحان
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="بحث"
          className="rounded-xl border bg-transparent p-3"
          placeholder="ابحث باسم الامتحان"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="الكورس"
          className="rounded-xl border bg-white p-3 dark:bg-slate-900"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
        >
          <option value="">كل الكورسات</option>
          {Array.from(new Set(rows.map((r) => r.course))).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="الحالة"
          className="rounded-xl border bg-white p-3 dark:bg-slate-900"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">كل الحالات</option>
          {Object.entries(statuses).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
        <button onClick={load} aria-label="تحديث">
          <RefreshCw className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      {loading ? (
        <p role="status">جاري تحميل سجلك…</p>
      ) : error ? (
        <button role="alert" onClick={load}>
          {error}
        </button>
      ) : !groups.length ? (
        <p className="rounded-3xl border border-dashed p-12 text-center">
          لم تبدأ أي امتحان بعد.{" "}
          <Link href="/courses" className="text-blue-500 underline">
            تصفح كورساتك
          </Link>
        </p>
      ) : (
        groups
          .filter(
            (g) =>
              g[0].title.includes(search) &&
              (!course || g[0].course === course) &&
              (!status || g.some((r) => r.status === status)),
          )
          .map((group) => {
            const sorted = [...group].sort((a, b) =>
                b.createdAt.localeCompare(a.createdAt),
              ),
              latest = sorted[0],
              completed = sorted.filter((r) =>
                ["passed", "failed"].includes(r.status),
              ),
              best = completed.length
                ? Math.max(...completed.map((r) => r.percentage))
                : null,
              active = sorted.find((r) => r.status === "in_progress");
            return (
              <article
                key={latest.examId}
                className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-sm text-blue-500">{latest.course}</p>
                <h2 className="mt-2 text-xl font-black">{latest.title}</h2>
                <div className="my-4 flex flex-wrap gap-4 text-sm">
                  <span>
                    المحاولات: {group.length} /{" "}
                    {latest.maxAttempts || "غير محدود"}
                  </span>
                  <span>
                    أفضل نتيجة مكتملة: {best === null ? "—" : `${best}%`}
                  </span>
                  <span>
                    آخر حالة: {statuses[latest.status] || latest.status}
                  </span>
                </div>
                <Link
                  className="inline-block rounded-xl bg-blue-600 px-4 py-2 text-white"
                  href={`/exam/${latest.examId}`}
                >
                  {active ? "استكمال المحاولة" : "فتح الامتحان / محاولة جديدة"}
                </Link>
                <details className="mt-5">
                  <summary className="cursor-pointer font-bold">
                    سجل المحاولات ({group.length})
                  </summary>
                  <ul className="mt-3 divide-y dark:divide-slate-800">
                    {sorted.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <span>
                          {new Date(r.createdAt).toLocaleString("ar-EG")} ·{" "}
                          {statuses[r.status] || r.status}
                        </span>
                        <span>
                          {r.status === "in_progress"
                            ? "لم تسلم"
                            : `${r.score} / ${r.total}${r.status === "pending" ? " (مؤقتة)" : ""}`}
                        </span>
                        <Link
                          className="text-blue-500 underline"
                          href={
                            r.status === "in_progress"
                              ? `/exam/${r.examId}`
                              : `/exam/${r.examId}/result?attempt=${encodeURIComponent(r.id)}`
                          }
                        >
                          {r.status === "in_progress"
                            ? "استكمال"
                            : "عرض النتيجة والشرح"}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </article>
            );
          })
      )}
    </div>
  );
}
