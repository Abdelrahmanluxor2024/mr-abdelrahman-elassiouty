import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDMt3ultpdMtIX6mvUN_YigLf8d30QlR7A",
  authDomain: "mr-ass-4fc50.firebaseapp.com",
  projectId: "mr-ass-4fc50",
  storageBucket: "mr-ass-4fc50.firebasestorage.app",
  messagingSenderId: "27487804656",
  appId: "1:27487804656:web:216073275f20d16b167635",
  measurementId: "G-R438E7BPJ9"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

async function seed() {
  console.log('Seeding demo course with 3 lessons and 10-question exam (8 MCQ + 2 Essay)...');

  const courseId = 'course-demo-test';
  const lesson1Id = 'lesson-demo-1';
  const lesson2Id = 'lesson-demo-2';
  const lesson3Id = 'lesson-demo-3';
  const exam1Id = 'exam-' + lesson1Id;
  const exam2Id = 'exam-' + lesson2Id;

  // 1. Create Course
  await setDoc(doc(db, 'courses', courseId), {
    id: courseId,
    title: 'كورس تجريبي لاختبار المنصة',
    description: 'كورس تجريبي شامل يحتوي على 3 محاضرات متتابعة بنظام القفل التتابعي، فيديو شرح كامل، ملفات ومذكرات تدريبية بصيغة PDF، وامتحان تقييمي إلكتروني مكون من 10 أسئلة (8 اختيار من متعدد + 2 مقالي لتصحيح المعلم).',
    price: 150,
    isFree: false,
    durationHours: 6,
    thumbnailUrl: '/images/hero-study.jpg',
    isPublished: true,
    tag: 'مكثف تجريبي',
    partsCount: 3,
    lessonsCount: 3,
    homeworkCount: 3,
    createdAt: new Date().toISOString()
  });
  console.log('Course created: ' + courseId);

  // 2. Create 3 Lessons
  // Lesson 1 (Unlocked by default)
  await setDoc(doc(db, 'lessons', lesson1Id), {
    id: lesson1Id,
    courseId: courseId,
    title: 'المحاضرة الأولى: التأسيس والمفاهيم الشاملة',
    description: 'شرح تفاعلي لقواعد المنهج التأسيسية وأهم التراكيب والأنماط، يليها مذكرة تدريبات وامتحان إجباري لفتح المحاضرة التالية.',
    videoUrl: 'https://youtu.be/dMX1d_yoGME?si=fWlBfuF26S-DA7iX',
    videoDuration: 45,
    pdfUrl: 'https://filebin.net/u3zi6f56wqta92fo',
    isPdfLocked: false,
    orderIndex: 1,
    isFreePreview: false,
    createdAt: new Date().toISOString()
  });

  // Lesson 2 (Locked until Lesson 1 Exam passed)
  await setDoc(doc(db, 'lessons', lesson2Id), {
    id: lesson2Id,
    courseId: courseId,
    title: 'المحاضرة الثانية: التطبيقات العملية وحل النماذج',
    description: 'تطبيق عملي متقدم على الجزئيات المشروحة ونماذج امتحانية سابقة وملاحظات هامة لرفع الدرجات.',
    videoUrl: 'https://youtu.be/dMX1d_yoGME?si=fWlBfuF26S-DA7iX',
    videoDuration: 50,
    pdfUrl: 'https://workupload.com/archive/zDJm7qDQAS',
    isPdfLocked: true,
    orderIndex: 2,
    isFreePreview: false,
    createdAt: new Date().toISOString()
  });

  // Lesson 3 (Locked until Lesson 2 Exam passed)
  await setDoc(doc(db, 'lessons', lesson3Id), {
    id: lesson3Id,
    courseId: courseId,
    title: 'المحاضرة الثالثة: المراجعة النهائية والاختبار التراكمي',
    description: 'مراجعة ختامية تلخص كافة النقاط الحرجة وتجهيز الطالب لأعلى درجات التفوق.',
    videoUrl: 'https://youtu.be/dMX1d_yoGME?si=fWlBfuF26S-DA7iX',
    videoDuration: 60,
    pdfUrl: 'https://filebin.net/u3zi6f56wqta92fo',
    isPdfLocked: true,
    orderIndex: 3,
    isFreePreview: false,
    createdAt: new Date().toISOString()
  });
  console.log('3 Lessons created successfully');

  // 3. Create Exam 1 (10 Questions: 8 MCQ + 2 Essay)
  await setDoc(doc(db, 'exams', exam1Id), {
    id: exam1Id,
    lessonId: lesson1Id,
    courseId: courseId,
    title: 'امتحان تقييم المحاضرة الأولى (إجباري لفتح المحاضرة الثانية)',
    description: 'امتحان مكون من 10 أسئلة (8 اختيار من متعدد + 2 مقالي يتم تصحيحها بواسطة المعلم). درجة النجاح 50%.',
    durationMinutes: 30,
    totalMarks: 20,
    passingMarks: 10,
    maxAttempts: 3,
    questionsCount: 10,
    isActive: true,
    createdAt: new Date().toISOString()
  });

  // Questions for Exam 1
  const exam1Questions = [
    // 8 MCQ Questions
    {
      id: `${exam1Id}-q1`,
      examId: exam1Id,
      questionText: 'ما هو إعراب كلمة "العلم" في جملة: "إن العلمَ نورٌ يضيءُ دروبَ الحياة"؟',
      questionType: 'mcq',
      marks: 2,
      orderIndex: 1,
      options: [
        { key: 'a', text: 'اسم إن منصوب وعلامة نصبه الفتحة الظاهرة' },
        { key: 'b', text: 'خبر إن مرفوع بالضمة الظاهرة' },
        { key: 'c', text: 'مبتدأ مؤخر مرفوع بالضمة' },
        { key: 'd', text: 'فاعل مرفوع بالضمة' }
      ],
      correctAnswer: 'a',
      explanation: 'الحرف الناسخ "إن" ينصب المبتدأ ويسمى اسمه ويرفع الخبر ويسمى خبره.'
    },
    {
      id: `${exam1Id}-q2`,
      examId: exam1Id,
      questionText: 'في قول الشاعر: "والبدرُ في كبدِ السماءِ كدرهمٍ ملقىً على ديباجةٍ زرقاءِ"، ما نوع التشبيه؟',
      questionType: 'mcq',
      marks: 2,
      orderIndex: 2,
      options: [
        { key: 'a', text: 'تشبيه بليغ' },
        { key: 'b', text: 'تشبيه تمثيلي' },
        { key: 'c', text: 'تشبيه ضمني' },
        { key: 'd', text: 'تشبيه مفصل' }
      ],
      correctAnswer: 'b',
      explanation: 'تشبيه تمثيلي حيث شُبهت هيئة البدر المستدير في السماء الزرقاء بهيئة الدرهم الفضي على قماش أزرق.'
    },
    {
      id: `${exam1Id}-q3`,
      examId: exam1Id,
      questionText: 'حدد المشتق وعمله في جملة: "المُتقِنُ عملَه مقدَّرٌ عند الجميع":',
      questionType: 'mcq',
      marks: 2,
      orderIndex: 3,
      options: [
        { key: 'a', text: 'المُتقِن: اسم فاعل عامل، و"عمله" مفعول به منصوب' },
        { key: 'b', text: 'مقدَّر: اسم فاعل غير عامل' },
        { key: 'c', text: 'عملَه: فاعل لاسم المفعول' },
        { key: 'd', text: 'المتقن: صيغة مبالغة عاملة' }
      ],
      correctAnswer: 'a',
      explanation: '"المتقن" معرف بأل فيعمل عمل فعله (الذي يتقن عمله)، فعمله مفعول به منصوب.'
    },
    {
      id: `${exam1Id}-q4`,
      examId: exam1Id,
      questionText: 'ما دلالة اقتران جواب الشرط بالفاء في جملة: "مَن يسعَ في الخير فإنه مأجور"؟',
      questionType: 'mcq',
      marks: 2,
      orderIndex: 4,
      options: [
        { key: 'a', text: 'لأن جملة جواب الشرط جملة اسمية مثبة' },
        { key: 'b', text: 'لأن الجملة فعلية فعلها طلبي' },
        { key: 'c', text: 'لأن الجملة مسبوقة بـ لن' },
        { key: 'd', text: 'لأن فعلها جامد' }
      ],
      correctAnswer: 'a',
      explanation: 'يجب اقتران جواب الشرط بالفاء إذا كانت الجملة اسمية (فإنه مأجور).'
    },
    {
      id: `${exam1Id}-q5`,
      examId: exam1Id,
      questionText: 'ما المعنى البلاغي للاستفهام في قول الشاعر: "هل من طبيبٍ لداءِ الحبِّ أو راقِ؟":',
      questionType: 'mcq',
      marks: 2,
      orderIndex: 5,
      options: [
        { key: 'a', text: 'النفي والاستبعاد مع إظهار الألم والتحسر' },
        { key: 'b', text: 'التقرير والتوكيد' },
        { key: 'c', text: 'التعجب والاستنكار' },
        { key: 'd', text: 'التهديد والوعيد' }
      ],
      correctAnswer: 'a',
      explanation: 'الاستفهام هنا غرضه البلاغي النفي والتحسر، أي لا يوجد طبيب يبرئ داء الحب.'
    },
    {
      id: `${exam1Id}-q6`,
      examId: exam1Id,
      questionText: 'المصدر الصريح من الفعل "استخرجَ" هو:',
      questionType: 'mcq',
      marks: 2,
      orderIndex: 6,
      options: [
        { key: 'a', text: 'استخراج (مصدر سداسي قياسي)' },
        { key: 'b', text: 'تخريج (مصدر رباعي)' },
        { key: 'c', text: 'مخرج (مصدر ميمي)' },
        { key: 'd', text: 'خروج (مصدر ثلاثي)' }
      ],
      correctAnswer: 'a',
      explanation: 'الفعل السداسي على وزن "استفعل" يأتي مصدره على وزن "استفعال" مثل استخرج استخراج.'
    },
    {
      id: `${exam1Id}-q7`,
      examId: exam1Id,
      questionText: 'الجملة التي تحتوي على اسم مفعول صيغ من فعل غير ثلاثي هي:',
      questionType: 'mcq',
      marks: 2,
      orderIndex: 7,
      options: [
        { key: 'a', text: 'المشروعُ مُدارٌ بكفاءة عالية واحترافية' },
        { key: 'b', text: 'الحقُّ مقولٌ بكل شجاعة' },
        { key: 'c', text: 'الكتابُ مقروءٌ بعناية فائقة' },
        { key: 'd', text: 'البيتُ مبنيٌّ على قواعد متينة' }
      ],
      correctAnswer: 'a',
      explanation: '"مُدار" من الفعل غير الثلاثي "أُدِيرَ" (يُدار -> مُدار).'
    },
    {
      id: `${exam1Id}-q8`,
      examId: exam1Id,
      questionText: 'عند توكيد الفعل "تسعى" بالنون جوازاً في جملة تفيد الطلب نقول:',
      questionType: 'mcq',
      marks: 2,
      orderIndex: 8,
      options: [
        { key: 'a', text: 'هل تسعينَّ في الخير بإخلاص؟' },
        { key: 'b', text: 'والله لتسعَينَّ الآن' },
        { key: 'c', text: 'تسعى الآن بالنون وجوباً' },
        { key: 'd', text: 'لا تسعى بدون ياء' }
      ],
      correctAnswer: 'a',
      explanation: 'يُرَدّ حرف العلة المحذوف أو المقصور إلى أصله عند توكيد الفعل المعتل الآخر بالنون: هل تسعينَّ.'
    },
    // 2 Essay Questions (Graded by Teacher in /admin/grading)
    {
      id: `${exam1Id}-q9`,
      examId: exam1Id,
      questionText: 'سؤال مقالي (1): اشرح بالتفصيل الفارق الدلالي والإعرابي بين "لا النافية للجنس" و"لا النافية للفعل" مع التمثيل بجملتين من إنشائك.',
      questionType: 'essay',
      marks: 2,
      orderIndex: 9,
      options: [],
      correctAnswer: 'إجابة مقالية نموذجية: لا النافية للجنس تعمل عمل إن فتنصب اسمها وترفع خبرها وتنفي الجنس عامة، أما لا النافية للفعل فلا تؤثر إعرابياً على الفعل المضارع بل يظل مرفوعاً وتنفي حدوث الفعل فقط.',
      explanation: 'سؤال مقالي يُصحح من قبل المعلم في لوحة التحكم.'
    },
    {
      id: `${exam1Id}-q10`,
      examId: exam1Id,
      questionText: 'سؤال مقالي (2): اكتب فقرة نقدية موجزة (في حدود 3 إلى 4 أسطر) تحلل فيها أثر الخيال البياني والموسيقى اللفظية في جذب مشاعر القارئ وإقناعه.',
      questionType: 'essay',
      marks: 2,
      orderIndex: 10,
      options: [],
      correctAnswer: 'إجابة مقالية نموذجية: الخيال البياني يجسد المعاني ويشخصها مما يقرب الفكرة للوجدان، وتضفي الموسيقى اللفظية جرساً ونغماً يطرب الأذن ويثبت المعنى في ذهن المتلقي.',
      explanation: 'سؤال مقالي يُصحح من قبل المعلم في لوحة التحكم.'
    }
  ];

  for (const q of exam1Questions) {
    await setDoc(doc(db, 'questions', q.id), q);
  }
  console.log('10 Questions for Exam 1 created successfully');

  // Also create Exam 2 for lesson 2 so that when student passes Exam 1 and reaches Lesson 2, there is an exam
  await setDoc(doc(db, 'exams', exam2Id), {
    id: exam2Id,
    lessonId: lesson2Id,
    courseId: courseId,
    title: 'امتحان تقييم المحاضرة الثانية (إجباري لفتح المحاضرة الثالثة)',
    description: 'امتحان تطبيقي شامل لفتح المحاضرة الثالثة والمراجعة النهائية.',
    durationMinutes: 25,
    totalMarks: 10,
    passingMarks: 5,
    maxAttempts: 3,
    questionsCount: 2,
    isActive: true,
    createdAt: new Date().toISOString()
  });

  await setDoc(doc(db, 'questions', `${exam2Id}-q1`), {
    id: `${exam2Id}-q1`,
    examId: exam2Id,
    questionText: 'أيٌّ من الآتي يُعد من أسماء الأفعال التي تفيد الأمر؟',
    questionType: 'mcq',
    marks: 5,
    orderIndex: 1,
    options: [
      { key: 'a', text: 'صهْ (بمعنى اسكت)' },
      { key: 'b', text: 'هيهات (بمعنى بَعُد)' },
      { key: 'c', text: 'أفٍّ (بمعنى أتضجر)' },
      { key: 'd', text: 'ويْ (بمعنى أعجب)' }
    ],
    correctAnswer: 'a',
    explanation: 'صه هو اسم فعل أمر بمعنى اسكت، بينما هيهات ماضٍ، وأف مضارع.'
  });

  await setDoc(doc(db, 'questions', `${exam2Id}-q2`), {
    id: `${exam2Id}-q2`,
    examId: exam2Id,
    questionText: 'سؤال مقالي: وضح كيف تفرق بين التشبيه الضمني والاستعارة المكنية في النصوص الأدبية؟',
    questionType: 'essay',
    marks: 5,
    orderIndex: 2,
    options: [],
    correctAnswer: 'التشبيه الضمني يلمح فيه التشبيه من سياق الكلام دون ذكر أداة أو مشبه ومشبه به صريحين، بينما الاستعارة المكنية تشبيه بليغ حذف أحد طرفيه ودل عليه بلازمة.',
    explanation: 'يُصحح بواسطة المعلم في لوحة التحكم.'
  });
  console.log('Exam 2 created');

  console.log('✅ ALL SEED DATA SUCCESSFULLY CREATED IN FIRESTORE!');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
