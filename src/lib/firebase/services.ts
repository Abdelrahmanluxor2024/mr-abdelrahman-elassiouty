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
export const DEFAULT_COURSES: FirebaseCourse[] = [];

export const DEFAULT_LESSONS: Record<string, FirebaseLesson[]> = {};

// ======================== COURSES ========================
export async function getCourses(): Promise<FirebaseCourse[]> {
  const fetchCourses = async () => {
    const q = query(collection(db, 'courses'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirebaseCourse));
    }
    return null;
  };

  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 1200)
  );

  try {
    const data = await Promise.race([fetchCourses(), timeoutPromise]);
    if (data && data.length > 0) return data;
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
    // 1. Try with orderBy
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
    } catch (orderErr) {
      console.warn('Query with orderBy failed, querying without orderBy and sorting locally:', orderErr);
    }

    // 2. Fallback query without orderBy (in case Firestore requires composite index)
    const qSimple = query(
      collection(db, 'lessons'),
      where('courseId', '==', courseId)
    );
    const snapSimple = await getDocs(qSimple);
    if (!snapSimple.empty) {
      const list = snapSimple.docs.map(d => ({ id: d.id, ...d.data() } as FirebaseLesson));
      list.sort((a, b) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0));
      return list;
    }
  } catch (err) {
    console.warn('Firestore lessons fallback to defaults', err);
  }
  return DEFAULT_LESSONS[courseId] || [];
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

// ======================== ENROLLMENTS ========================

/** Check if a student is enrolled in a course */
export async function isEnrolledInCourse(studentId: string, courseId: string): Promise<boolean> {
  if (!studentId || !courseId) return false;
  try {
    const q = query(
      collection(db, 'enrollments'),
      where('studentId', '==', studentId),
      where('courseId', '==', courseId)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    console.warn('isEnrolledInCourse error', err);
    return false;
  }
}

/** Enroll a student in a course (free or after payment) */
export async function enrollStudent(studentId: string, courseId: string): Promise<void> {
  await addDoc(collection(db, 'enrollments'), {
    studentId,
    courseId,
    enrolledAt: new Date().toISOString(),
    progress: 0,
  });
}

// ======================== CHARGE CODES ========================

export async function redeemChargeCodeFirebase(
  studentId: string,
  codeStr: string
): Promise<{ ok: boolean; amount?: number; newBalance?: number; error?: string }> {
  const cleanCode = codeStr.trim().toUpperCase();
  if (!cleanCode) return { ok: false, error: 'يرجى إدخال كود الشحن' };

  try {
    const q = query(
      collection(db, 'charge_codes'),
      where('code', '==', cleanCode)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      return { ok: false, error: 'كود الشحن غير صحيح' };
    }

    const codeDoc = snap.docs[0];
    const codeData = codeDoc.data();

    if (codeData.is_used || codeData.isUsed) {
      return { ok: false, error: 'تم استخدام كود الشحن هذا مسبقاً' };
    }

    const amount = Number(codeData.amount || 0);

    // Mark code as used
    await updateDoc(doc(db, 'charge_codes', codeDoc.id), {
      is_used: true,
      isUsed: true,
      used_by: studentId,
      usedAt: new Date().toISOString()
    });

    // Top up student balance
    const userRef = doc(db, 'users', studentId);
    const userSnap = await getDoc(userRef);
    const currentBalance = userSnap.exists() ? Number(userSnap.data().walletBalance || 0) : 0;
    const newBalance = currentBalance + amount;

    if (userSnap.exists()) {
      await updateDoc(userRef, { walletBalance: newBalance });
    } else {
      await setDoc(userRef, { id: studentId, walletBalance: newBalance }, { merge: true });
    }

    // Log transaction
    await addDoc(collection(db, 'wallet_transactions'), {
      studentId,
      amount,
      type: 'credit',
      description: `شحن رصيد بكود: ${cleanCode}`,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString()
    });

    return { ok: true, amount, newBalance };
  } catch (err: any) {
    console.error('Error redeeming code:', err);
    return { ok: false, error: err.message || 'حدث خطأ أثناء شحن الكود' };
  }
}

/** Get student wallet balance from Firestore */
export async function getWalletBalance(studentId: string): Promise<number> {
  try {
    const snap = await getDoc(doc(db, 'users', studentId));
    if (snap.exists()) {
      return Number(snap.data().walletBalance || 0);
    }
  } catch (err) {
    console.warn('getWalletBalance error', err);
  }
  return 0;
}

/** Deduct balance and log transaction */
export async function deductWalletBalance(
  studentId: string,
  amount: number,
  description: string
): Promise<{ ok: boolean; newBalance: number; error?: string }> {
  try {
    const userRef = doc(db, 'users', studentId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return { ok: false, newBalance: 0, error: 'المستخدم غير موجود.' };

    const currentBalance = Number(snap.data().walletBalance || 0);
    if (currentBalance < amount) {
      return {
        ok: false,
        newBalance: currentBalance,
        error: `رصيدك الحالي (${currentBalance} ج.م) غير كافٍ. يرجى شحن المحفظة أولاً.`,
      };
    }

    const newBalance = currentBalance - amount;
    await updateDoc(userRef, { walletBalance: newBalance });

    // Log transaction
    await addDoc(collection(db, 'wallet_transactions'), {
      studentId,
      amount,
      type: 'debit',
      description,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString(),
    });

    return { ok: true, newBalance };
  } catch (err: any) {
    console.error('deductWalletBalance error', err);
    return { ok: false, newBalance: 0, error: 'حدث خطأ أثناء خصم الرصيد.' };
  }
}

/** Purchase a course: check enrollment, deduct balance, enroll */
export async function purchaseCourseFirebase(
  studentId: string,
  courseId: string
): Promise<{ ok: boolean; error?: string; alreadyEnrolled?: boolean }> {
  // 1. Check already enrolled
  const already = await isEnrolledInCourse(studentId, courseId);
  if (already) return { ok: true, alreadyEnrolled: true };

  // 2. Get course price
  const courseSnap = await getDoc(doc(db, 'courses', courseId));
  if (!courseSnap.exists()) return { ok: false, error: 'الكورس غير موجود.' };
  const courseData = courseSnap.data();
  const price = Number(courseData.price || 0);

  // 3. Free course → enroll directly
  if (courseData.isFree || price === 0) {
    await enrollStudent(studentId, courseId);
    return { ok: true };
  }

  // 4. Paid course → deduct from wallet then enroll
  const result = await deductWalletBalance(
    studentId,
    price,
    `شراء كورس: ${courseData.title}`
  );
  if (!result.ok) return { ok: false, error: result.error };

  await enrollStudent(studentId, courseId);
  return { ok: true };
}