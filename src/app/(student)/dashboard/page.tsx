"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Flame,
  LineChart,
  PlayCircle,
  Sparkles,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardActivityChart } from "@/components/dashboard/activity-chart";
import { useCurrentStudent } from "@/lib/firebase/use-student-auth";
import { loadMyLearning } from "@/lib/firebase/learning-service";
import { Skeleton } from "@/components/ui/skeleton";
export default function DashboardPage() {
  const { student } = useCurrentStudent();
  const [data, setData] = useState<Awaited<
    ReturnType<typeof loadMyLearning>
  > | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    loadMyLearning()
      .then((d) => {
        if (live) setData(d);
      })
      .catch(() => {
        if (live) {
          setData(null);
          setError(
            "تعذر قراءة نشاطك الحقيقي. تحقق من اتصالك وصلاحيات الحساب ثم أعد المحاولة. لم نعرض أرقاماً بديلة.",
          );
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [student.id, retry]);
  const stats = data
    ? [
        {
          label: "كورسات متاحة لحسابك",
          value: data.courses.length,
          icon: BookOpen,
        },
        {
          label: "دروس أكملتها",
          value: data.completedLessons,
          icon: CheckCircle2,
        },
        { label: "امتحانات اجتزتها", value: data.passedExams, icon: Flame },
      ]
    : [];
  return (
    <div className="space-y-7" dir="rtl">
      <section className="relative overflow-hidden rounded-[2rem] theme-inverse bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 px-6 py-9 text-ink sm:p-10">
        <div className="relative z-10 max-w-2xl">
          <p className="flex items-center gap-2 text-sm font-bold text-blue-100">
            <Sparkles className="h-4 w-4" />
            خطوة صغيرة كل يوم… فرق كبير بكرة
          </p>
          <h1 className="mt-4 text-3xl font-black sm:text-4xl">
            أهلاً يا {student.fullName.split(" ")[0]} 👋
          </h1>
          <p className="mt-4 leading-8 text-blue-100">
            كل درس بتكمله بيقربك من هدفك. تابع تقدمك الحقيقي وكمّل رحلتك من هنا.
          </p>
          <Link
            href="/courses"
            className="mt-6 inline-flex items-center gap-2 rounded-xl theme-panel bg-white dark:bg-slate-900 px-5 py-3 font-bold text-blue-700"
          >
            استكشف الكورسات
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full border-[50px] border-white/5" />
      </section>
      {error && (
        <Card>
          <CardContent className="p-6">
            <p role="alert" className="text-red-700 dark:text-red-300">
              {error}
            </p>
            <Button className="mt-4" onClick={() => setRetry((x) => x + 1)}>
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? [0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-3xl" />
            ))
          : stats.map(({ label, value, icon: Icon }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted">{label}</p>
                      <p className="mt-3 text-3xl font-black">{value}</p>
                    </div>
                    <Icon className="h-9 w-9 text-blue-500" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">رصيد محفظتك</p>
              <p className="mt-3 text-2xl font-black">
                {student.walletBalance.toLocaleString("ar-EG")}{" "}
                <span className="text-sm font-normal">ج.م</span>
              </p>
              <Link
                href="/wallet"
                className="mt-2 block text-xs font-bold text-blue-600 dark:text-cyan-300"
              >
                إدارة المحفظة
              </Link>
            </div>
            <Wallet className="h-9 w-9 text-teal-500" />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-blue-500" />
              نشاطك في آخر ٧ أيام
            </CardTitle>
            <p className="text-xs leading-6 text-muted">
              عدد الدروس التي أكّدت إكمالها والامتحانات التي سلّمتها — بتوقيت
              القاهرة، وليس ساعات مشاهدة مقدّرة.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : data ? (
              <DashboardActivityChart data={data.days} />
            ) : (
              <p className="py-12 text-center text-muted">
                لا يمكن عرض الرسم حتى يتم تحميل السجلات.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>مستوى تقدمك العام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <Skeleton className="h-40 rounded-2xl" />
            ) : data ? (
              <>
                <div
                  className="mx-auto grid h-40 w-40 place-items-center rounded-full p-3"
                  style={{
                    background: `conic-gradient(#2563eb ${data.progress * 3.6}deg, var(--chart-grid) 0deg)`,
                  }}
                >
                  <div className="grid h-full w-full place-items-center rounded-full bg-white dark:bg-slate-900">
                    <strong className="text-3xl">{data.progress}%</strong>
                  </div>
                </div>
                <p className="text-center text-sm leading-7 text-muted">
                  {data.completedLessons} من {data.totalLessons} درس مكتمل
                  <br />
                  {data.passedExams} من {data.totalExams} امتحان مجتاز
                </p>
                <p className="text-xs text-muted leading-6">
                  النسبة = الدروس التي أكّدت إكمالها + الامتحانات المجتازة، من
                  إجمالي المحتوى المنشور المتاح لحسابك. الكورسات المجانية
                  مشمولة.
                </p>
                {!data.totalLessons && !data.totalExams && (
                  <p className="text-sm text-center text-muted">
                    لا يوجد محتوى متاح لحسابك حتى الآن.
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted">التقدم غير متاح حالياً.</p>
            )}
          </CardContent>
        </Card>
      </div>
      {data && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">كمّل تعلّمك</h2>
            <Link
              href="/courses"
              className="text-sm font-bold text-blue-600 dark:text-cyan-300"
            >
              كل الكورسات ←
            </Link>
          </div>
          {!data.courses.length ? (
            <Card>
              <CardContent className="p-8 text-center text-muted">
                لسه مفيش كورسات متاحة لحسابك. اختار كورسك الأول من المكتبة.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.courses.slice(0, 6).map((c) => (
                <Card key={c.id}>
                  <CardContent className="space-y-4 p-6">
                    <BookOpen className="h-8 w-8 text-blue-500" />
                    <h3 className="font-black">{c.title}</h3>
                    <Link
                      href={`/course/${c.id}`}
                      className="inline-flex gap-2 text-sm font-bold text-blue-600 dark:text-cyan-300"
                    >
                      <PlayCircle className="h-4 w-4" />
                      دخول الكورس
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
