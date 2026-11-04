const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(path, mocks = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      require: (id) => {
        if (id in mocks) return mocks[id];
        throw Error(id);
      },
      URL,
      console,
      Response,
      Request,
      Buffer,
      Uint8Array,
      process,
      Date,
      Number,
      Map,
      Set,
    },
  );
  return exports;
}
const content = load("src/lib/arabic-fourth-lesson.ts"),
  phone = load("src/lib/phone.ts");
function store({ role = "admin", access = true } = {}) {
  const data = new Map([
    ["users/admin", { role }],
    [
      "users/s",
      { role: "student", phone: "01012345678", fullName: "Test student" },
    ],
    ["courses/c", { is_published: true, price: 200 }],
    ["lessons/l", { courseId: "c", isPublished: true }],
    ["exams/e", { courseId: "c", lessonId: "l", isActive: true }],
    [
      "exam_attempts/old",
      { studentId: "s", examId: "e", status: "failed", score: 3 },
    ],
  ]);
  let writes = 0;
  const snapshot = (key) => ({
    id: key.split("/")[1],
    exists: () => data.has(key),
    data: () => data.get(key),
  });
  const firestore = {
    doc: (_, c, id) => ({ key: c + "/" + id }),
    collection: (_, name) => ({ name }),
    where: (field, op, value) => ({ field, value }),
    query: (c, ...filters) => ({ ...c, filters }),
    getDoc: async (r) => snapshot(r.key),
    getDocs: async (q) => {
      const docs = [...data.keys()]
        .filter(
          (k) =>
            k.startsWith(q.name + "/") &&
            (!q.filters ||
              q.filters.every((f) => data.get(k)[f.field] === f.value)),
        )
        .map(snapshot);
      return { docs, empty: !docs.length };
    },
    runTransaction: async (_, fn) => {
      let writing = false;
      const staged = [];
      const result = await fn({
        get: async (r) => {
          assert.equal(writing, false, "all reads must precede writes");
          return snapshot(r.key);
        },
        set: (r, v) => {
          writing = true;
          staged.push([r.key, v]);
        },
        update: (r, v) => {
          writing = true;
          staged.push([r.key, { ...data.get(r.key), ...v }]);
        },
      });
      staged.forEach(([key, v]) => data.set(key, v));
      writes += staged.length;
      return result;
    },
  };
  const mocks = {
    "firebase/firestore": firestore,
    "@/lib/firebase/admin-database": {
      adminDatabase: async (token) => {
        if (!token || role !== "admin") throw Error("admin required");
        return { db: {}, uid: "admin" };
      },
    },
    "@/lib/firebase/course-payment": { hasCourseAccess: async () => access },
    "@/lib/phone": phone,
    "@/lib/arabic-fourth-lesson": content,
  };
  return {
    data,
    writes: () => writes,
    grants: () => load("src/app/actions/attempt-grants.ts", mocks),
    addition: () => load("src/app/actions/add-fourth-lesson.ts", mocks),
  };
}
const request = { phone: "01012345678", lessonId: "l", idToken: "token" };
test("Egyptian phone normalization handles international and Arabic digits", () => {
  for (const value of [
    "٠١٠١٢٣٤٥٦٧٨",
    "+20 101 234 5678",
    "00201012345678",
    "01012345678",
  ])
    assert.equal(phone.normalizeStudentPhone(value), "01012345678");
  for (const value of ["bad", "010", "011123456789", "01012345678x"])
    assert.equal(phone.normalizeStudentPhone(value), "");
});
test("fourth lesson contains its real PDF, chosen video, two weighted exams and ten questions", () => {
  const rows = content.fourthLessonDocuments(
    "fixed",
    "https://example.com/notes.pdf",
  );
  assert.equal(rows.filter((r) => r.collection === "lessons").length, 1);
  assert.equal(rows.filter((r) => r.collection === "exams").length, 2);
  assert.equal(rows.filter((r) => r.collection === "questions").length, 10);
  assert.equal(content.ARABIC_PDF_SIZE, 19475744);
  assert.match(content.ARABIC_PDF_SHA256, /^[a-f0-9]{64}$/);
  for (const exam of rows.filter((r) => r.collection === "exams")) {
    const qs = rows.filter(
      (r) => r.collection === "questions" && r.data.examId === exam.id,
    );
    assert.equal(
      qs.reduce((n, q) => n + q.data.marks, 0),
      exam.data.totalMarks,
    );
    assert.equal(qs.filter((q) => q.data.questionType === "essay").length, 1);
  }
});
test("student preview performs no writes and confirmation records one audited credit", async () => {
  const s = store();
  const before = await s.grants().manageLessonAttempts(request);
  assert.equal(before.ok, true);
  assert.equal(s.writes(), 0);
  const result = await s.grants().manageLessonAttempts({
    ...request,
    confirm: true,
    expectedStudentId: "s",
  });
  assert.equal(result.ok, true);
  assert.equal(s.data.get("exam_attempt_grants/s_e").generation, 1);
  assert.equal(s.data.get("exam_attempt_grant_audit/s_e_1").grantedBy, "admin");
  assert.equal(s.data.get("exam_attempts/old").score, 3);
  await s.grants().manageLessonAttempts({
    ...request,
    confirm: true,
    expectedStudentId: "s",
  });
  assert.equal(s.data.get("exam_attempt_grants/s_e").generation, 1);
  assert.equal(s.writes(), 2);
});
test("granting is denied for non-admin, absent token, wrong confirmation or unpaid course", async () => {
  for (const scenario of ["role", "token", "confirmation", "access"]) {
    const s = store({
      role: scenario === "role" ? "student" : "admin",
      access: scenario !== "access",
    });
    const result = await s.grants().manageLessonAttempts({
      ...request,
      idToken: scenario === "token" ? undefined : "token",
      confirm: true,
      expectedStudentId: scenario === "confirmation" ? "other" : "s",
    });
    assert.equal(result.ok, false);
    assert.equal(s.writes(), 0);
  }
});
test("duplicate phone accounts are rejected and another lesson cannot affect an exam", async () => {
  const s = store();
  s.data.set("users/s2", { phone: "+201012345678", role: "student" });
  assert.equal((await s.grants().manageLessonAttempts(request)).ok, false);
  s.data.delete("users/s2");
  s.data.set("lessons/other", { courseId: "c" });
  assert.equal(
    (await s.grants().manageLessonAttempts({ ...request, lessonId: "other" }))
      .ok,
    false,
  );
  assert.equal(s.writes(), 0);
});
test("unused and in-progress exams do not receive extra attempts", async () => {
  for (const status of [null, "in_progress"]) {
    const s = store();
    if (status) s.data.get("exam_attempts/old").status = status;
    else s.data.delete("exam_attempts/old");
    const result = await s.grants().manageLessonAttempts({
      ...request,
      confirm: true,
      expectedStudentId: "s",
    });
    assert.equal(result.ok, true);
    assert.equal(s.writes(), 0);
  }
});
test("a consumed credit with an ongoing retake cannot receive another grant", async () => {
  const s = store();
  s.data.set("exam_attempt_grants/s_e", {
    studentId: "s",
    examId: "e",
    generation: 1,
    usedGeneration: 1,
  });
  s.data.set("exam_attempts/s_e_grant_1", {
    studentId: "s",
    examId: "e",
    status: "in_progress",
  });
  await s.grants().manageLessonAttempts({
    ...request,
    confirm: true,
    expectedStudentId: "s",
  });
  assert.equal(s.writes(), 0);
  s.data.get("exam_attempts/s_e_grant_1").status = "failed";
  await s.grants().manageLessonAttempts({
    ...request,
    confirm: true,
    expectedStudentId: "s",
  });
  assert.equal(s.data.get("exam_attempt_grants/s_e").generation, 2);
});
test("additive fourth lesson never resets courses, wallets, purchases or prior attempts", async () => {
  const s = store();
  s.data.set("courses/" + content.ARABIC_COURSE_ID, {
    title: "Existing title",
    price: 200,
    revision: 0,
    modules: [{ id: "intro", title: "Old module" }],
  });
  s.data.set("wallet_transactions/receipt", { amount: 200 });
  const r = await s
    .addition()
    .addFourthLesson(
      "token",
      "https://firebasestorage.googleapis.com/v0/b/bucket/o/courses%2Fbasic-bundle-200-v1%2Fpdf%2Ftest.pdf?alt=media&token=test",
    );
  assert.equal(r.ok, true);
  const saved = s.data.get("courses/" + content.ARABIC_COURSE_ID);
  assert.equal(saved.title, "Existing title");
  assert.equal(saved.price, 200);
  assert.equal(saved.modules.length, 2);
  assert.equal(s.data.get("exam_attempts/old").score, 3);
  assert.equal(s.data.get("wallet_transactions/receipt").amount, 200);
  const count = s.writes();
  s.data.get("lessons/" + content.ARABIC_LESSON_ID).title = "Teacher edit";
  await s
    .addition()
    .addFourthLesson(
      "token",
      "https://firebasestorage.googleapis.com/v0/b/bucket/o/courses%2Fbasic-bundle-200-v1%2Fpdf%2Ftest.pdf?alt=media&token=test",
    );
  assert.equal(s.writes(), count);
  assert.equal(
    s.data.get("lessons/" + content.ARABIC_LESSON_ID).title,
    "Teacher edit",
  );
});
test("fourth lesson importer refuses a missing course or non-admin without writes", async () => {
  for (const role of ["admin", "student"]) {
    const s = store({ role });
    assert.equal(
      (
        await s
          .addition()
          .addFourthLesson(
            "token",
            "https://firebasestorage.googleapis.com/v0/b/bucket/o/courses%2Fbasic-bundle-200-v1%2Fpdf%2Ftest.pdf?alt=media&token=test",
          )
      ).ok,
      false,
    );
    assert.equal(s.writes(), 0);
  }
});

test("new fourth lesson requires an uploaded PDF, and arbitrary URLs cannot be used", async () => {
  const s = store();
  s.data.set("courses/" + content.ARABIC_COURSE_ID, {
    revision: 0,
    modules: [],
  });
  assert.equal((await s.addition().addFourthLesson("token")).ok, false);
  assert.equal(
    (
      await s
        .addition()
        .addFourthLesson("token", "https://example.com/not-the-file.pdf")
    ).ok,
    false,
  );
  assert.equal(s.writes(), 0);
});
