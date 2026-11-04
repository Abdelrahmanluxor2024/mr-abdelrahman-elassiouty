const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, mocks, extra = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText, {exports, require: id => {if (!(id in mocks)) throw new Error(id); return mocks[id];}, console, ...extra});
  return exports;
}
function database({balance = 250, price = 200, free = false, fail = false} = {}) {
  const data = new Map([
    ['courses/course', {title: 'Test', price, is_free: free, isFree: free, is_published: true}],
    ['users/student', {walletBalance: balance}]
  ]);
  let writes = 0, lock = Promise.resolve();
  const ref = (_, name, id) => ({id, key: `${name}/${id}`});
  const snapshot = r => ({id: r.id, exists: () => data.has(r.key), data: () => structuredClone(data.get(r.key))});
  const firestore = {
    doc: ref, getDoc: async r => snapshot(r), collection: (_, name) => ({name}),
    getDocs: async collection => {const docs = [...data.keys()].filter(key => key.startsWith(collection.name + '/')).map(key => snapshot({key, id: key.split('/')[1]})); return {docs, empty: !docs.length, size: docs.length};},
    runTransaction: (_, cb) => {
      const execute = async () => {
        const pending = new Map();
        const result = await cb({get: async r => snapshot(r), set: (r, row) => pending.set(r.key, row), update: (r, row) => pending.set(r.key, {...data.get(r.key), ...row})});
        if (fail) throw new Error('commit unavailable');
        for (const [key, row] of pending) {data.set(key, row); writes++;}
        return result;
      };
      const result = lock.then(execute); lock = result.catch(() => {}); return result;
    },
    writeBatch: () => {
      const pending = [];
      return {set: (r, row) => pending.push([r.key, row]), delete: r => pending.push([r.key, null]), commit: async () => {if (fail) throw new Error('commit failed'); pending.forEach(([key,row]) => {writes++; if (row) data.set(key, row); else data.delete(key);});}};
    }
  };
  const mocks = {'firebase/firestore': firestore};
  const payment = load('src/lib/firebase/course-payment.ts', mocks);
  return {data, firestore, payment, writes: () => writes, mocks};
}
test('positive price overrides BOTH stale free flags', async () => {
  const s = database({free: true});
  assert.equal(s.payment.coursePrice(s.data.get('courses/course')), 200);
  assert.equal(await s.payment.hasCourseAccess({}, 'student', 'course'), false);
  await s.payment.purchaseInTransaction({}, 'student', 'course');
  assert.equal(s.data.get('users/student').walletBalance, 50);
  assert.equal(await s.payment.hasCourseAccess({}, 'student', 'course'), true);
});
test('insufficient balance never creates enrollment or receipt', async () => {
  const s = database({balance: 199});
  await assert.rejects(s.payment.purchaseInTransaction({}, 'student', 'course'), /اشحن/);
  assert.equal(s.writes(), 0); assert.equal(s.data.get('users/student').walletBalance, 199);
  assert.equal(await s.payment.hasCourseAccess({}, 'student', 'course'), false);
});
test('exact balance is deducted to zero with one completed receipt', async () => {
  const s = database({balance: 200}); await s.payment.purchaseInTransaction({}, 'student', 'course');
  assert.equal(s.data.get('users/student').walletBalance, 0);
  assert.equal(s.data.get('wallet_transactions/student_course').amount, 200);
  assert.equal(s.data.get('enrollments/student_course').paymentStatus, 'completed');
});
test('repeat and concurrent clicks charge only once', async () => {
  const s = database(); const results = await Promise.all(Array.from({length: 5}, () => s.payment.purchaseInTransaction({}, 'student', 'course')));
  assert.equal(results.filter(r => !r.alreadyEnrolled).length, 1);
  assert.equal(s.data.get('users/student').walletBalance, 50); assert.equal(s.writes(), 3);
});
test('failed atomic commit leaves balance, receipt and enrollment unchanged', async () => {
  const s = database({fail: true}); await assert.rejects(s.payment.purchaseInTransaction({}, 'student', 'course'));
  assert.equal(s.writes(), 0); assert.equal(s.data.get('users/student').walletBalance, 250);
  assert.equal(s.data.has('enrollments/student_course'), false); assert.equal(s.data.has('wallet_transactions/student_course'), false);
});
test('legacy or forged enrollment without a matching debit does not unlock paid content', async () => {
  const s = database(); s.data.set('enrollments/student_course', {studentId: 'student', courseId: 'course', paymentStatus: 'completed', transactionId: 'student_course', paidAmount: 200});
  assert.equal(await s.payment.hasCourseAccess({}, 'student', 'course'), false);
  s.data.set('wallet_transactions/student_course', {studentId: 'other', courseId: 'course', amount: 200, balanceBefore: 250, balanceAfter: 50, status: 'completed', type: 'debit'});
  assert.equal(await s.payment.hasCourseAccess({}, 'student', 'course'), false);
});
test('price changes after a real purchase do not charge the same buyer again', async () => {
  const s = database(); await s.payment.purchaseInTransaction({}, 'student', 'course');
  s.data.get('courses/course').price = 300;
  assert.equal(await s.payment.hasCourseAccess({}, 'student', 'course'), true);
  assert.equal((await s.payment.purchaseInTransaction({}, 'student', 'course')).alreadyEnrolled, true);
  assert.equal(s.data.get('users/student').walletBalance, 50);
});
test('invalid, absent, negative, NaN and sub-cent prices fail closed', () => {
  const {payment} = database();
  for (const price of [undefined, null, '', ' ', -1, 'abc', Infinity, NaN, 0.001]) assert.throws(() => payment.coursePrice({price, isFree: true}));
  assert.throws(() => payment.coursePrice({price: 0, isFree: false}));
});
test('genuine explicit free course charges nothing; unpublished course cannot be purchased', async () => {
  const s = database({price: 0, free: true}); await s.payment.purchaseInTransaction({}, 'student', 'course');
  assert.equal(s.data.get('users/student').walletBalance, 250);
  assert.equal(s.data.has('wallet_transactions/student_course'), false);
  s.data.get('courses/course').is_published = false;
  assert.equal(await s.payment.hasCourseAccess({}, 'student', 'course'), false);
  await assert.rejects(s.payment.purchaseInTransaction({}, 'student', 'course'));
});
function resetFixture({admin = true, fail = false} = {}) {
  const s = database({fail});
  s.data.set('users/admin', {role: admin ? 'admin' : 'student'});
  s.data.set('lessons/old', {courseId: 'course'}); s.data.set('questions/old', {examId: 'old'}); s.data.set('exams/old', {courseId: 'course'});
  s.data.set('wallet_transactions/keep', {amount: 200}); s.data.set('exam_attempts/keep', {score: 5});
  let downloads = 0;
  const demo = load('src/lib/firebase/demo-course.ts', {...s.mocks, './config': {db: {}, auth: {authStateReady: async () => {}, currentUser: {uid: 'admin'}}}}, {
    Blob, URL: {createObjectURL: () => 'blob:backup', revokeObjectURL() {}}, document: {createElement: () => ({click() {downloads++;}})}, setTimeout: () => {}
  });
  return {...s, demo, downloads: () => downloads};
}
test('admin reset atomically replaces old content with 200 EGP bundle, preserving wallets and history', async () => {
  const s = resetFixture(); await s.demo.replaceCatalogWithPaidDemo();
  assert.equal(s.downloads(), 1); assert.equal(s.data.has('courses/course'), false); assert.equal(s.data.has('lessons/old'), false);
  assert.equal(s.data.get('courses/' + s.demo.DEMO_COURSE_ID).price, 200);
  assert.equal([...s.data.keys()].filter(k => k.startsWith('courses/')).length, 1);
  assert.equal(s.data.get('users/student').walletBalance, 250);
  assert.ok(s.data.has('wallet_transactions/keep')); assert.ok(s.data.has('exam_attempts/keep'));
});
test('non-admin reset denied without deletion', async () => {
  const s = resetFixture({admin: false}); await assert.rejects(s.demo.replaceCatalogWithPaidDemo()); assert.equal(s.writes(), 0); assert.equal(s.downloads(), 0);
});
test('failed catalog reset preserves every old document', async () => {
  const s = resetFixture({fail: true}); await assert.rejects(s.demo.replaceCatalogWithPaidDemo());
  assert.ok(s.data.has('courses/course')); assert.ok(s.data.has('lessons/old')); assert.equal(s.writes(), 0);
});
test('the reported 150 EGP/stale-free regression still debits 150', async () => {
  const s = database({price: 150, free: true, balance: 200});
  const result = await s.payment.purchaseInTransaction({}, 'student', 'course');
  assert.equal(result.charged, 150); assert.equal(s.data.get('users/student').walletBalance, 50);
});
test('oversized catalog refuses reset without any partial deletion or download', async () => {
  const s = resetFixture();
  for (let i = 0; i < 450; i++) s.data.set('questions/old-' + i, {examId: 'old'});
  await assert.rejects(s.demo.replaceCatalogWithPaidDemo(), /حد الاستبدال الآمن/);
  assert.ok(s.data.has('courses/course')); assert.equal(s.writes(), 0); assert.equal(s.downloads(), 0);
});
test('server purchase requires token and derives buyer identity from verified auth', async () => {
  let buyer;
  const action = load('src/app/actions/course-purchase.ts', {
    'firebase/app': {initializeServerApp: (_, options) => {assert.equal(options.authIdToken, 'verified-token'); return {}; }},
    'firebase/auth': {getAuth: () => ({authStateReady: async () => {}, currentUser: {uid: 'actual-buyer'}})},
    'firebase/firestore': {getFirestore: () => ({})},
    'next/headers': {headers: () => ({})},
    '@/lib/firebase/config': {firebaseConfig: {}},
    '@/lib/firebase/course-payment': {purchaseInTransaction: async (_, uid, courseId) => {buyer = uid; assert.equal(courseId, 'course'); return {alreadyEnrolled: false, charged: 200};}}
  });
  assert.equal((await action.buyCourse('course')).ok, false);
  assert.equal((await action.buyCourse('course', 'verified-token')).ok, true);
  assert.equal(buyer, 'actual-buyer');
});
