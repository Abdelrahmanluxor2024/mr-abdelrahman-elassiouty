import { collection, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from './config';

export const DEMO_COURSE_ID = 'basic-bundle-200-v1';
export const DEMO_PRICE = 200;
export const DEMO_MODULES = [
  {id: 'intro', title: 'الكورس الأول: مدخل إلى البرمجة', lessonTitle: 'الخوارزميات وحل المشكلات', videoUrl: 'https://www.youtube.com/watch?v=zOjov-2OZ0E', pdf: 'basic-intro.pdf', essay: 'اشرح بأسلوبك معنى الخوارزمية، واكتب مثالاً من حياتك اليومية.', questions: [
    ['ما هي البرمجة؟', ['كتابة تعليمات للحاسوب', 'إصلاح الشاشة', 'تسريع الإنترنت', 'رسم فقط'], 'a'],
    ['الخوارزمية هي…', ['اسم جهاز', 'خطوات مرتبة لحل مشكلة', 'صورة', 'كلمة مرور'], 'b'],
    ['أول خطوة لحل المشكلة هي…', ['تجاهلها', 'شراء جهاز', 'فهم المطلوب', 'حذف الملفات'], 'c'],
    ['لماذا نختبر البرنامج؟', ['لتغيير الشاشة', 'لتشغيل الصوت', 'لزيادة الحجم', 'للتأكد من صحة النتائج'], 'd']
  ]},
  {id: 'variables', title: 'الكورس الثاني: المتغيرات والبيانات', lessonTitle: 'تخزين القيم وأنواع البيانات', videoUrl: 'https://www.youtube.com/watch?v=rfscVS0vtbw', pdf: 'basic-variables.pdf', essay: 'اشرح الفرق بين البيانات النصية والعددية، واذكر مثالاً لكل نوع.', questions: [
    ['ما وظيفة المتغير؟', ['تخزين قيمة', 'إغلاق الشاشة', 'مسح النظام', 'تشغيل الإنترنت'], 'a'],
    ['اسم الطالب يُخزن عادة كـ…', ['صورة', 'نص', 'عدد صحيح', 'ملف صوت'], 'b'],
    ['أي من الآتي قيمة عددية؟', ['أحمد', 'القاهرة', '25', 'صباح الخير'], 'c'],
    ['عند تغيير قيمة المتغير…', ['يتلف الحاسوب', 'يحذف البرنامج', 'تختفي اللغة', 'يمكن استخدام القيمة الجديدة'], 'd']
  ]},
  {id: 'conditions', title: 'الكورس الثالث: الشروط والتكرار', lessonTitle: 'اتخاذ القرارات وتكرار الخطوات', videoUrl: 'https://www.youtube.com/watch?v=W6NZfCO5SIk', pdf: 'basic-conditions.pdf', essay: 'اذكر مثالاً لقرار يعتمد على شرط، ومثالاً لمهمة تحتاج تكراراً. لا يلزم كتابة كود.', questions: [
    ['نستخدم الشرط عندما نريد…', ['اتخاذ قرار حسب حالة', 'إصلاح لوحة المفاتيح', 'حذف البيانات دائماً', 'إغلاق الإنترنت'], 'a'],
    ['الحلقة التكرارية تساعد على…', ['إيقاف الشاشة', 'تكرار مجموعة تعليمات', 'حذف اللغة', 'تغيير الجهاز'], 'b'],
    ['إذا كانت درجة النجاح 50 ودرجة الطالب 70 فالشرط درجة ≥ 50…', ['غير معروف', 'مستحيل', 'متحقق', 'غير متحقق'], 'c'],
    ['لتجنب تكرار كتابة نفس التعليمات نستخدم…', ['صورة', 'عنواناً', 'شاشة أكبر', 'حلقة تكرارية'], 'd']
  ]}
] as const;

export type DemoDocument = {collection: string; id: string; data: Record<string, any>};
export function buildDemoDocuments(createdAt = new Date().toISOString()): DemoDocument[] {
  const result: DemoDocument[] = [{collection: 'courses', id: DEMO_COURSE_ID, data: {
    title: 'الكورس الأساسي — باقة ٣ كورسات', description: 'اشتراك واحد بـ٢٠٠ جنيه يفتح ثلاثة كورسات تأسيسية. كل كورس فرعي يحتوي درس فيديو، ملخص PDF عربي، واختبار ٤ أسئلة اختيار وسؤال مقالي عادي.',
    price: DEMO_PRICE, is_free: false, isFree: false, is_published: true, isPublished: true,
    duration_hours: 3, durationHours: 3, lessonsCount: 3, partsCount: 6, homeworkCount: 3,
    sequentialLearning: false, tag: '٣ كورسات • اشتراك واحد',
    modules: DEMO_MODULES.map(({id, title}) => ({id, title})),
    thumbnail_url: '/images/course-foundation-languages.jpg', thumbnailUrl: '/images/course-foundation-languages.jpg', createdAt, created_at: createdAt
  }}];
  DEMO_MODULES.forEach((module, index) => {
    const lessonId = `${DEMO_COURSE_ID}-${module.id}`, examId = `${lessonId}-exam`;
    result.push({collection: 'lessons', id: lessonId, data: {
      courseId: DEMO_COURSE_ID, moduleId: module.id, moduleTitle: module.title, title: module.lessonTitle,
      description: 'شاهد الشرح، اقرأ الملخص العربي، ثم أجب عن الاختبار والمقالي بأسلوبك.',
      videoUrl: module.videoUrl, pdfUrl: `/files/${module.pdf}`, isPdfLocked: false, orderIndex: index + 1, createdAt
    }});
    result.push({collection: 'exams', id: examId, data: {
      courseId: DEMO_COURSE_ID, lessonId, title: `اختبار ${module.title}`, description: '٤ أسئلة اختيار وسؤال مقالي نصي؛ النتيجة النهائية بعد مراجعة المعلم للمقالي.',
      durationMinutes: 15, totalMarks: 6, passingMarks: 4, maxAttempts: 3, questionsCount: 5, isActive: true, createdAt
    }});
    module.questions.forEach(([questionText, options, correctAnswer], qIndex) => {
      result.push({collection: 'questions', id: `${examId}-${qIndex + 1}`, data: {
        examId, questionText, questionType: 'mcq', marks: 1, orderIndex: qIndex + 1,
        options: options.map((text, i) => ({key: ['a', 'b', 'c', 'd'][i], text})), correctAnswer
      }});
    });
    result.push({collection: 'questions', id: `${examId}-5`, data: {examId, questionText: module.essay, questionType: 'essay', marks: 2, orderIndex: 5, options: [], correctAnswer: ''}});
  });
  return result;
}

export async function createDemoCourse() {
  if ((await getDoc(doc(db, 'courses', DEMO_COURSE_ID))).exists()) return false;
  const batch = writeBatch(db);
  buildDemoDocuments().forEach(row => batch.set(doc(db, row.collection, row.id), row.data));
  await batch.commit();
  return true;
}

/** Explicit admin operation only. Never runs on page load, build, or deployment. */
export async function replaceCatalogWithPaidDemo() {
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error('سجّل الدخول بحساب الأدمن أولاً');
  const admin = await getDoc(doc(db, 'users', auth.currentUser.uid));
  if (!admin.exists() || admin.data().role !== 'admin') throw new Error('هذه العملية متاحة للأدمن فقط');
  const names = ['courses', 'lessons', 'exams', 'questions'];
  const snapshots = await Promise.all(names.map(name => getDocs(collection(db, name))));
  const fresh = buildDemoDocuments();
  const freshKeys = new Set(fresh.map(row => `${row.collection}/${row.id}`));
  const old = snapshots.flatMap((snap, index) => snap.docs.map(row => ({collection: names[index], id: row.id, data: row.data()})));
  const deleting = old.filter(row => !freshKeys.has(`${row.collection}/${row.id}`));
  if (deleting.length + fresh.length > 450) throw new Error('المحتوى أكبر من حد الاستبدال الآمن. يلزم ترحيل إداري مخصص؛ لم يتم حذف أي شيء');
  // Save an admin-only local backup before the destructive commit. No student,
  // wallet, receipt, or historical attempt document is deleted.
  const blob = new Blob([JSON.stringify({exportedAt: new Date().toISOString(), documents: old}, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `catalog-backup-${Date.now()}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  const batch = writeBatch(db);
  deleting.forEach(row => batch.delete(doc(db, row.collection, row.id)));
  fresh.forEach(row => batch.set(doc(db, row.collection, row.id), row.data));
  await batch.commit();
  return {deletedCourses: snapshots[0].size, lessons: 3, exams: 3};
}
