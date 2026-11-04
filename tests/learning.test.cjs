const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, mocks = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(js, {exports, require: id => {if (id === './course-payment' || id === '@/lib/firebase/course-payment') return load('src/lib/firebase/course-payment.ts', mocks); if (id in mocks) return mocks[id]; throw new Error(id);}, console, setTimeout, URL});
  return exports;
}
const {getVideoSource} = load('src/lib/video-url.ts');
for (const src of ['https://www.youtube.com/watch?v=zOjov-2OZ0E', 'https://youtu.be/zOjov-2OZ0E?t=2', 'https://youtube.com/shorts/zOjov-2OZ0E', 'https://youtube.com/embed/zOjov-2OZ0E']) {
  test(`YouTube: ${src}`, () => assert.equal(getVideoSource(src).src, 'https://www.youtube-nocookie.com/embed/zOjov-2OZ0E'));
}
test('HTML5 video remains non-iframe', () => assert.equal(getVideoSource('https://example.com/lesson.mp4?token=abc').embed, false));
test('unsafe/invalid URLs rejected', () => {for (const src of ['javascript:alert(1)', 'http://youtube.com/watch?v=zOjov-2OZ0E', 'invalid', 'https://youtube.com/watch?v=bad']) assert.equal(getVideoSource(src).src, '');});
function database() {
  const data = new Map(); let commits = 0, serial = 0;
  const firestore = {
    collection: (_, name) => ({name}),
    doc: (db, name, id) => typeof db?.name === 'string' ? ({id: `auto-${++serial}`, key: `${db.name}/auto-${serial}`}) : ({id, key: `${name}/${id}`}),
    getDoc: async ref => ({exists: () => data.has(ref.key), data: () => data.get(ref.key)}),
    getDocs: async () => ({empty: true, docs: []}),
    query: (...args) => args, where: () => null, orderBy: () => null,
    writeBatch: () => {const writes = []; return {set: (ref, row) => writes.push([ref.key, row]), commit: async () => {commits++; writes.forEach(([key,row]) => data.set(key,row));}};}
  };
  const mocks = {'firebase/firestore': firestore, 'firebase/storage': {}, './config': {db: {}}, '@/lib/firebase/config': {db: {}}};
  return {data, mocks, commits: () => commits};
}
test('legacy and current course fields normalize consistently', () => {
  const state = database(); const {normalizeCourse} = load('src/lib/firebase/services.ts', state.mocks);
  const course = normalizeCourse('id', {price: 150, is_free: false, isFree: true, is_published: true, thumbnail_url: 'image', duration_hours: 2});
  assert.equal(course.isFree, false); assert.equal(course.isPublished, true); assert.equal(course.thumbnailUrl, 'image'); assert.equal(course.durationHours, 2);
});
test('missing exams/questions do not fabricate data', async () => {
  const state = database(); const services = load('src/lib/firebase/services.ts', state.mocks);
  assert.equal(await services.getExamById('missing'), null);
  assert.equal(await services.getExamByLesson('missing'), null);
  assert.equal((await services.getQuestionsByExam('missing')).length, 0);
});
test('exam and questions save atomically without undefined fields', async () => {
  const state = database(); const services = load('src/lib/firebase/services.ts', state.mocks);
  await services.createExamWithQuestions({title: 'Example'}, [{questionText: 'Q', imageUrl: undefined}]);
  assert.equal(state.commits(), 1); assert.equal(state.data.size, 2);
  const row = [...state.data.values()].find(q => q.questionText);
  assert.equal('imageUrl' in row, false);
  await assert.rejects(services.createExamWithQuestions({}, []));
});
test('paid demo has three lessons/PDFs/exams and repeats without overwriting', async () => {
  const state = database(); const demo = load('src/lib/firebase/demo-course.ts', state.mocks);
  assert.equal(await demo.createDemoCourse(), true);
  assert.equal(state.commits(), 1);
  assert.equal([...state.data.keys()].filter(k => k.startsWith('lessons/')).length, 3);
  assert.equal([...state.data.keys()].filter(k => k.startsWith('questions/')).length, 15);
  const course = state.data.get('courses/' + demo.DEMO_COURSE_ID);
  assert.equal(course.price, 200); assert.equal(course.isFree, false); assert.equal(course.is_free, false);
  assert.equal(course.modules.length, 3);
  assert.equal([...state.data.keys()].filter(k => k.startsWith('exams/')).length, 3);
  assert.equal([...state.data.values()].filter(q => q.questionType === 'essay').length, 3);
  for (const row of [...state.data.entries()].filter(([key]) => key.startsWith('lessons/')).map(([, value]) => value)) {
    assert.ok(fs.readFileSync('public' + row.pdfUrl).toString().startsWith('%PDF'));
  }
  const lesson = [...state.data.entries()].find(([k]) => k.startsWith('lessons/'))[1];
  assert.ok(getVideoSource(lesson.videoUrl).src);
  assert.ok(fs.readFileSync('public' + lesson.pdfUrl).toString().startsWith('%PDF'));
  assert.equal(await demo.createDemoCourse(), false); assert.equal(state.commits(), 1);
});
function actionsDatabase({essay = false, owner = 'student-1', active = true, fail = false} = {}) {
  const state = database();
  const attemptId = 'student-1_exam_1';
  state.data.set('exams/exam', {isActive: active, durationMinutes: 10, passingMarks: 2, totalMarks: 2, maxAttempts: 2});
  state.data.set('exam_attempts/' + attemptId, {examId: 'exam', studentId: owner, status: 'in_progress', createdAt: new Date().toISOString()});
  const firestore = state.mocks['firebase/firestore'];
  firestore.getFirestore = () => ({});
  firestore.getDocs = async q => {
    if (q?.[0]?.name === 'exam_attempts') {
      const docs = [...state.data.entries()].filter(([key, data]) => key.startsWith('exam_attempts/') && data.examId === 'exam' && data.studentId === 'student-1').map(([key, data]) => ({id: key.split('/')[1], data: () => data}));
      return {empty: !docs.length, docs};
    }
    return {empty: false, docs: [{id: 'q1', data: () => ({questionType: essay ? 'essay' : 'mcq', marks: 2, correctAnswer: 'a'})}]};
  };
  firestore.runTransaction = async (_, cb) => {
    if (fail) throw new Error('offline');
    return cb({get: firestore.getDoc, set: (ref, row) => state.data.set(ref.key, row), update: (ref, row) => state.data.set(ref.key, {...state.data.get(ref.key), ...row})});
  };
  Object.assign(state.mocks, {
    'firebase/app': {initializeServerApp: () => ({})},
    'firebase/auth': {getAuth: () => ({authStateReady: async () => {}, currentUser: {uid: 'student-1'}})},
    'next/headers': {headers: () => ({})},
    '@/lib/firebase/config': {firebaseConfig: {}}
  });
  return {...state, attemptId, actions: load('src/app/actions/exams.ts', state.mocks)};
}
test('start requires an ID token, and hidden exams cannot start', async () => {
  const state = actionsDatabase({active: false});
  assert.equal((await state.actions.startExam('exam')).ok, false);
  assert.equal((await state.actions.startExam('exam', 'token')).ok, false);
});
test('start resumes same attempt and does not reset its timer', async () => {
  const state = actionsDatabase();
  const response = await state.actions.startExam('exam', 'token');
  assert.equal(response.ok, true); assert.equal(response.attemptId, state.attemptId);
  assert.ok(response.durationMinutes <= 10);
});
test('MCQ grading uses exam passing marks and authenticated owner', async () => {
  const state = actionsDatabase();
  const result = await state.actions.submitExam({examId: 'exam', attemptId: state.attemptId, idToken: 'token', answers: [{questionId: 'q1', answerText: 'a'}]});
  assert.equal(result.ok, true); assert.equal(result.score, 2);
  assert.equal(state.data.get('exam_attempts/' + state.attemptId).status, 'passed');
  const foreign = actionsDatabase({owner: 'different-student'});
  assert.equal((await foreign.actions.submitExam({examId: 'exam', attemptId: foreign.attemptId, idToken: 'token', answers: []})).ok, false);
});
test('essay answers wait for grading rather than receiving free marks', async () => {
  const state = actionsDatabase({essay: true});
  const result = await state.actions.submitExam({examId: 'exam', attemptId: state.attemptId, idToken: 'token', answers: [{questionId: 'q1', answerText: 'Essay answer'}]});
  assert.equal(result.score, 0); assert.equal(state.data.get('exam_attempts/' + state.attemptId).status, 'pending');
});
test('write failure returns an error, never a fabricated success', async () => {
  const state = actionsDatabase({fail: true});
  assert.equal((await state.actions.submitExam({examId: 'exam', attemptId: state.attemptId, idToken: 'token', answers: []})).ok, false);
});
test('single-attempt rule ignores a legacy exam maxAttempts value of 99', async () => {
  const s = actionsDatabase();
  s.data.get('exams/exam').maxAttempts = 99;
  s.data.get('exam_attempts/' + s.attemptId).status = 'passed';
  assert.equal((await s.actions.startExam('exam', 'token')).ok, false);
  assert.equal(s.data.has('exam_attempts/student-1_exam_2'), false);
});
test('completed historical auto-ID attempt consumes the only chance', async () => {
  const s = actionsDatabase();
  s.data.delete('exam_attempts/' + s.attemptId);
  s.data.set('exam_attempts/legacy-attempt', {studentId: 'student-1', examId: 'exam', status: 'failed'});
  assert.equal((await s.actions.startExam('exam', 'token')).ok, false);
});
test('tab violation freezes answers; retries cannot replace the submission snapshot', async () => {
  const s = actionsDatabase();
  const input = {attemptId: s.attemptId, examId: 'exam', idToken: 'token', answers: [{questionId: 'q1', answerText: 'a'}]};
  assert.equal((await s.actions.saveExamDraft({...input, reason: 'tab_hidden'})).locked, true);
  const resumed = await s.actions.startExam('exam', 'token');
  assert.equal(resumed.locked, true); assert.equal(resumed.durationMinutes, 0);
  const result = await s.actions.submitExam({...input, answers: [{questionId: 'q1', answerText: 'b'}]});
  assert.equal(result.ok, true); assert.equal(result.score, 2);
  assert.equal(s.data.get('exam_attempts/' + s.attemptId).submissionReason, 'tab_hidden');
  assert.equal((await s.actions.startExam('exam', 'token')).ok, false);
});
test('late answers use the last saved server draft, not a changed browser timer', async () => {
  const s = actionsDatabase();
  const attempt = s.data.get('exam_attempts/' + s.attemptId);
  attempt.draftAnswers = {q1: 'b'}; attempt.expiresAt = new Date(Date.now() - 60000).toISOString();
  const result = await s.actions.submitExam({attemptId: s.attemptId, examId: 'exam', idToken: 'token', answers: [{questionId: 'q1', answerText: 'a'}]});
  assert.equal(result.ok, true); assert.equal(result.score, 0);
  assert.equal(attempt.submissionReason || s.data.get('exam_attempts/' + s.attemptId).submissionReason, 'timeout');
});
test('another student cannot save or lock a foreign attempt', async () => {
  const s = actionsDatabase({owner: 'other'});
  assert.equal((await s.actions.saveExamDraft({attemptId: s.attemptId, examId: 'exam', idToken: 'token', reason: 'window_blur', answers: []})).ok, false);
  assert.equal(s.data.get('exam_attempts/' + s.attemptId).lockedAt, undefined);
});
test('autosave cannot change an already frozen answer', async () => {
  const s = actionsDatabase();
  const input = {attemptId: s.attemptId, examId: 'exam', idToken: 'token', answers: [{questionId: 'q1', answerText: 'a'}]};
  await s.actions.saveExamDraft({...input, reason: 'capture_shortcut'});
  await s.actions.saveExamDraft({...input, answers: [{questionId: 'q1', answerText: 'b'}]});
  assert.equal(s.data.get('exam_attempts/' + s.attemptId).lockedAnswers.q1, 'a');
});
test('an older in-flight autosave cannot overwrite a newer server draft', async () => {
  const s = actionsDatabase();
  const input = {attemptId: s.attemptId, examId: 'exam', idToken: 'token'};
  await s.actions.saveExamDraft({...input, revision: 200, answers: [{questionId: 'q1', answerText: 'a'}]});
  await s.actions.saveExamDraft({...input, revision: 100, answers: [{questionId: 'q1', answerText: 'b'}]});
  assert.equal(s.data.get('exam_attempts/' + s.attemptId).draftAnswers.q1, 'a');
});
test('admin credit creates a clean attempt without deleting the original result',async()=>{
 const s=actionsDatabase();s.data.get('exam_attempts/'+s.attemptId).status='failed';
 s.data.set('exam_attempt_grants/student-1_exam',{studentId:'student-1',examId:'exam',generation:1,usedGeneration:0,grantedBy:'admin'});
 const result=await s.actions.startExam('exam','token');assert.equal(result.ok,true);assert.equal(result.fresh,true);assert.equal(result.attemptId,'student-1_exam_grant_1');
 assert.equal(s.data.get('exam_attempts/'+s.attemptId).status,'failed');assert.equal(s.data.get('exam_attempt_grants/student-1_exam').usedGeneration,1);
 assert.equal(Object.keys(s.data.get('exam_attempts/'+result.attemptId).draftAnswers).length,0);
 const resume=await s.actions.startExam('exam','token');assert.equal(resume.attemptId,result.attemptId);assert.equal(resume.fresh,undefined);
 s.data.get('exam_attempts/'+result.attemptId).status='passed';assert.equal((await s.actions.startExam('exam','token')).ok,false);
});
test('consumed, foreign and malformed grants cannot bypass the default single-attempt limit',async()=>{
 for(const grant of [{studentId:'someone',examId:'exam',generation:1,usedGeneration:0},{studentId:'student-1',examId:'other',generation:1,usedGeneration:0},{studentId:'student-1',examId:'exam',generation:1,usedGeneration:1},{studentId:'student-1',examId:'exam',generation:0,usedGeneration:0}]){
  const s=actionsDatabase();s.data.get('exam_attempts/'+s.attemptId).status='passed';s.data.set('exam_attempt_grants/student-1_exam',grant);assert.equal((await s.actions.startExam('exam','token')).ok,false);
 }
});
test('an administrative retake keeps normal freeze, timeout and owner protections',async()=>{
 const s=actionsDatabase();s.data.get('exam_attempts/'+s.attemptId).status='failed';s.data.set('exam_attempt_grants/student-1_exam',{studentId:'student-1',examId:'exam',generation:2,usedGeneration:1,grantedBy:'admin'});
 const start=await s.actions.startExam('exam','token');const input={attemptId:start.attemptId,examId:'exam',idToken:'token',answers:[{questionId:'q1',answerText:'a'}],reason:'window_blur'};
 assert.equal((await s.actions.saveExamDraft(input)).locked,true);assert.equal((await s.actions.startExam('exam','token')).locked,true);
 await s.actions.submitExam({...input,answers:[{questionId:'q1',answerText:'b'}]});assert.equal(s.data.get('exam_attempts/'+start.attemptId).score,2);
});
