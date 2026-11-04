'use server';

import { initializeServerApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { headers } from 'next/headers';
import { firebaseConfig } from '@/lib/firebase/config';
import { purchaseInTransaction } from '@/lib/firebase/course-payment';

export async function buyCourse(courseId: string, idToken?: string): Promise<{ok: boolean; error?: string; alreadyEnrolled?: boolean; charged?: number}> {
  if (!idToken) return {ok: false, error: 'يجب تسجيل الدخول أولاً'};
  try {
    const app = initializeServerApp(firebaseConfig, {authIdToken: idToken, releaseOnDeref: headers()});
    const auth = getAuth(app);
    await auth.authStateReady();
    if (!auth.currentUser) return {ok: false, error: 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى'};
    const result = await purchaseInTransaction(getFirestore(app), auth.currentUser.uid, courseId);
    return {ok: true, ...result};
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return {ok: false, error: /permission|unavailable|network|offline|internal/i.test(message) ? 'لم يتم تأكيد الشراء. تحقق من الاتصال وصلاحيات المحفظة؛ الكورس لن يُفتح قبل نجاح العملية' : message || 'تعذر إتمام الشراء. حاول مرة أخرى'};
  }
}
