"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import {
  myForumCourses,
  courseForum,
  writeCourseForum,
} from "@/app/actions/student-learning";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";
export default function ForumPage() {
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]),
    [courseId, setCourse] = useState(""),
    [posts, setPosts] = useState<Awaited<ReturnType<typeof courseForum>>>([]),
    [title, setTitle] = useState(""),
    [content, setContent] = useState(""),
    [replies, setReplies] = useState<Record<string, string>>({}),
    [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        setError("");
        try {
          if (!user) throw new Error("سجل الدخول");
          const c = await myForumCourses(await user.getIdToken());
          setCourses(c);
          setCourse(c[0]?.id || "");
        } catch {
          setError("تعذر تحميل منتدياتك. تحقق من الاتصال وتسجيل الدخول.");
        } finally {
          setLoading(false);
        }
      }),
    [],
  );
  useEffect(() => {
    let active = true;
    setPosts([]);
    if (!courseId) return;
    setLoading(true);
    setError("");
    async function load() {
      try {
        const p = await courseForum(
          courseId,
          await auth.currentUser?.getIdToken(),
        );
        if (active) setPosts(p);
      } catch {
        if (active) setError("تعذر فتح المنتدى. تحقق من اشتراكك والصلاحيات.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [courseId]);
  async function send(postId?: string) {
    setPending(true);
    try {
      await writeCourseForum(
        {
          courseId,
          postId,
          title,
          content: postId ? replies[postId] || "" : content,
        },
        await auth.currentUser?.getIdToken(),
      );
      if (postId) setReplies((r) => ({ ...r, [postId]: "" }));
      else {
        setTitle("");
        setContent("");
      }
      setPosts(
        await courseForum(courseId, await auth.currentUser?.getIdToken()),
      );
      toast.success("تم النشر");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر النشر");
    } finally {
      setPending(false);
    }
  }
  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-3xl bg-gradient-to-l from-blue-800 to-slate-950 p-7 text-white">
        <MessageSquare />
        <h1 className="mt-3 text-3xl font-black">منتديات كورساتي</h1>
        <p className="mt-2">
          مساحة نقاش خاصة بمشتركي كل كورس، للأسئلة والردود.
        </p>
      </header>
      <select
        aria-label="منتدى الكورس"
        className="w-full rounded-xl border bg-white p-3 dark:bg-slate-900"
        value={courseId}
        onChange={(e) => setCourse(e.target.value)}
      >
        <option value="">اختر كورساً</option>
        {courses.map((c) => (
          <option value={c.id} key={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="rounded-xl border border-amber-500 p-4">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">جاري التحميل…</p>
      ) : !courses.length ? (
        <p>المنتديات متاحة بعد تفعيل اشتراكك في كورس.</p>
      ) : (
        courseId &&
        !error && (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="space-y-3 rounded-3xl border p-5"
            >
              <h2 className="font-bold">نقاش جديد</h2>
              <input
                required
                maxLength={200}
                className="w-full rounded-xl border bg-transparent p-3"
                placeholder="عنوان السؤال"
                aria-label="عنوان السؤال"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                required
                maxLength={10000}
                className="w-full rounded-xl border bg-transparent p-3"
                placeholder="اكتب سؤالك"
                aria-label="نص السؤال"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <button
                disabled={pending}
                className="rounded-xl bg-blue-600 px-5 py-2 text-white"
              >
                {pending ? "جاري الحفظ…" : "نشر السؤال"}
              </button>
            </form>
            {!posts.length && (
              <p className="p-6 text-center">ابدأ أول نقاش في الكورس.</p>
            )}
            {posts.map((p) => (
              <article
                key={p.id}
                className="space-y-4 rounded-3xl border bg-white p-6 dark:bg-slate-900"
              >
                <div>
                  <h2 className="text-lg font-bold">{p.title}</h2>
                  <p className="text-xs text-slate-500">
                    {p.author} · {new Date(p.createdAt).toLocaleString("ar-EG")}
                  </p>
                </div>
                <p className="whitespace-pre-wrap break-words">{p.content}</p>
                {p.replies.map((r) => (
                  <div key={r.id} className="rounded-xl bg-blue-500/5 p-4">
                    <strong className="text-sm">{r.author}</strong>
                    <p className="whitespace-pre-wrap break-words">
                      {r.content}
                    </p>
                  </div>
                ))}
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(p.id);
                  }}
                >
                  <input
                    required
                    maxLength={10000}
                    aria-label="اكتب رداً"
                    placeholder="اكتب رداً…"
                    value={replies[p.id] || ""}
                    onChange={(e) =>
                      setReplies((r) => ({ ...r, [p.id]: e.target.value }))
                    }
                    className="min-w-0 flex-1 rounded-xl border bg-transparent p-3"
                  />
                  <button disabled={pending} aria-label="إرسال الرد">
                    <Send />
                  </button>
                </form>
              </article>
            ))}
          </>
        )
      )}
    </div>
  );
}
