import {
  ARABIC_COURSE_ID,
  fourthLessonDocuments,
} from "./arabic-fourth-lesson";
export const COMPREHENSIVE_LESSON_ID = `${ARABIC_COURSE_ID}-comprehensive`;
export const COMPREHENSIVE_EXAM_ID = `${COMPREHENSIVE_LESSON_ID}-exam`;
const explanations = [
  "«كتاب» اسم يقبل التنوين وأل، أما يكتب واكتب ففعلان وإلى حرف.",
  "التنوين من علامات الاسم؛ أما سوف ولم فمن علامات الأفعال.",
  "«في» حرف جر لا يظهر معناه مستقلاً، بخلاف الأسماء والأفعال.",
  "«هذا» اسم إشارة، وأسماء الإشارة من المعارف؛ بقية الاختيارات نكرات.",
  "الضمة علامة الرفع الأصلية في الاسم المفرد، مثل: الطالبُ مجتهدٌ.",
  "المثنى يرفع بالألف وينصب ويجر بالياء، مثل: رأيت الطالبَيْن.",
  "«المدرسةِ» اسم مجرور بإلى وعلامة جره الكسرة؛ لأنها اسم مفرد.",
  "جمع المؤنث السالم ينصب بالكسرة نيابة عن الفتحة، مثل: كرّمت الطالباتِ.",
];
export function comprehensiveDocuments(now = new Date().toISOString()) {
  const grammar = fourthLessonDocuments(now).filter(
    (r) => r.collection === "questions" && r.data.questionType === "mcq",
  );
  const selected = [
    [
      "الخوارزمية هي…",
      ["اسم جهاز", "خطوات مرتبة لحل مشكلة", "صورة", "كلمة مرور"],
      "b",
      "الخوارزمية خطوات مرتبة وواضحة لحل مشكلة.",
    ],
    [
      "أول خطوة لحل المشكلة هي…",
      ["تجاهلها", "شراء جهاز", "فهم المطلوب", "حذف الملفات"],
      "c",
      "يجب فهم المطلوب والمعطيات قبل التخطيط والتنفيذ والاختبار.",
    ],
    [
      "ما وظيفة المتغير؟",
      ["تخزين قيمة", "إغلاق الشاشة", "مسح النظام", "تشغيل الإنترنت"],
      "a",
      "المتغير يخزن قيمة يمكن قراءتها وتغييرها أثناء التنفيذ.",
    ],
    [
      "اسم الطالب يُخزن عادة كـ…",
      ["صورة", "نص", "عدد صحيح", "ملف صوت"],
      "b",
      "اسم الطالب نص، بينما العمر والدرجة بيانات عددية.",
    ],
    [
      "نستخدم الشرط عندما نريد…",
      [
        "اتخاذ قرار حسب حالة",
        "إصلاح لوحة المفاتيح",
        "حذف البيانات دائماً",
        "إغلاق الإنترنت",
      ],
      "a",
      "الشرط يختار الإجراء بناء على تحقق حالة معينة.",
    ],
    [
      "الحلقة التكرارية تساعد على…",
      ["إيقاف الشاشة", "تكرار مجموعة تعليمات", "حذف اللغة", "تغيير الجهاز"],
      "b",
      "الحلقة تكرر مجموعة تعليمات دون إعادة كتابتها.",
    ],
  ] as const;
  const questions = [
    ...selected.map(([questionText, options, correctAnswer, explanation]) => ({
      data: {
        questionText,
        questionType: "mcq",
        correctAnswer,
        explanation,
        options: options.map((text, i) => ({
          key: ["a", "b", "c", "d"][i],
          text,
        })),
        branch: "أساسيات البرمجة",
        createdAt: now,
      },
    })),
    ...[grammar[1], grammar[6]].map((q, i) => ({
      data: { ...q.data, explanation: explanations[i === 0 ? 1 : 6] },
    })),
  ];
  const rows: { collection: string; id: string; data: Record<string, any> }[] =
    [
      {
        collection: "lessons",
        id: COMPREHENSIVE_LESSON_ID,
        data: {
          courseId: ARABIC_COURSE_ID,
          moduleId: "arabic-foundation",
          moduleTitle: "المحاضرة التأسيسية — عربي",
          title: "الدرس الخامس — الامتحان الشامل",
          description:
            "امتحان شامل في موضوعات الدروس الأربعة: الخوارزميات والمتغيرات والشروط والتكرار والنحو التأسيسي. ٨ اختيار و٣ مقالي.",
          orderIndex: 5,
          isPublished: true,
          videoUrl: "",
          files: [],
          createdAt: now,
        },
      },
      {
        collection: "exams",
        id: COMPREHENSIVE_EXAM_ID,
        data: {
          courseId: ARABIC_COURSE_ID,
          lessonId: COMPREHENSIVE_LESSON_ID,
          title: "الامتحان الشامل",
          description:
            "٨ أسئلة اختيارية و٣ مقالية — قيود تقليل الغش مفعلة، وليست ضماناً لمنعه.",
          durationMinutes: 40,
          totalMarks: 14,
          passingMarks: 7,
          questionsCount: 11,
          maxAttempts: 1,
          antiCheat: true,
          isActive: true,
          createdAt: now,
        },
      },
    ];
  questions.forEach((q, i) =>
    rows.push({
      collection: "questions",
      id: `${COMPREHENSIVE_EXAM_ID}-q${i + 1}`,
      data: {
        ...q.data,
        examId: COMPREHENSIVE_EXAM_ID,
        marks: 1,
        orderIndex: i + 1,
        explanation: q.data.explanation || "",
      },
    }),
  );
  const essays = [
    [
      "اشرح الخوارزمية مع مثال يومي مرتب، واذكر لماذا نختبر الحل.",
      "الخوارزمية خطوات مرتبة لحل مشكلة مثل إعداد الشاي. نختبر الحل للتأكد من النتائج وكشف الأخطاء. درجة للتعريف والمثال، ودرجة لبيان غرض الاختبار.",
    ],
    [
      "اذكر مثالاً لمتغير نصي وآخر عددي، ثم وضح بمثال الفرق بين الشرط والتكرار.",
      "اسم الطالب متغير نصي ودرجته متغير عددي. الشرط يقرر النجاح حسب الدرجة، والتكرار يمر على درجات الطلاب. درجة للمتغيرين ودرجة للتمييز بين الشرط والتكرار.",
    ],
    [
      "أعرب كلمة الطالب في: جاء الطالبُ، رأيت الطالبَ، سلمت على الطالبِ.",
      "الطالبُ فاعل مرفوع بالضمة؛ الطالبَ مفعول به منصوب بالفتحة؛ الطالبِ اسم مجرور بعلى بالكسرة. درجة للمواقع ودرجة للعلامات الصحيحة.",
    ],
  ];
  essays.forEach(([questionText, explanation], i) =>
    rows.push({
      collection: "questions",
      id: `${COMPREHENSIVE_EXAM_ID}-q${i + 9}`,
      data: {
        examId: COMPREHENSIVE_EXAM_ID,
        questionText,
        explanation,
        questionType: "essay",
        marks: 2,
        options: [],
        correctAnswer: "",
        orderIndex: i + 9,
        branch: i === 2 ? "النحو" : "أساسيات البرمجة",
        createdAt: now,
      },
    }),
  );
  return rows;
}
export function foundationExplanation(order: number, examIndex: number) {
  if (order <= 4) return explanations[(examIndex - 1) * 4 + order - 1] || "";
  return examIndex === 1
    ? "مثال: الطالبُ يقرأ في الفصل؛ الطالب اسم يقبل أل، ويقرأ فعل يقبل لم، وفي حرف جر. تُراعى صحة الأمثلة والتصنيف والتعليل."
    : "الطالب في الجملة الأولى فاعل مرفوع بالضمة، وفي الثانية مفعول به منصوب بالفتحة، وفي الثالثة اسم مجرور بعلى بالكسرة.";
}
