import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';
import type {
  FirebaseCourse,
  FirebaseLesson,
  FirebaseExam,
  FirebaseQuestion,
  FirebaseExamAttempt,
  FirebaseUser
} from './types';

// ======================== DEFAULT COURSES SEED (FALLBACK) ========================
export const DEFAULT_COURSES: FirebaseCourse[] = [
  {
    id: 'course-sec3-ar',
    title: 'كورس الصف الثالث الثانوي - المنهج التأسيسي المتكامل لغة عربية',
    description: 'شرح تفصيلي شامل لمنهج الثانوية العامة مع تدريبات دورية وامتحانات تتبع مستواك خطوة بخطوة',
    price: 200,
    isFree: false,
    durationHours: 48,
    thumbnailUrl: '/images/hero-study.jpg',
    isPublished: true,
    tag: 'الصف الثالث الثانوي',
    discountPrice: 280,
    features: [
      'شرح تفصيلي لجميع فروع اللغة العربية (نحو، بلاغة، أدب، نصوص، قراءة)',
      'اختبارات إلكترونية بعد كل جزء مع تصحيح فوري وتحليل نقاط الضعف',
      'مذكرات وملخصات PDF احترافية مع أسلوب الخرائط الذهنية',
      'متابعة دورية واختبارات قياس مستوى تراكمية'
    ],
    partsCount: 16,
    lessonsCount: 12,
    homeworkCount: 24,
    createdAt: new Date().toISOString()
  },
  {
    id: 'course-sec2-ar',
    title: 'كورس الصف الثاني الثانوي - النحو والبلاغة التأسيسية',
    description: 'تأسيس قوي لدفعة تانية ثانوي في أهم قواعد النحو والبلاغة مع تدريبات عملية وبنوك أسئلة',
    price: 180,
    isFree: false,
    durationHours: 32,
    thumbnailUrl: '/images/course-foundation-languages.jpg',
    isPublished: true,
    tag: 'الصف الثاني الثانوي',
    discountPrice: 250,
    features: [
      'شرح مبسط ومباشر لقواعد النحو التراكمية',
      'تدريبات تفاعلية بنظام الأسئلة الحديثة',
      'ملفات وملازم PDF قابلة للعرض فور اجتياز الاختبار',
      'دعم واستفسارات مستمرة على المنتدى'
    ],
    partsCount: 10,
    lessonsCount: 8,
    homeworkCount: 16,
    createdAt: new Date().toISOString()
  },
  {
    id: 'course-sec1-free',
    title: 'كورس التأسيس الشامل المجاني في النحو والبلاغة',
    description: 'كورس مجاني بالكامل هدية لجميع الطلاب لإتقان أساسيات الإعراب والتشبيه والاستعارة',
    price: 0,
    isFree: true,
    durationHours: 15,
    thumbnailUrl: '/images/teacher-hero.jpg',
    isPublished: true,
    tag: 'تأسيس مجاني',
    discountPrice: 0,
    features: [
      'متاح مجاناً لكافة المراحل الدراسية',
      'شرح القواعد الذهبية في الإعراب من الصفر',
      'اختبار تدريبي لكل درس',
      'ملخص PDF مجاني شامل'
    ],
    partsCount: 6,
    lessonsCount: 4,
    homeworkCount: 6,
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_LESSONS: Record<string, FirebaseLesson[]> = {
  'course-sec3-ar': [
    {
      id: 'lesson-1',
      courseId: 'course-sec3-ar',
      title: 'المحاضرة 1: همزة الوصل والقطع + مدخل علم البلاغة',
      description: 'شرح شامل لقواعد الهمزات مع تطبيقات من نصوص الثانوية العامة ومراجعة على البلاغة التشبيه والاستعارة',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      videoDuration: 65,
      pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      isPdfLocked: false,
      orderIndex: 1,
      isFreePreview: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'lesson-2',
      courseId: 'course-sec3-ar',
      title: 'المحاضرة 2: المشتقات العاملة وأعمال اسم الفاعل والمفعول',
      description: 'إتقان المشتقات وإعمالها وصيغ المبالغة مع تدريب تطبيقي على أصعب نماذج الامتحانات',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      videoDuration: 75,
      pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      isPdfLocked: true,
      orderIndex: 2,
      isFreePreview: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'lesson-3',
      courseId: 'course-sec3-ar',
      title: 'المحاضرة 3: الأدب في مدرسة الإحياء والبعث وجيل التطوير',
      description: 'شرح مدرسة الإحياء وتلاميذ البارودي وأحمد شوقي وتطبيقات شعرية تفاعلية',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      videoDuration: 55,
      pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      isPdfLocked: true,
      orderIndex: 3,
      isFreePreview: false,
      createdAt: new Date().toISOString()
    }
  ]
};

// ======================== COURSES ========================
export async function getCourses(): Promise<FirebaseCourse[]> {
  try {
    const q = query(collection(db, 'courses'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirebaseCourse));
    }
  } catch (err) {
    console.warn('Firestore courses fallback to defaults', err);
  }
  return DEFAULT_COURSES;
}

export async function getCourseById(courseId: string): Promise<FirebaseCourse | null> {
  try {
    const snap = await getDoc(doc(db, 'courses', courseId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as FirebaseCourse;
    }
  } catch (err) {
    console.warn('Firestore getCourseById fallback', err);
  }
  return DEFAULT_COURSES.find(c => c.id === courseId) || null;
}

// ======================== LESSONS ========================
export async function getLessonsByCourse(courseId: string): Promise<FirebaseLesson[]> {
  try {
    const q = query(
      collection(db, 'lessons'),
      where('courseId', '==', courseId),
      orderBy('orderIndex', 'asc')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirebaseLesson));
    }
  } catch (err) {
    console.warn('Firestore lessons fallback to defaults', err);
  }
  return DEFAULT_LESSONS[courseId] || [
    {
      id: `${courseId}-l1`,
      courseId,
      title: 'المحاضرة الأولى: التأسيس والمفاهيم الأساسية',
      description: 'فيديو شرح المحاضرة الأولى مع تدريب وتطبيقات واختبار قياس المستوى',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      videoDuration: 60,
      pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      isPdfLocked: false,
      orderIndex: 1,
      isFreePreview: true,
      createdAt: new Date().toISOString()
    }
  ];
}

export async function getLessonById(lessonId: string): Promise<FirebaseLesson | null> {
  try {
    const snap = await getDoc(doc(db, 'lessons', lessonId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as FirebaseLesson;
    }
  } catch (err) {
    console.warn('Firestore getLessonById fallback', err);
  }
  for (const list of Object.values(DEFAULT_LESSONS)) {
    const found = list.find(l => l.id === lessonId);
    if (found) return found;
  }
  return null;
}

// ======================== EXAMS & QUESTIONS ========================
export async function getExamByLesson(lessonId: string): Promise<FirebaseExam | null> {
  try {
    const q = query(
      collection(db, 'exams'),
      where('lessonId', '==', lessonId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as FirebaseExam;
    }
  } catch (err) {
    console.warn('Firestore getExamByLesson fallback', err);
  }
  return {
    id: `exam-${lessonId}`,
    lessonId,
    title: `اختبار تقييم الدرس - قياس الفهم والاستيعاب`,
    description: 'يجب عليك اجتياز هذا الاختبار بنسبة 50% على الأقل لفتح المحاضرة والملفات التالية',
    durationMinutes: 20,
    totalMarks: 20,
    passingMarks: 10,
    maxAttempts: 2,
    questionsCount: 4,
    isActive: true,
    createdAt: new Date().toISOString()
  };
}

export async function getExamById(examId: string): Promise<FirebaseExam | null> {
  try {
    const snap = await getDoc(doc(db, 'exams', examId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as FirebaseExam;
    }
  } catch (err) {
    console.warn('Firestore getExamById fallback', err);
  }
  return {
    id: examId,
    lessonId: 'lesson-1',
    title: 'اختبار تقييم الدرس',
    description: 'اختبار إلكتروني لقياس المستوى وتأكيد الفهم',
    durationMinutes: 20,
    totalMarks: 20,
    passingMarks: 10,
    maxAttempts: 2,
    questionsCount: 4,
    isActive: true,
    createdAt: new Date().toISOString()
  };
}

export async function getQuestionsByExam(examId: string): Promise<FirebaseQuestion[]> {
  try {
    const q = query(
      collection(db, 'questions'),
      where('examId', '==', examId),
      orderBy('orderIndex', 'asc')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirebaseQuestion));
    }
  } catch (err) {
    console.warn('Firestore getQuestionsByExam fallback', err);
  }
  return [
    {
      id: 'q1',
      examId,
      questionText: 'ما هو إعراب كلمة "العلم" في جملة: "إن العلمَ نورٌ يضيءُ الطريق"؟',
      questionType: 'mcq',
      marks: 5,
      orderIndex: 1,
      options: [
        { key: 'a', text: 'اسم إن منصوب وعلامة نصبه الفتحة الظاهرة' },
        { key: 'b', text: 'خبر إن مرفوع وعلامة رفعه الضمة الظاهرة' },
        { key: 'c', text: 'مبتدأ مؤخر مرفوع وعلامة رفعه الضمة' },
        { key: 'd', text: 'مفعول به مقدم منصوب بالفتحة' }
      ],
      correctAnswer: 'a'
    },
    {
      id: 'q2',
      examId,
      questionText: 'في قول الشاعر: "والبدرُ في كبدِ السماءِ كدرهمٍ ملقىً على ديباجةٍ زرقاءِ"، نوع التشبيه هنا هو:',
      questionType: 'mcq',
      marks: 5,
      orderIndex: 2,
      options: [
        { key: 'a', text: 'تشبيه بليغ' },
        { key: 'b', text: 'تشبيه تمثيلي' },
        { key: 'c', text: 'تشبيه ضمني' },
        { key: 'd', text: 'تشبيه مجمل' }
      ],
      correctAnswer: 'b'
    },
    {
      id: 'q3',
      examId,
      questionText: 'حدد المشتق وعمله في جملة: "المُخلِصُ عملَه محبوبٌ بين الناس":',
      questionType: 'mcq',
      marks: 5,
      orderIndex: 3,
      options: [
        { key: 'a', text: 'المُخلِص اسم فاعل عامل رفع فاعلاً ونصب مفعولاً به (عمله)' },
        { key: 'b', text: 'محبوب اسم فاعل عامل' },
        { key: 'c', text: 'المُخلِص صيغة مبالغة غير عاملة' },
        { key: 'd', text: 'عملَه فاعل مرفوع بالضمة' }
      ],
      correctAnswer: 'a'
    },
    {
      id: 'q4',
      examId,
      questionText: 'من رائد مدرسة الإحياء والبعث في الشعر العربي الحديث؟',
      questionType: 'mcq',
      marks: 5,
      orderIndex: 4,
      options: [
        { key: 'a', text: 'أحمد شوقي' },
        { key: 'b', text: 'محمود سامي البارودي' },
        { key: 'c', text: 'حافظ إبراهيم' },
        { key: 'd', text: 'خليل مطران' }
      ],
      correctAnswer: 'b'
    }
  ];
}

// ======================== ADMIN CREATE EXAM ========================
export async function createExamWithQuestions(
  examData: Omit<FirebaseExam, 'id' | 'createdAt'>,
  questions: Omit<FirebaseQuestion, 'id' | 'examId'>[]
): Promise<string> {
  const examRef = await addDoc(collection(db, 'exams'), {
    ...examData,
    createdAt: new Date().toISOString()
  });

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await addDoc(collection(db, 'questions'), {
      ...q,
      examId: examRef.id,
      orderIndex: i + 1
    });
  }

  return examRef.id;
}

// ======================== EXAM ATTEMPTS & PROGRESS ========================
export async function getStudentPassedExams(studentId: string): Promise<Set<string>> {
  if (!studentId) return new Set();
  try {
    const q = query(
      collection(db, 'exam_attempts'),
      where('studentId', '==', studentId),
      where('status', '==', 'passed')
    );
    const snap = await getDocs(q);
    const passed = new Set<string>();
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.examId) passed.add(data.examId);
    });
    return passed;
  } catch (err) {
    console.warn('Firestore getStudentPassedExams fallback', err);
    return new Set();
  }
}

export async function saveExamAttempt(attempt: Omit<FirebaseExamAttempt, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'exam_attempts'), attempt);
  return docRef.id;
}

// ======================== STORAGE (IMAGES) ========================
export async function uploadQuestionImage(file: File, examId: string): Promise<string> {
  const storageRef = ref(storage, `questions/${examId}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}