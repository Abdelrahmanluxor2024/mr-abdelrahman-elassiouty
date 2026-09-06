import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BookOpen, Clock, Code, GraduationCap, MessageCircle, Moon, Sparkles, Star, Sun, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { WhatsAppButton } from '@/components/common/whatsapp-button';
import { PlatformGroupFeed } from '@/components/community/platform-group-feed';
import { createClient } from '@/lib/supabase/server';
import { formatCurrencyEGP } from '@/lib/utils';

export default async function HomePage() {
  const supabase = createClient();
  const { data: dbCourses } = await supabase
    .from('courses')
    .select('id, title, description, price, is_free, duration_hours, lessons_count, thumbnail_url, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  const courses = dbCourses && dbCourses.length > 0 ? dbCourses : [];
  return (
    <div className="min-h-screen bg-[#070B14] text-white selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* ── Top Floating Header ────────────────────────────────────────────── */}
      <header className="fixed top-4 inset-x-0 z-50 mx-auto max-w-6xl px-4">
        <nav className="flex items-center justify-between rounded-full border border-blue-500/20 bg-[#0B1324]/85 px-4 py-2 shadow-2xl backdrop-blur-xl sm:px-6">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-12 w-16 shrink-0">
              <Image
                src="/images/logo.png"
                alt="شعار مستر عبدالرحمن الأسيوطي"
                fill
                className="object-contain drop-shadow-md group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="hidden sm:block">
              <span className="block font-display text-sm font-black tracking-wide text-white group-hover:text-cyan-300 transition-colors">
                مستر عبدالرحمن الأسيوطي
              </span>
              <span className="block text-[11px] text-cyan-400 font-semibold">
                البرمجة والذكاء الاصطناعي
              </span>
            </div>
          </Link>

          {/* Theme Toggle & Auth Buttons */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Login */}
            <Link
              href="/login"
              className="rounded-full border border-blue-400/30 bg-white/5 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-blue-600/20 sm:px-5 sm:py-2 sm:text-sm"
            >
              تسجيل الدخول
            </Link>

            {/* Register */}
            <Link
              href="/register"
              className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-600/40 transition hover:from-blue-500 hover:to-cyan-500 sm:px-5 sm:py-2 sm:text-sm"
            >
              حساب جديد
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-24">
        {/* Background glow meshes in Electric Blue */}
        <div className="pointer-events-none absolute -top-40 right-1/4 -z-10 h-[550px] w-[550px] rounded-full bg-blue-600/25 blur-[140px]" />
        <div className="pointer-events-none absolute top-1/3 left-10 -z-10 h-[450px] w-[450px] rounded-full bg-cyan-600/20 blur-[140px]" />

        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            {/* Left: Text Content (Right on RTL) */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-right">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-200 backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                منصة مستر عبدالرحمن الأسيوطي — للبرمجة والذكاء الاصطناعي
              </div>

              {/* Main Headline */}
              <h1 className="font-display text-4xl font-black leading-[1.2] tracking-tight sm:text-5xl lg:text-6xl text-white">
                هتكتب كود بإيدك
                <br />
                <span className="bg-gradient-to-l from-cyan-400 via-blue-400 to-white bg-clip-text text-transparent">
                  من أول حصة
                </span>
              </h1>

              {/* Sub-paragraph */}
              <p className="mx-auto max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg lg:mx-0">
                هتبدأ من الصفر وتفهم الفكرة قبل ما تحفظها، وتتدرب بتمارين عملية ومشاريع حقيقية لحد ما توصل لمشروع كامل بإيدك.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2 lg:justify-start">
                <Link
                  href="/register"
                  className="rounded-2xl bg-white px-8 py-3.5 text-base font-black text-slate-900 shadow-xl shadow-white/10 transition hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98]"
                >
                  ابدأ من الصفر
                </Link>

                <Link
                  href="/courses"
                  className="rounded-2xl border border-blue-500/30 bg-[#0F1B38]/80 px-8 py-3.5 text-base font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-blue-900/60 hover:border-blue-400"
                >
                  شوف الكورسات
                </Link>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-4 sm:gap-4">
                {[
                  { value: '10,000+', label: 'طالب فهموا البرمجة' },
                  { value: '4.9/5', label: 'متوسط تقييم الطلبة' },
                  { value: '120+', label: 'ساعة شرح وتطبيق' },
                  { value: '20+', label: 'مشروع عملي بتعمله' },
                ].map((st) => (
                  <div
                    key={st.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-center backdrop-blur-md transition hover:border-purple-500/30 hover:bg-white/[0.06]"
                  >
                    <p className="font-display text-2xl font-black text-white sm:text-3xl">
                      {st.value}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-slate-400 sm:text-xs">
                      {st.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Official 3D Emblem Logo */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[460px]">
                {/* Glow ring behind logo */}
                <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-tr from-blue-600/40 via-cyan-500/30 to-blue-500/20 blur-3xl animate-pulse" />
                <div className="overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-b from-blue-950/40 via-[#070B14]/80 to-[#070B14] p-6 shadow-2xl backdrop-blur-md flex items-center justify-center">
                  <Image
                    src="/images/logo.png"
                    alt="شعار مستر عبدالرحمن الأسيوطي"
                    width={800}
                    height={800}
                    priority
                    className="h-auto w-full object-contain drop-shadow-[0_10px_30px_rgba(37,99,235,0.4)] hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Courses Section (كورساتنا المميزة) ────────────────────── */}
      <section className="relative bg-[#070B14] py-16 text-white lg:py-24 border-t border-blue-500/10">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end mb-12">
            <div>
              <div className="inline-block rounded-full bg-blue-500/10 border border-blue-500/30 px-4 py-1 text-xs font-bold text-cyan-300 mb-3">
                كل الكورسات
              </div>
              <h2 className="font-display text-3xl font-black text-white sm:text-4xl">
                كورساتنا المميزة
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
                اختار الكورس المناسب لصفك وابدأ على طول - كل كورس فيه شرح وتمارين عملية ومتابعة مستمرة.
              </p>
            </div>

            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
            >
              عرض الكل
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          {/* Courses Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {courses.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400">
                <BookOpen className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <p className="font-bold text-base">لا توجد كورسات منشورة حالياً</p>
                <p className="text-xs text-slate-500 mt-1">تابعنا، سيتم نشر كورسات جديدة قريباً جداً!</p>
              </div>
            ) : (
              courses.map((c: any) => (
                <div
                  key={c.id}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-blue-500/20 bg-[#0B1324] shadow-xl transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-blue-500/20"
                >
                  {/* Course Banner */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                    <Image
                      src={c.thumbnail_url || "/images/course-foundation-languages.jpg"}
                      alt={c.title}
                      fill
                      className="object-cover opacity-90 transition duration-500 group-hover:scale-105"
                    />
                    {/* Tag */}
                    <span className="absolute top-3 right-3 rounded-xl bg-blue-600/90 px-3 py-1 text-xs font-bold text-white shadow backdrop-blur-sm">
                      {c.is_free ? 'مجاني' : 'مدفوع'}
                    </span>
                    {/* Price */}
                    <span className="absolute bottom-3 right-3 rounded-xl bg-black/70 px-3 py-1 font-display text-sm font-black text-cyan-400 backdrop-blur-md border border-white/10">
                      {c.is_free ? 'مجاناً' : formatCurrencyEGP(c.price)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                    <div>
                      <h3 className="font-bold text-white line-clamp-2 text-sm leading-snug">
                        {c.title}
                      </h3>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-blue-500/10 pt-3">
                        <span>الدفعة ٢٠٢٦ / ٢٠٢٧</span>
                        <span className="text-cyan-400 font-semibold">{c.lessons_count || 0} محاضرة</span>
                      </div>
                    </div>

                    <Link
                      href={`/course/${c.id}`}
                      className="block w-full rounded-2xl bg-blue-600/20 border border-blue-500/40 py-2.5 text-center text-xs font-bold text-cyan-300 transition hover:bg-blue-600 hover:text-white"
                    >
                      الدخول للكورس
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── Platform Group Community Section (جروب المنصة) ───────────────── */}
      <section className="relative bg-[#050811] py-16 text-white border-t border-blue-500/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <PlatformGroupFeed />
        </div>
      </section>

      {/* ── Floating WhatsApp Button Component ───────────────────────────── */}
      <WhatsAppButton />
    </div>
  );
}
