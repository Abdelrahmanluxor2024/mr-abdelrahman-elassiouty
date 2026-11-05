// Additive, fixed IDs: never replace the catalogue or student history.
export const ARABIC_COURSE_ID = "basic-bundle-200-v1";
export const ARABIC_LESSON_ID = `${ARABIC_COURSE_ID}-arabic-foundation`;
export const ARABIC_PDF_SHA256 =
  "0858cc0fefbbadca9af94731ee4ceb7309da528aaca5b0e093b1ebcbd03da206";
export const ARABIC_PDF_SIZE = 19475744;
export const ARABIC_PDF_URL = "/files/arabic-foundation.pdf";
export const ARABIC_VIDEO = "https://www.youtube.com/watch?v=M3oCkj25J2o";
const banks = [
  {
    title: "اختبار ١ — أقسام الكلمة والمعرفة والنكرة",
    essay:
      "كوّن ثلاث جمل قصيرة تتضمن اسماً وفعلاً وحرفاً، وحدد مثالاً لكل قسم واذكر علامة تميّزه.",
    questions: [
      ["أي كلمة من الآتي اسم؟", ["كتاب", "يكتب", "اكتب", "إلى"], "a"],
      [
        "أي علامة مما يأتي من علامات الاسم؟",
        ["قبول سوف", "قبول التنوين", "الدلالة على الطلب فقط", "قبول لم"],
        "b",
      ],
      ["أي كلمة مما يأتي حرف؟", ["طالب", "نجح", "في", "ناجح"], "c"],
      ["أي اسم مما يأتي معرفة؟", ["طالبٌ", "مدينةٌ", "كتابٌ", "هذا"], "d"],
    ],
  },
  {
    title: "اختبار ٢ — الإعراب والمرفوعات والمنصوبات والمجرورات",
    essay:
      "أعرب كلمة «الطالب» في: جاء الطالبُ، ورأيتُ الطالبَ، وسلّمتُ على الطالبِ، مع بيان العلامة في كل جملة.",
    questions: [
      [
        "ما علامة رفع الاسم المفرد الأصلية؟",
        ["الضمة", "الفتحة", "الكسرة", "السكون"],
        "a",
      ],
      ["ما علامة نصب المثنى؟", ["الألف", "الياء", "الواو", "الضمة"], "b"],
      [
        "في جملة «ذهب الطالبُ إلى المدرسةِ»، ما إعراب «المدرسةِ»؟",
        ["فاعل", "مفعول به", "اسم مجرور", "مبتدأ"],
        "c",
      ],
      [
        "ما علامة نصب جمع المؤنث السالم؟",
        ["الفتحة", "الواو", "الألف", "الكسرة"],
        "d",
      ],
    ],
  },
] as const;
export function fourthLessonDocuments(
  now = new Date().toISOString(),
  pdfUrl = ARABIC_PDF_URL,
) {
  const lesson = {
    collection: "lessons",
    id: ARABIC_LESSON_ID,
    data: {
      courseId: ARABIC_COURSE_ID,
      moduleId: "arabic-foundation",
      moduleTitle: "المحاضرة التأسيسية — عربي",
      title: "الدرس الرابع — التأسيس في النحو",
      description:
        "أقسام الكلمة والمعرفة والنكرة وعلامات الإعراب. شاهد فيديو التأسيس وراجع مذكرة المحاضرة، ثم حل الاختبارين.",
      orderIndex: 4,
      isPublished: true,
      videoUrl: ARABIC_VIDEO,
      pdfUrl,
      bundledPdfVersion: 1,
      isPdfLocked: false,
      videos: [
        {
          id: "arabic-video",
          title: "دورة تأسيس النحو — أ. محمد صلاح",
          url: ARABIC_VIDEO,
        },
      ],
      files: [
        {
          id: "arabic-pdf",
          title: "المحاضرة التاسيسية عربي",
          url: pdfUrl,
          locked: false,
        },
      ],
      createdAt: now,
    },
  };
  const result: {
    collection: string;
    id: string;
    data: Record<string, any>;
  }[] = [lesson];
  banks.forEach((bank, index) => {
    const id = `${ARABIC_LESSON_ID}-exam-${index + 1}`;
    result.push({
      collection: "exams",
      id,
      data: {
        courseId: ARABIC_COURSE_ID,
        lessonId: ARABIC_LESSON_ID,
        title: bank.title,
        description:
          "٤ أسئلة اختيار وسؤال مقالي؛ التصحيح النهائي بعد مراجعة المعلم.",
        durationMinutes: 15,
        totalMarks: 10,
        passingMarks: 5,
        maxAttempts: 1,
        questionsCount: 5,
        isActive: true,
        createdAt: now,
      },
    });
    bank.questions.forEach(([text, options, correct], i) =>
      result.push({
        collection: "questions",
        id: `${id}-q${i + 1}`,
        data: {
          examId: id,
          questionText: text,
          questionType: "mcq",
          marks: 2,
          correctAnswer: correct,
          options: options.map((text, j) => ({
            key: ["a", "b", "c", "d"][j],
            text,
          })),
          orderIndex: i + 1,
          branch: "النحو",
          createdAt: now,
        },
      }),
    );
    result.push({
      collection: "questions",
      id: `${id}-q5`,
      data: {
        examId: id,
        questionText: bank.essay,
        questionType: "essay",
        marks: 2,
        correctAnswer: "",
        options: [],
        orderIndex: 5,
        branch: "النحو",
        createdAt: now,
      },
    });
  });
  return result;
}
