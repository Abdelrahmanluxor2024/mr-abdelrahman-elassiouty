# منصة مستر عبدالرحمن الأسيوطي — البرمجة لطلاب الثانوية

> منصة تعليمية عربية RTL سريعة وخفيفة، مبنية على Next.js 14 + Supabase.

## ⚙️ Tech Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn-style components
- **State**: React Query (TanStack) + Zustand-ready
- **Animations**: Framer Motion (light usage)
- **Backend**: Supabase (Auth + Postgres + Storage + Realtime)
- **Charts**: Recharts (Radar Chart لنتائج الامتحانات)
- **Auth strategy**: رقم هاتف + باسورد، يتم تخزينهم في `students` مع `bcrypt`، وعمل Supabase Auth user مربوط بـ `phone@mrass.app` للـ RLS
- **Video**: HTML5 + Bunny.net/VdoCipher iframe embed + Watermark ديناميكي + منع تظليل/تنزيل

## 🚀 خطوات التشغيل

### 1) Supabase — إنشاء الجداول
1. ادخل على https://tkrygfflhrvgveiolhsl.supabase.co
2. من القائمة اختار **SQL Editor → New query**
3. انسخ محتوى ملف `db/schema.sql` كله وشغّله مرة واحدة
4. تأكد من ظهور الجداول في **Table Editor** (16 جدول)
5. **RLS Policies** هتظهر تلقائياً على الجداول الحساسة (students, enrollments, attempts, answers, transactions, notifications)
6. الـ function `redeem_charge_code` متاحة كـ RPC (بتحقق atomic للـ redemption)

### 2) متغيرات البيئة
- `.env.local` موجود بالفعل ومجهز بمفاتيحك
- `SUPABASE_SERVICE_ROLE_KEY` لازم تجيبه من Supabase Dashboard → Settings → API → service_role (سرّي، لا تشاركه)

### 3) تثبيت الحزم وتشغيل المشروع
```bash
cd C:\Users\Elturky\Desktop\mr-ass
npm install
npm run dev
```
- افتح http://localhost:3000

### 4) إنشاء أول أدمن
من Supabase Dashboard → Authentication → Users → **Add user** (Email + Password)
- بعد الإنشاء، روح لـ SQL Editor وشغّل:
```sql
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"')
WHERE email = 'admin@mrass.app';
```
- سجّل دخول من `/login` بـ email بدل رقم (الميدل وير بتسمح للأدمن من غير phone validation)

## 🗂️ هيكل المشروع (Modular)

```
src/
├── app/
│   ├── (auth)              # login, register
│   ├── (student)           # كل صفحات الطالب بعد تسجيل الدخول
│   │   ├── dashboard
│   │   ├── courses, my-courses
│   │   ├── course/[id], lesson/[id]
│   │   ├── exam/[id], exam/[id]/result
│   │   ├── wallet, forum, live, profile, notifications
│   ├── (admin)             # protected by middleware (role=admin)
│   ├── admin/              # admin panel
│   ├── actions/            # server actions: auth, exams, wallet, admin
│   ├── auth/finish         # server route: action_link → session cookies
│   ├── layout.tsx, page.tsx (Hero), providers.tsx, globals.css
├── components/
│   ├── ui/                 # Button, Card, Input, Label, Badge, Tabs, Skeleton, Toaster…
│   ├── layout/             # Sidebar, Navbar, StudentShell, AdminShell
│   ├── course/             # SecureVideoPlayer (watermark + right-click block)
│   └── student/            # InstructorAvatar (rounded + glow variants)
├── lib/
│   ├── supabase/           # client.ts, server.ts, middleware.ts, admin.ts
│   ├── queries/            # useStudent.ts, useCourses.ts, useExams.ts, useWallet.ts, useForum.ts
│   ├── utils.ts            # cn, formatArabicNumber, phoneToEmail, isEgyptianPhone
│   └── device.ts           # device fingerprint
├── types/
│   ├── supabase.ts         # types لكل جدول
│   └── domain.ts           # exam result, branch score
└── db/
    └── schema.sql          # كل الجداول + RLS + seed للـ demo
```

## 🎨 Brand Identity
- ألوان: Deep Blue `#0A1F44` → Royal `#1E40AF` → Bright `#2563EB` → Sky `#3B82F6` → Light Glow `#60A5FA`
- خطوط: Cairo (عربي) + Inter (لاتيني) عبر `next/font/google` (preload + font-display: swap)
- الشعار: مربع بزاوية مدورة مع `</>` وتحته الاسم

## 🔐 Security
- Auth: bcrypt + Supabase magic link round-trip (الهاتف = الإيميل)
- Device Lock: max جهازين مسجلين
- Video: HTML5 مع تعطيل context menu و dragstart و download، + watermark ديناميكي 3×3 باسم الطالب ورقمه
- Anti-cheat في الامتحانات: تعطيل copy/right-click، تحذير لو الطالب خرج من الـ tab
- Server-side grading: `correct_answer` ما يروحش للـ client قبل تسليم الامتحان

## ⚡ Performance
- Next.js 14 App Router + Server Components
- React Query (staleTime = 5 min) → تقليل إعادة الجلب
- `next/image` مع WebP/AVIF
- Tailwind + dynamic imports
- RSC + Suspense

## 📝 ملاحظات
- **Fawry Pay**: حط الـ `FAWRY_MERCHANT_ID` و `FAWRY_SECRET_KEY` في `.env.local`، الـ checkout flow متاح في `/wallet` (sandbox)
- **Real-time**: لو حابب تستخدم Supabase Realtime للإشعارات، أضف Channel في الـ Navbar
- **Video Provider**: استبدل `src` في `SecureVideoPlayer` بـ Bunny.net أو VdoCipher iframe URL — خلي `embed={true}`
- **Dark Mode**: متاح من `next-themes` لو حبيت تضيفه

## 🎓 الـ Demo Lesson
- `/courses` → كورس **أساسيات البرمجة** (مجاني)
- `/course/11111111-1111-1111-1111-111111111111` → صفحة الكورس
- `/lesson/22222222-2222-2222-2222-222222222222` → المحاضرة (بدون فيديو)
- `/exam/33333333-3333-3333-3333-333333333333` → 10 أسئلة MCQ
- النتيجة تُحفظ في `exam_attempts` وتظهر في `/profile`

## 🛣️ Roadmap (تم)
- ✅ Phase 1: Auth + Layout + Hero
- ✅ Phase 2: Dashboard + Courses + My Courses + Lesson player
- ✅ Phase 3: Exams (MCQ + Essay) + Result + Radar Chart
- ✅ Phase 4: Wallet (Code + Fawry)
- ✅ Phase 5: Admin Panel (Students, Courses, Exams, Grading, Charge Codes)
- ✅ Phase 6: Profile, Forum, Live, Notifications, Error/Loading/404

بالتوفيق يا مستر عبدالرحمن! 🚀
