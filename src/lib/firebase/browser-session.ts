// These cookies are routing hints only. Database permissions must use Firebase Auth.
export const PROFILE_STORAGE_KEY = 'mr_ass_student_profile';

function cookieOptions(protocol: string) {
  // The HTTPS preview may be embedded on another site. Lax cookies are not
  // sent on iframe navigation, which used to send successful logins back to /login.
  return `path=/; ${protocol === 'https:' ? 'SameSite=None; Secure' : 'SameSite=Lax'}`;
}

export function writeBrowserSession(uid: string, role: string) {
  const options = cookieOptions(window.location.protocol);
  document.cookie = `token=${encodeURIComponent(uid)}; max-age=2592000; ${options}`;
  document.cookie = `user_role=${role === 'admin' ? 'admin' : 'student'}; max-age=2592000; ${options}`;
  const cookies = new Map(document.cookie.split(';').map(cookie => {
    const [key, ...value] = cookie.trim().split('=');
    return [key, value.join('=')];
  }));
  if (cookies.get('token') !== encodeURIComponent(uid) || cookies.get('user_role') !== (role === 'admin' ? 'admin' : 'student')) {
    throw new Error('المتصفح منع حفظ جلسة الدخول. افتح المنصة في تبويب مستقل واسمح بملفات الارتباط ثم حاول مرة أخرى.');
  }
}

export function clearBrowserSession() {
  for (const name of ['token', 'user_role', 'role', 'firebaseToken', 'sb-access-token', 'session']) {
    document.cookie = `${name}=; max-age=0; ${cookieOptions(window.location.protocol)}`;
  }
  try { localStorage.removeItem(PROFILE_STORAGE_KEY); } catch { /* Storage can be disabled. */ }
}

export function getLoginDestination(role: string, nextPath?: string | null) {
  if (role === 'admin') return '/admin';
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//') || /[\\\s\u0000-\u001f]/.test(nextPath)) return '/dashboard';
  const pathname = nextPath.split(/[?#]/)[0];
  // Never return to auth pages or send a student to an admin-only route.
  if (['/login', '/register', '/admin'].some(path => pathname === path || pathname.startsWith(path + '/'))) return '/dashboard';
  return nextPath;
}
