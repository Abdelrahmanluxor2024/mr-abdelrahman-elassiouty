import { collection, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from './config';

export const DEMO_COURSE_ID = 'demo-programming-starter';
/** One atomic write, stable IDs, and no overwrite if an admin edits the demo later. */
export async function createDemoCourse() {
  const courseRef = doc(db, 'courses', DEMO_COURSE_ID);
  if ((await getDoc(courseRef)).exists()) return false;
  const lessonId = 'demo-programming-lesson';
  const examId = 'demo-programming-exam';
  const createdAt = new Date().toISOString();
  const batch = writeBatch(db);
  batch.set(courseRef, {
    title: 'خطوتك الأولى في البرمجة',
    description: 'كورس تجريبي مجاني: فيديو مقدمة في البرمجة، ملخص PDF، واختبار قصير من ٥ أسئلة. ابدأ بدون أي خبرة سابقة.',
    price: 0, is_free: true, isFree: true, is_published: true, isPublished: true,
    duration_hours: 1, durationHours: 1, thumbnail_url: '/images/course-foundation-languages.jpg',
    thumbnailUrl: '/images/course-foundation-languages.jpg', lessonsCount: 1, partsCount: 1,
    homeworkCount: 1, tag: 'ابدأ هنا • مجاني', createdAt, created_at: createdAt
  });
  batch.set(doc(db, 'lessons', lessonId), {
    courseId: DEMO_COURSE_ID, title: 'مقدمة إلى عالم البرمجة',
    description: 'شاهد المقدمة، اقرأ الملخص، ثم اختبر فهمك في خمس خطوات بسيطة.',
    videoUrl: 'https://www.youtube.com/watch?v=zOjov-2OZ0E',
    pdfUrl: '/files/programming-starter.pdf', isPdfLocked: false, orderIndex: 1, createdAt
  });
  batch.set(doc(db, 'exams', examId), {
    courseId: DEMO_COURSE_ID, lessonId, title: 'اختبار البداية — أساسيات البرمجة',
    description: 'خمسة أسئلة بسيطة على مفاهيم الملخص. درجة النجاح ٣ من ٥.',
    durationMinutes: 10, totalMarks: 5, passingMarks: 3, maxAttempts: 3,
    questionsCount: 5, isActive: true, createdAt
  });
  const items = [
    ['ما المقصود بالبرمجة؟', ['كتابة تعليمات ينفذها الحاسوب', 'إصلاح شاشة الحاسوب', 'زيادة سرعة الإنترنت', 'رسم الصور فقط'], 'a'],
    ['ما وظيفة المتغير؟', ['إغلاق البرنامج', 'تخزين قيمة يمكن استخدامها لاحقاً', 'حذف الملفات', 'تشغيل الشاشة'], 'b'],
    ['ما المقصود بالخوارزمية؟', ['نوع شاشة', 'كلمة مرور', 'خطوات مرتبة لحل مشكلة', 'صورة متحركة'], 'c'],
    ['متى نستخدم الشرط if؟', ['لتنفيذ أمر عند تحقق شرط', 'لتغيير الجهاز', 'لحذف اللغة', 'لتثبيت الشاشة'], 'a'],
    ['ما فائدة الحلقة التكرارية؟', ['إيقاف الإنترنت', 'تغيير لون الجهاز', 'تشفير الشاشة', 'تكرار مجموعة تعليمات'], 'd']
  ] as const;
  items.forEach(([questionText, options, correctAnswer], index) => {
    batch.set(doc(db, 'questions', `${examId}-${index + 1}`), {
      examId, questionText, questionType: 'mcq', marks: 1, orderIndex: index + 1,
      options: options.map((text, i) => ({key: ['a', 'b', 'c', 'd'][i], text})), correctAnswer
    });
  });
  await batch.commit();
  return true;
}
