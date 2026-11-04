# تحديث الباقة المدفوعة والدفع — نوفمبر 2026

## المطلوب بعد النشر (خطوة فعلية على قاعدة Firebase)
**لم تُحذف أو تُنشأ بيانات إنتاج من بيئة البرمجة؛ اتصال Firebase محجوب هنا.**
ادخل بحساب الأدمن إلى `/admin/courses` واضغط **حذف الكورسات واستبدالها بالباقة الجديدة** ثم اكتب `حذف كل الكورسات`.
- يتم التحقق من حساب Firebase الفعلي ودور المستخدم المخزن في `users`، وليس role cookie.
- يتم تنزيل نسخة JSON احتياطية محلية، ثم حذف مستندات `courses`, `lessons`, `exams`, `questions` القديمة وإنشاء الباقة في **batch واحدة**. لا يوجد reset تلقائي عند النشر أو فتح الصفحة.
- لا تُحذف أرصدة الطلاب، سجل الدفع، الاشتراكات القديمة أو محاولات الامتحان التاريخية. الاشتراكات القديمة لا تمنح صلاحية للباقة الجديدة لأنها بمعرّف جديد.
- عند تجاوز 450 كتابة، تتوقف العملية قبل الحذف ويلزم ترحيل مخصص. فشل الـbatch لا يترك قاعدة فارغة أو حذفاً جزئياً.
- رابط الباقة الجديدة: `/course/basic-bundle-200-v1`.

## الباقة
**الكورس الأساسي — باقة ٣ كورسات**، اشتراك واحد **200 جنيه** من المحفظة، وليس 200 لكل وحدة.
1. مدخل إلى البرمجة: فيديو + `basic-intro.pdf` + امتحان.
2. المتغيرات والبيانات: فيديو + `basic-variables.pdf` + امتحان.
3. الشروط والتكرار: فيديو + `basic-conditions.pdf` + امتحان.
كل امتحان 4 MCQ بدرجة لكل سؤال، وسؤال مقالي عادي بدرجتين؛ الإجمالي 6، النجاح 4، المدة 15 دقيقة.
الفيديوهات أمثلة عامة باللغة الإنجليزية، والملخصات والأسئلة بالعربية؛ إتاحة YouTube والتضمين تحتاج اختباراً من بلد الطالب.
المقالي textarea عادي يدعم العربية والكتابة الطبيعية، بدون Code Editor أو قالب HTML.
لتوليد ملفات PDF مجدداً: `python scripts/generate-basic-pdfs.py` (التبعيات موضحة داخله؛ غير مطلوبة للتشغيل).

## إصلاح الشراء
- السعر الموجب يتغلب على أي علم مجاني قديم حتى لو `isFree` أو `is_free` يساوي true.
- السعر غير الصالح لا يتحول لصفر؛ يفشل الشراء برسالة واضحة.
- `buyCourse` يتحقق من Firebase ID token ويستخرج UID خادمياً؛ لا يقبل رصيداً أو سعراً أو UID من العميل.
- قراءة السعر والرصيد ثم الخصم + إيصال مكتمل + الاشتراك تحدث في Firestore transaction واحدة.
- معرّف الاشتراك والإيصال ثابت حسب الطالب والكورس، فتكرار الضغط أو إعادة الطلب لا يخصم مرتين.
- الوصول للمدفوع يتطلب اشتراكاً وإيصال خصم متطابقين، وليس مجرد مستند اشتراك قديم. «كورساتي» تُرشّح وفق الوصول الحقيقي؛ صفحات الدرس وبداية الامتحان تتحققان أيضاً.
- مسار Supabase القديم للشراء لم يعد يشتري منفصلاً، بل يحوّل إلى نفس مسار Firebase.
- المشتركون القدامى ذوو إيصالات غير مطابقة للبنية الجديدة يحتاجون مراجعة/ترحيل إداري، لا إعادة دفع تلقائية. لا يتم نقل أي خصم تاريخي أو تزوير إثبات دفع من localStorage.

## حدود الأمان والتحقق
الاختبارات تستخدم mocks للـFirestore وتغطي الرصيد الناقص، الدفع الكامل، flag مجاني قديم، التكرار، فشل commit، الوصول دون إيصال، واستبدال الكتالوج. يلزم اختبار حي على الاستضافة قبل اعتماد التحصيل.
**قواعد Firestore الحية غير متاحة في هذا المستودع ولم يتم نشر قواعد جديدة.** الـtransaction ليست بديلاً عن rules تمنع تعديل الرصيد أو تزوير الإيصالات مباشرة. يجب مراجعة الصلاحيات المنشورة، خاصة كتابة `users.walletBalance` و`wallet_transactions` و`enrollments` وتثبيت حقوق الأدمن. إجراء الخادم الحالي يعمل بصلاحيات مستخدم Firebase ولا يستخدم service account.
ملفات PDF التجريبية العامة وفيديوهات YouTube ليست محتوى DRM؛ حراسة صفحة الدرس لا تمنع وصول شخص يعرف الرابط المباشر. حماية محتوى مدفوع حقيقي تحتاج signed URLs/Storage rules ومزود فيديو محمي.
**فوري/البطاقات غير مفعّلة:** الدفع هنا خصم من المحفظة، وليس بوابة تحصيل بنكية جديدة.

---

## توثيق الإصدار السابق (الديمو المجاني القديم لم يعد هو الحالي)

# تحديث إدارة الكورسات والامتحانات — نوفمبر 2026

## الاستخدام السريع
1. سجّل الدخول بحساب الأدمن، ثم افتح `/admin/courses`.
2. اضغط **تجهيز الكورس التجريبي**. يتم حفظ كورس مجاني منشور، درس واحد، فيديو YouTube، ملف PDF عربي محلي، وامتحان ٥ أسئلة في عملية Firestore واحدة. إذا كان موجوداً لا يتم استبدال تعديلاتك أو إنشاء نسخة مكررة.
3. الكورس: `/course/demo-programming-starter`، الدرس: `/lesson/demo-programming-lesson`، الامتحان: `/exam/demo-programming-exam`.
4. لإضافة محتوى خاص: أنشئ الكورس، افتح إدارة دروسه، وأضف عنوان الدرس ورابط الفيديو وPDF.
5. من `/admin/exams/create` اختر الكورس ثم الدرس واكتب الأسئلة. يظهر الامتحان في صفحة الكورس والدرس تلقائياً.
6. من `/admin/exams` استخدم **ربط وظهور الامتحان** لنقل امتحان قديم أو إخفائه دون حذف النتائج.

الكورس التجريبي يستخدم فيديو مقدمة في البرمجة باللغة الإنجليزية:
`https://www.youtube.com/watch?v=zOjov-2OZ0E`
والملخص والأسئلة بالعربية. درجة النجاح ٣/٥ والمدة ١٠ دقائق.
ملف الملخص: `public/files/programming-starter.pdf`، وهو ملف حقيقي مضمن بالمشروع وليس رابط PDF وهمياً.

## التغييرات الفنية
- مسار الكورسات/الدروس/الامتحانات يعتمد Firebase. تم حذف fallback الذي يصنع امتحانات أو نتائج نجاح غير موجودة.
- قراءة حقول الكورس القديمة `snake_case` والجديدة `camelCase` متوافقة، مع احترام حالة النشر.
- إنشاء الامتحان والأسئلة atomic؛ لا يتم حفظ امتحان بلا أسئلته عند فشل الكتابة.
- تشغيل روابط YouTube العادية/المختصرة/Shorts تلقائياً داخل المشغل، وتشغيل MP4 كفيديو أصلي.
- محاولات الامتحان تستخدم Firebase ID token مع `FirebaseServerApp`، ومعرّفات ثابتة لكل طالب/امتحان/محاولة. لا يُستخدم `current-student` في إجراءات الامتحانات.
- المعاملة تمنع تكرار إنشاء نفس المحاولة، والاستئناف يعيد الوقت المتبقي وليس مدة جديدة. التصحيح يستخدم درجة النجاح الخاصة بالامتحان.
- لا تحصل الأسئلة المقالية على درجات تلقائية؛ تبقى النتيجة pending حتى تصحيح المعلم، ثم يعاد حساب مجموع المحاولة.
- حفظ الإجابات محلياً مفصول حسب الطالب والامتحان. فشل التسليم لا يمسحها.
- تم استبدال أرقام المشاهدة والأجزاء الوهمية بالمحتوى الحقيقي. لم يعد الخروج اللحظي من نافذة الامتحان يؤدي لتسليم عقابي.
- الخطوط محلية عبر Fontsource، فلا يحتاج البناء إلى الاتصال بـGoogle Fonts.
- جروب Supabase الاختياري يعرض رسالة عدم التفعيل عند غياب إعداداته بدلاً من كسر البناء.

## الاختبارات والتشغيل
```bash
npm ci
npm test
npm run type-check
npm run build
npm run start -- --hostname 0.0.0.0
```
اختبارات `tests/learning.test.cjs` تستخدم Firestore/Auth mocks لاختبار الروابط، التوافق، atomic writes، الديمو، ملكية المحاولات، والتصحيح والفشل. لا تُعد بديلاً عن اختبار Firebase الحي.

## حدود التحقق ومتطلبات الإنتاج
- تم اختبار build وTypeScript والاختبارات المعزولة وHTTP محلياً. لا يتاح الاتصال بـFirebase أو YouTube من بيئة التطوير الحالية؛ لم تُكتب بيانات على المشروع الفعلي ولم يتم تأكيد إتاحة الفيديو/التضمين إقليمياً.
- يلزم تجربة المسار الحي: أدمن يجهز الديمو، طالب مسجل يبدأ ويسلم، ثم التحقق من النتيجة والعودة للدرس وفتح PDF. جرّب أيضاً الإخفاء، المحاولات، وقطع الاتصال أثناء الحفظ.
- إجراءات الامتحان تعمل بصلاحيات الطالب الفعلية، لا بصلاحيات service account. قواعد Firestore المنشورة يجب أن تسمح بالقراءة والكتابة المناسبة للمستخدم المسجل وبـtransactions، وبالقراءة المملوكة فقط للمحاولات والإجابات.
- **أمان الإنتاج لم يُراجع بالكامل:** حماية واجهة الأدمن الموروثة تعتمد cookies يمكن تعديلها، وبعض أجزاء النظام ما زالت هجينة Firebase/Supabase. قواعد Firestore الفعلية غير موجودة في هذا المستودع ولم يتم تعديلها. لا تعتبر إخفاء الروابط أو role cookie بديلاً عن قواعد صلاحيات على قاعدة البيانات.
- مستندات الأسئلة الحالية تحتوي الإجابة الصحيحة ويقرأها عميل الامتحان؛ لإغلاق هذا الثغرة يلزم فصل مفاتيح التصحيح في مجموعة خادمية محمية وترحيل البيانات وتطبيق قواعد موثقة. لا يُنصح باستخدام البنية الحالية لامتحانات عالية الحساسية قبل هذه الخطوة.
- حماية روابط الفيديو وPDF المدفوعة تحتاج مزوداً يدعم signed URLs؛ إخفاء زر بالواجهة ليس DRM. ملف الديمو مقصود أن يكون عاماً ومجانياً.
- Firebase 13 الحالي يطلب Node >=24.12.0 حسب حزمته؛ بيئة الفحص Node 22 أظهرت تحذيرات engine رغم نجاح البناء. يجب ضبط إصدار Node المناسب على الاستضافة ومراجعة تحديثات Next.js الأمنية الموجودة في المشروع قبل النشر.

---

## التوثيق الأصلي (بعض الأقسام تصف مسارات Supabase القديمة)

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
