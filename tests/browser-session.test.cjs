const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function browser(protocol = 'https:', blocked = false) {
  const jar = new Map(), writes = [];
  const document = {};
  Object.defineProperty(document, 'cookie', {
    get: () => [...jar].map(([key, value]) => `${key}=${value}`).join('; '),
    set: value => {
      writes.push(value);
      if (blocked) return;
      const [pair] = value.split(';'); const [name, ...rest] = pair.split('=');
      if (value.includes('max-age=0;')) jar.delete(name); else jar.set(name, rest.join('='));
    }
  });
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync('src/lib/firebase/browser-session.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(js, {exports, document, window: {location: {protocol}}, localStorage: {removeItem() {}}});
  return {...exports, writes, jar};
}
test('successful HTTPS login sets both cookies for embedded navigation', () => {
  const session = browser(); session.writeBrowserSession('student-1', 'student');
  assert.equal(session.jar.get('token'), 'student-1');
  assert.equal(session.jar.get('user_role'), 'student');
  session.writes.forEach(cookie => {assert.match(cookie, /SameSite=None; Secure/); assert.match(cookie, /path=\//);});
});
test('HTTP local development does not require secure cookies', () => {
  const session = browser('http:'); session.writeBrowserSession('student-1', 'student');
  session.writes.forEach(cookie => {assert.match(cookie, /SameSite=Lax/); assert.doesNotMatch(cookie, /Secure/);});
});
test('blocked cookies are an error rather than false login success', () => {
  const session = browser('https:', true);
  assert.throws(() => session.writeBrowserSession('student-1', 'student'), /المتصفح منع/);
});
test('student login defaults to the dashboard; admins still open admin', () => {
  const {getLoginDestination} = browser();
  assert.equal(getLoginDestination('student'), '/dashboard');
  assert.equal(getLoginDestination('admin', '/dashboard'), '/admin');
});
test('safe requested destination is retained', () => {
  assert.equal(browser().getLoginDestination('student', '/course/demo?tab=lessons'), '/course/demo?tab=lessons');
});
test('auth loops, admin-only destinations and external redirects are rejected', () => {
  const {getLoginDestination} = browser();
  for (const path of ['/login', '/login?next=/dashboard', '/register', '/admin', '/admin/exams', '//example.com', 'https://example.com', '/\\example.com', '/\nexample.com']) assert.equal(getLoginDestination('student', path), '/dashboard', path);
});
test('profile refresh keeps the same HTTPS cookie settings', () => {
  const session = browser(); session.writeBrowserSession('student-1', 'student'); session.writeBrowserSession('student-1', 'student');
  session.writes.forEach(cookie => assert.match(cookie, /SameSite=None; Secure/));
});
test('logout clears current and legacy routing hints', () => {
  const session = browser(); session.writeBrowserSession('student-1', 'student'); session.jar.set('session', 'stale');
  session.clearBrowserSession(); assert.equal(session.jar.size, 0);
});
