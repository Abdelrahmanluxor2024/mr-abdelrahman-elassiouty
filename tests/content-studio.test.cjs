const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(path, mocks = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(js, {
    exports,
    require: (id) => {
      if (id in mocks) return mocks[id];
      if (id === "./learning-content")
        return load("src/lib/learning-content.ts");
      throw Error(id);
    },
    console,
    URL,
    Intl,
    Date,
    Set,
    Map,
    Number,
    Math,
  });
  return exports;
}
const { lessonVideos, lessonFiles, validContentUrl } = load(
  "src/lib/learning-content.ts",
);
const { learningStats, cairoDate } = load("src/lib/learning-stats.ts");
const { reviewSummary, optionLabel } = load("src/lib/exam-review.ts");
const { validateCourseDraft, builderLesson } = load(
  "src/lib/course-builder.ts",
);
function draft() {
  return {
    id: "c",
    revision: 0,
    title: "Course",
    description: "",
    price: 200,
    isFree: false,
    durationHours: 0,
    thumbnailUrl: "/images/example.jpg",
    modules: [{ id: "m", title: "Module" }],
    lessons: [
      {
        id: "l",
        title: "Lesson",
        description: "",
        moduleId: "m",
        videos: [
          { id: "v", title: "Video", url: "https://example.com/video.mp4" },
        ],
        files: [
          { id: "p", title: "PDF", url: "/files/test.pdf", locked: true },
        ],
        examIds: ["e", "e2"],
      },
    ],
    originalLessonIds: [],
    originalExamIds: [],
  };
}
test("legacy resources normalize with stable IDs, preserving locked PDFs", () => {
  const l = {
    id: "l",
    title: "L",
    videoUrl: "https://example.com/v.mp4",
    pdfUrl: "/files/l.pdf",
    isPdfLocked: true,
  };
  assert.equal(lessonVideos(l).length, 1);
  assert.equal(lessonFiles(l)[0].locked, true);
  assert.equal(builderLesson(l, ["exam"]).id, "l");
  assert.equal(builderLesson(l, ["exam"]).examIds[0], "exam");
});
test("explicit resource arrays take precedence, including intentional removal", () => {
  assert.equal(lessonVideos({ videos: [], videoUrl: "old" }).length, 0);
  assert.equal(lessonFiles({ files: [], pdfUrl: "old" }).length, 0);
  assert.equal(
    lessonVideos({
      videos: [
        { id: "1", title: "1", url: "a" },
        { id: "2", title: "2", url: "b" },
      ],
    }).length,
    2,
  );
});
test("content URL validation rejects unsafe protocols and path traversal", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://example.com/v",
    "/files/../a",
    "/files/a b",
    "/files/a\\b",
    "bad",
  ])
    assert.equal(validContentUrl(url), false);
  assert.equal(validContentUrl("/files/a.pdf"), true);
  assert.equal(validContentUrl("https://example.com/file.pdf"), true);
});
test("course builder accepts multiple videos, files and exams and preserves lesson ID", () => {
  const d = draft();
  d.lessons[0].videos.push({
    id: "v2",
    title: "Part 2",
    url: "https://example.com/2.mp4",
  });
  d.lessons[0].files.push({ id: "p2", title: "Notes 2", url: "/files/2.pdf" });
  assert.equal(validateCourseDraft(d, true).length, 0);
  assert.equal(d.lessons[0].id, "l");
});
test("empty course may be a draft but cannot be published", () => {
  const d = draft();
  d.lessons = [];
  assert.equal(validateCourseDraft(d, false).length, 0);
  assert.ok(validateCourseDraft(d, true).length);
});
test("publication requires lesson content and valid named resources", () => {
  const d = draft();
  d.lessons[0].videos = [];
  d.lessons[0].files = [];
  assert.ok(validateCourseDraft(d, true).length);
  d.lessons[0].videos = [{ id: "x", title: "", url: "javascript:alert(1)" }];
  assert.ok(validateCourseDraft(d, true).length);
});
test("builder rejects invalid prices, missing units and duplicate exam assignments", () => {
  for (const price of [-1, NaN, Infinity, 0]) {
    const d = draft();
    d.price = price;
    assert.ok(validateCourseDraft(d, true).length);
  }
  const d = draft();
  d.lessons.push({ ...d.lessons[0], id: "l2" });
  assert.ok(validateCourseDraft(d, true).length);
  d.lessons = [{ ...d.lessons[0], moduleId: "missing" }];
  assert.ok(validateCourseDraft(d, true).length);
});
test("builder refuses oversized saves before a transaction", () => {
  const d = draft();
  d.originalLessonIds = Array.from({ length: 445 }, (_, i) => String(i));
  assert.ok(validateCourseDraft(d, true).length);
});
test("new student has exactly zero progress and seven zero activity days", () => {
  const s = learningStats(
    ["l"],
    ["e"],
    [],
    [],
    new Date("2026-11-04T12:00:00Z"),
  );
  assert.equal(s.progress, 0);
  assert.equal(s.passedExams, 0);
  assert.equal(s.completedLessons, 0);
  assert.equal(s.days.length, 7);
  assert.ok(s.days.every((d) => d.exams === 0 && d.lessons === 0));
});
test("progress only counts scoped published content, deduplicates, and excludes pending essays from passes", () => {
  const s = learningStats(
    ["l", "l2"],
    ["e"],
    [
      { lessonId: "l", completedAt: "2026-11-04T12:00:00Z" },
      { lessonId: "l", completedAt: "2026-11-04T13:00:00Z" },
      { lessonId: "foreign", completedAt: "2026-11-04T12:00:00Z" },
    ],
    [
      { examId: "e", status: "pending", submittedAt: "2026-11-04T12:00:00Z" },
      { examId: "foreign", status: "passed" },
    ],
    new Date("2026-11-04T16:00:00Z"),
  );
  assert.equal(s.progress, 33);
  assert.equal(s.completedLessons, 1);
  assert.equal(s.passedExams, 0);
  assert.equal(s.days.at(-1).lessons, 1);
  assert.equal(s.days.at(-1).exams, 1);
});
test("submitted exam activity uses Cairo dates and excludes in-progress attempts", () => {
  const s = learningStats(
    [],
    ["e", "e2"],
    [],
    [
      {
        id: "a",
        examId: "e",
        status: "passed",
        submittedAt: "2026-11-03T22:30:00Z",
      },
      {
        id: "a",
        examId: "e",
        status: "passed",
        submittedAt: "2026-11-03T22:30:00Z",
      },
      {
        examId: "e2",
        status: "in_progress",
        createdAt: "2026-11-04T01:00:00Z",
      },
    ],
    new Date("2026-11-04T12:00:00Z"),
  );
  assert.equal(s.days.at(-1).exams, 1);
  assert.equal(s.progress, 50);
});
test("Cairo calendar produces seven unique consecutive days across DST changes", () => {
  for (const now of ["2026-04-24T21:30:00Z", "2026-10-30T22:30:00Z"]) {
    const s = learningStats([], [], [], [], new Date(now));
    assert.equal(new Set(s.days.map((d) => d.date)).size, 7);
    assert.equal(s.days.at(-1).date, cairoDate(new Date(now)));
  }
});
test("unavailable or zero-item curriculum never fabricates a percentage", () => {
  assert.equal(
    learningStats(
      [],
      [],
      [{ lessonId: "x", completedAt: "today" }],
      [{ examId: "y", status: "passed" }],
    ).progress,
    0,
  );
});
test("pending essay review exposes real weighted MCQ grade without a final verdict", () => {
  const q = [
    { id: "a", question_type: "mcq", marks: 5 },
    { id: "b", question_type: "mcq", marks: 2 },
    { id: "c", question_type: "essay", marks: 10 },
  ];
  const a = [
    { question_id: "a", marks_obtained: 5, status: "auto_graded" },
    { question_id: "b", marks_obtained: 0, status: "auto_graded" },
    { question_id: "c", marks_obtained: 0, status: "pending" },
  ];
  const s = reviewSummary(q, a);
  assert.equal(s.mcqScore, 5);
  assert.equal(s.mcqTotal, 7);
  assert.equal(s.pendingEssays, 1);
  a[2].status = "graded";
  a[2].marks_obtained = 7;
  assert.equal(reviewSummary(q, a).pendingEssays, 0);
  assert.equal(reviewSummary(q, a).mcqScore, 5);
});
test("review handles essay-only exams and displays option text as well as letter", () => {
  assert.equal(
    reviewSummary([{ id: "e", question_type: "essay", marks: 10 }], [])
      .mcqTotal,
    0,
  );
  assert.equal(
    optionLabel({ options: [{ key: "a", text: "Answer text" }] }, "A"),
    "A — Answer text",
  );
});
function store() {
  const data = new Map([["users/admin", { role: "admin" }]]);
  let writes = 0;
  const firestore = {
    doc: (_, c, id) => ({ key: `${c}/${id}`, id }),
    collection: (_, name) => ({ name }),
    getDoc: async (r) => ({
      exists: () => data.has(r.key),
      data: () => data.get(r.key),
    }),
    runTransaction: async (_, fn) => {
      const staged = [];
      await fn({
        get: firestore.getDoc,
        set: (r, v, o) => staged.push([r, v, o]),
        update: (r, v) => staged.push([r, v, { merge: true }]),
      });
      staged.forEach(([r, v, o]) =>
        data.set(r.key, o?.merge ? { ...data.get(r.key), ...v } : v),
      );
      writes += staged.length;
    },
  };
  const mocks = {
    "firebase/firestore": firestore,
    "firebase/storage": {},
    "./config": {
      db: {},
      auth: { authStateReady: async () => {}, currentUser: { uid: "admin" } },
    },
    "./services": {},
    "../course-builder": load("src/lib/course-builder.ts"),
  };
  return {
    data,
    mocks,
    writes: () => writes,
    api: () => load("src/lib/firebase/course-builder-service.ts", mocks),
  };
}
test("course save atomically archives removed content, preserves history and legacy fields", async () => {
  const s = store(),
    d = draft();
  s.data.set("courses/c", { revision: 0, custom: "retained" });
  s.data.set("lessons/old", { title: "Old" });
  s.data.set("exams/oldexam", { isActive: true });
  s.data.set("exams/e", { courseId: "c" });
  s.data.set("exams/e2", { courseId: "c" });
  s.data.set("exam_attempts/history", { score: 5 });
  d.originalLessonIds = ["old"];
  d.originalExamIds = ["oldexam", "e", "e2"];
  await s.api().saveCourseDraft(d, true);
  assert.equal(s.data.get("courses/c").custom, "retained");
  assert.equal(s.data.get("courses/c").is_published, true);
  assert.equal(s.data.get("courses/c").revision, 1);
  assert.equal(s.data.get("lessons/old").isPublished, false);
  assert.equal(s.data.get("exams/oldexam").isActive, false);
  assert.equal(s.data.get("exams/e").lessonId, "l");
  assert.equal(s.data.get("lessons/l").videoUrl, d.lessons[0].videos[0].url);
  assert.equal(s.data.get("exam_attempts/history").score, 5);
});
test("non-admin saves, stale revisions and foreign exams cannot write anything", async () => {
  for (const problem of ["role", "revision", "foreign"]) {
    const s = store(),
      d = draft();
    s.data.set("exams/e", { courseId: "c" });
    s.data.set("exams/e2", { courseId: "c" });
    if (problem === "role") s.data.set("users/admin", { role: "student" });
    if (problem === "revision") s.data.set("courses/c", { revision: 2 });
    if (problem === "foreign")
      s.data.set("exams/e", { courseId: "someone-else" });
    await assert.rejects(s.api().saveCourseDraft(d, true));
    assert.equal(s.writes(), 0);
  }
});
test("lesson completion derives student from auth and is idempotent without resetting date", async () => {
  const s = store();
  s.data.set("lessons/l", { courseId: "c" });
  const mocks = {
    "firebase/app": { initializeServerApp: () => ({}) },
    "firebase/auth": {
      getAuth: () => ({
        authStateReady: async () => {},
        currentUser: { uid: "student" },
      }),
    },
    "firebase/firestore": {
      ...s.mocks["firebase/firestore"],
      getFirestore: () => ({}),
    },
    "next/headers": { headers: () => ({}) },
    "@/lib/firebase/config": { firebaseConfig: {} },
    "@/lib/firebase/course-payment": { hasCourseAccess: async () => true },
  };
  const api = load("src/app/actions/learning.ts", mocks);
  assert.equal((await api.completeLesson("l")).ok, false);
  assert.equal((await api.completeLesson("l", "token")).ok, true);
  const date = s.data.get("lesson_progress/student_l").completedAt;
  assert.equal((await api.completeLesson("l", "token")).ok, true);
  assert.equal(s.writes(), 1);
  assert.equal(s.data.get("lesson_progress/student_l").completedAt, date);
});
test("hidden lesson or missing access denies completion without storing progress", async () => {
  for (const hidden of [true, false]) {
    const s = store();
    s.data.set("lessons/l", { courseId: "c", isPublished: !hidden });
    const mocks = {
      "firebase/app": { initializeServerApp: () => ({}) },
      "firebase/auth": {
        getAuth: () => ({
          authStateReady: async () => {},
          currentUser: { uid: "student" },
        }),
      },
      "firebase/firestore": {
        ...s.mocks["firebase/firestore"],
        getFirestore: () => ({}),
      },
      "next/headers": { headers: () => ({}) },
      "@/lib/firebase/config": { firebaseConfig: {} },
      "@/lib/firebase/course-payment": { hasCourseAccess: async () => false },
    };
    assert.equal(
      (
        await load("src/app/actions/learning.ts", mocks).completeLesson(
          "l",
          "token",
        )
      ).ok,
      false,
    );
    assert.equal(s.writes(), 0);
  }
});

test("incomplete resource rows survive a saved draft but cannot be published", () => {
  const d = draft();
  d.lessons[0].videos = [{ id: "unfinished", title: "Part 2", url: "" }];
  assert.equal(validateCourseDraft(d, false).length, 0);
  assert.ok(validateCourseDraft(d, true).length);
  assert.equal(
    builderLesson({ ...d.lessons[0], courseId: "c" }).videos[0].id,
    "unfinished",
  );
  assert.equal(lessonFiles({ pdfUrl: "/files/old.pdf" })[0].locked, false);
});
test("builder rejects sub-cent prices rather than publishing an unpurchasable course", () => {
  const d = draft();
  d.price = 0.001;
  assert.ok(validateCourseDraft(d, true).length);
});
