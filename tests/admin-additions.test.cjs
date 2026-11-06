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
    ref: {key},
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
      return { docs, size: docs.length, empty: !docs.length };
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
    mocks,
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
  const r = await s.addition().addFourthLesson("token");
  assert.equal(r.ok, true);
  const saved = s.data.get("courses/" + content.ARABIC_COURSE_ID);
  assert.equal(saved.title, "Existing title");
  assert.equal(saved.price, 200);
  assert.equal(saved.modules.length, 2);
  assert.equal(s.data.get("exam_attempts/old").score, 3);
  assert.equal(s.data.get("wallet_transactions/receipt").amount, 200);
  const count = s.writes();
  s.data.get("lessons/" + content.ARABIC_LESSON_ID).title = "Teacher edit";
  await s.addition().addFourthLesson("token");
  assert.equal(s.writes(), count);
  assert.equal(
    s.data.get("lessons/" + content.ARABIC_LESSON_ID).title,
    "Teacher edit",
  );
});
test("fourth lesson importer refuses a missing course or non-admin without writes", async () => {
  for (const role of ["admin", "student"]) {
    const s = store({ role });
    assert.equal((await s.addition().addFourthLesson("token")).ok, false);
    assert.equal(s.writes(), 0);
  }
});

test("bundled PDF is present in Git assets and matches the original Drive file", () => {
  const bytes = fs.readFileSync("public" + content.ARABIC_PDF_URL);
  assert.equal(bytes.length, content.ARABIC_PDF_SIZE);
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.equal(
    require("node:crypto").createHash("sha256").update(bytes).digest("hex"),
    content.ARABIC_PDF_SHA256,
  );
  assert.equal(
    content.fourthLessonDocuments()[0].data.files[0].url,
    content.ARABIC_PDF_URL,
  );
  const page = fs.readFileSync("src/app/admin/courses/page.tsx", "utf8");
  assert.equal(page.includes("setFourthPdf"), false);
  assert.equal(page.includes("onAuthStateChanged"), true);
});
test("existing fourth lesson migrates its PDF once, preserving teacher edits and other files", async () => {
  const s = store();
  s.data.set("courses/" + content.ARABIC_COURSE_ID, {
    revision: 0,
    modules: [],
  });
  await s.addition().addFourthLesson("token");
  const key = "lessons/" + content.ARABIC_LESSON_ID,
    prior = s.data.get(key);
  delete prior.bundledPdfVersion;
  prior.title = "Edited title";
  prior.files[0].url = "https://old-storage.test/file";
  prior.files.push({
    id: "other",
    title: "Another PDF",
    url: "https://example.com/other.pdf",
  });
  await s.addition().addFourthLesson("token");
  assert.equal(s.data.get(key).title, "Edited title");
  assert.equal(s.data.get(key).files[0].url, content.ARABIC_PDF_URL);
  assert.equal(s.data.get(key).files[1].id, "other");
  s.data.get(key).files[0].url = "https://example.com/teacher-new.pdf";
  const count = s.writes();
  await s.addition().addFourthLesson("token");
  assert.equal(s.writes(), count);
});

const comprehensive = load('src/lib/comprehensive-exam.ts', {'./arabic-fourth-lesson':content});
const courseExplanations = load('src/lib/learning-explanations.ts');
test('comprehensive is lesson five, covers four topics, has eight MCQ and three essays totaling fourteen',()=>{
 const rows=comprehensive.comprehensiveDocuments('fixed'),exam=rows.find(r=>r.collection==='exams').data,lesson=rows[0].data,qs=rows.filter(r=>r.collection==='questions');
 assert.equal(lesson.orderIndex,5);assert.equal(exam.antiCheat,true);assert.equal(exam.maxAttempts,1);
 assert.equal(qs.filter(q=>q.data.questionType==='mcq').length,8);assert.equal(qs.filter(q=>q.data.questionType==='essay').length,3);
 assert.equal(qs.reduce((n,q)=>n+q.data.marks,0),14);assert.equal(exam.totalMarks,14);
 assert.ok(qs.every(q=>q.data.explanation.length>15));assert.ok(qs.some(q=>q.data.branch==='النحو'));assert.ok(qs.some(q=>q.data.branch==='أساسيات البرمجة'));
});
function upgradeStore(){
 const s=store();s.data.set('courses/'+content.ARABIC_COURSE_ID,{revision:0});
 s.data.set('exams/practice',{courseId:content.ARABIC_COURSE_ID,lessonId:'l',isActive:true,maxAttempts:1,antiCheat:true});
 s.data.set('questions/known',{examId:'practice',questionText:'ما وظيفة المتغير؟',orderIndex:1});
 s.data.set('questions/edited',{examId:'practice',questionText:'سؤال مدرس جديد',orderIndex:2});
 s.data.set('exam_attempts/preserved',{score:9,totalMarks:10,status:'passed'});
 Object.assign(s.mocks,{'@/lib/arabic-fourth-lesson':content,'@/lib/comprehensive-exam':comprehensive,'@/lib/learning-explanations':courseExplanations});
 return {...s,upgrade:load('src/app/actions/upgrade-course-learning.ts',s.mocks).upgradeCourseLearning};
}
test('versioned migration opens practice, adds comprehensive and explanations, preserves history and later teacher edits',async()=>{
 const s=upgradeStore();const result=await s.upgrade('token');assert.equal(result.ok,true);assert.equal(result.changed,true);
 assert.equal(s.data.get('exams/practice').maxAttempts,0);assert.equal(s.data.get('exams/practice').antiCheat,false);
 assert.ok(s.data.get('questions/known').explanation);assert.equal(s.data.get('questions/edited').explanation,undefined);
 assert.equal(s.data.get('exam_attempts/preserved').score,9);
 assert.equal(s.data.get('exams/'+comprehensive.COMPREHENSIVE_EXAM_ID).antiCheat,true);
 s.data.get('exams/practice').maxAttempts=3;
 assert.equal((await s.upgrade('token')).changed,false);assert.equal(s.data.get('exams/practice').maxAttempts,3);
});
test('migration refuses comprehensive IDs owned by another course',async()=>{
 const s=upgradeStore();s.data.set('lessons/'+comprehensive.COMPREHENSIVE_LESSON_ID,{courseId:'someone-else'});
 assert.equal((await s.upgrade('token')).ok,false);assert.equal(s.data.get('exams/practice').maxAttempts,1);
});
function forumStore(options){
 const s=store(options);
 s.mocks['@/lib/image-attachments']=load('src/lib/image-attachments.ts');
 s.mocks['@/lib/firebase/config']={firebaseConfig:{storageBucket:'bucket'}};
 s.mocks['@/lib/firebase/student-database']={studentDatabase:async token=>{if(!token)throw Error('unauthenticated');return {db:{},uid:'s'};}};
 return {...s,forum:load('src/app/actions/student-learning.ts',s.mocks)};
}
test('course forum denies anonymous and non-subscribers for reads and writes',async()=>{
 const s=forumStore({access:false});
 await assert.rejects(s.forum.courseForum('c'));
 await assert.rejects(s.forum.courseForum('c','token'));
 await assert.rejects(s.forum.writeCourseForum({courseId:'c',title:'test',content:'test'},'token'));
});
test('forum only returns requested course; cross-course replies rejected',async()=>{
 const s=forumStore();s.data.set('course_forum_posts/a',{courseId:'c',title:'A',content:'text',author:'name',createdAt:'2026-01-01'});s.data.set('course_forum_posts/b',{courseId:'other',title:'B',content:'text',author:'name',createdAt:'2026-01-01'});
 const rows=await s.forum.courseForum('c','token');assert.equal(rows.length,1);assert.equal(rows[0].id,'a');
 await assert.rejects(s.forum.writeCourseForum({courseId:'c',postId:'b',content:'reply'},'token'));
 await s.forum.writeCourseForum({courseId:'c',postId:'a',content:'reply'},'token');assert.equal(s.data.get('course_forum_posts/a').replies.length,1);
});

test('phone lookup accepts legacy fields, leading-zero loss, international and localized formats without matching parents',async()=>{
 for(const [field,value] of [['phoneNumber','+20 101 234 5678'],['phone_number','٠١٠١٢٣٤٥٦٧٨'],['mobile',1012345678],['student_phone','010.1234.5678'],['email','01012345678@mr-ass.app']]) {
  const s=store();s.data.set('users/s',{role:'student',fullName:'Legacy',[field]:value});
  const r=await s.grants().manageLessonAttempts(request);assert.equal(r.ok,true,field);assert.equal(r.studentId,'s');
 }
 assert.equal(phone.normalizeStudentPhone('+20 (0)10 1234 5678'),'01012345678');
 assert.equal(phone.normalizeStudentPhone('1012345678'),'01012345678');
 assert.equal(phone.studentPhoneMatches({parent_phone:'01012345678'},'01012345678'),false);
});
test('legacy phone lookup still rejects ambiguity and never selects an admin',async()=>{
 const s=store();s.data.set('users/second',{role:'student',phoneNumber:'+201012345678'});
 assert.equal((await s.grants().manageLessonAttempts(request)).ok,false);
 s.data.delete('users/second');s.data.get('users/s').role='admin';
 assert.equal((await s.grants().manageLessonAttempts(request)).ok,false);
});
test('forum permits image-only post and reply with owned course storage path, rejects foreign paths',async()=>{
 const s=forumStore();
 const path='course-forums/c/s/image-1.png';
 // Files live in Vercel Blob now; the stored URL and the recorded path must agree.
 const image={url:`https://s.public.blob.vercel-storage.com/${path}`,path,name:'test.png'};
 await s.forum.writeCourseForum({courseId:'c',content:'',image},'token');
 const post=[...s.data.values()].find(d=>d.image?.path===path);assert.ok(post);assert.equal(post.title,'سؤال بصورة');
 s.data.set('course_forum_posts/p',{courseId:'c',replies:[]});
 await s.forum.writeCourseForum({courseId:'c',postId:'p',content:'',image},'token');assert.equal(s.data.get('course_forum_posts/p').replies[0].image.path,path);
 await assert.rejects(s.forum.writeCourseForum({courseId:'c',content:'',image:{...image,path:'course-forums/c/other/image.png'}},'token'));
 await assert.rejects(s.forum.writeCourseForum({courseId:'c',content:'',image:{...image,url:'https://evil.test/image.png'}},'token'));
 await assert.rejects(s.forum.writeCourseForum({courseId:'c',content:''},'token'));
});
test('image validation checks real signatures, content type and size; SVG rejected',async()=>{
 const {validateImageFile,MAX_IMAGE_BYTES}=load('src/lib/image-attachments.ts');
 const file=(type,bytes,size=bytes.length)=>({type,size,slice:()=>({arrayBuffer:async()=>new Uint8Array(bytes).buffer})});
 assert.equal(await validateImageFile(file('image/png',[137,80,78,71,13,10,26,10])), 'image/png');
 assert.equal(await validateImageFile(file('image/jpeg',[255,216,255,0])), 'image/jpeg');
 await assert.rejects(validateImageFile(file('image/png',[60,115,118,103])));
 await assert.rejects(validateImageFile(file('image/svg+xml',[60,115,118,103])));
 await assert.rejects(validateImageFile(file('image/jpeg',[255,216,255],MAX_IMAGE_BYTES+1)));
});
test('YouTube shielding and custom quality button are removed',()=>{
 const source=fs.readFileSync('src/components/course/secure-video-player.tsx','utf8');
 assert.ok(!source.includes('data-youtube-shield'));assert.ok(!source.includes('youtubeSettingsOpen'));assert.ok(!source.includes('إعدادات الجودة والتحكم'));assert.ok(source.includes('allowFullScreen'));
});
