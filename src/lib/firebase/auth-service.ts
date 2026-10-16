import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './config';

// Convert phone to email format for Firebase Auth
export function phoneToFirebaseEmail(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/^00/, '+');
  return `${cleaned}@mr-ass.app`;
}

// ======================== REGISTER ========================
export async function registerWithPhone(data: {
  fullName: string;
  phone: string;
  password: string;
  parentPhone?: string;
  gender: string;
  governorate: string;
  school?: string;
  grade: string;
}): Promise<{ ok: true; uid: string; role: string } | { ok: false; error: string }> {
  const email = phoneToFirebaseEmail(data.phone);

  try {
    // Check if phone already exists in Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phone', '==', data.phone));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { ok: false, error: 'رقم الهاتف مسجل بالفعل، يرجى تسجيل الدخول' };
    }

    // Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(auth, email, data.password);
    const uid = cred.user.uid;

    const isAdmin = data.phone.trim() === '01064106070';
    const role = isAdmin ? 'admin' : 'student';

    // Save user profile to Firestore
    await setDoc(doc(db, 'users', uid), {
      uid,
      fullName: data.fullName,
      phone: data.phone,
      parentPhone: data.parentPhone || '',
      gender: data.gender,
      governorate: data.governorate,
      school: data.school || '',
      grade: data.grade,
      role,
      walletBalance: 0,
      avatarUrl: '',
      createdAt: new Date().toISOString()
    });

    return { ok: true, uid, role };
  } catch (err: any) {
    console.error('Register error:', err);
    if (err.code === 'auth/email-already-in-use') {
      return { ok: false, error: 'رقم الهاتف مسجل بالفعل، يرجى تسجيل الدخول' };
    }
    if (err.code === 'auth/weak-password') {
      return { ok: false, error: 'كلمة المرور ضعيفة، يجب أن تكون 6 أحرف على الأقل' };
    }
    return { ok: false, error: err.message || 'حدث خطأ غير متوقع' };
  }
}

// ======================== LOGIN ========================
export async function loginWithPhone(
  phone: string,
  password: string
): Promise<{ ok: true; uid: string; role: string } | { ok: false; error: string }> {
  const email = phoneToFirebaseEmail(phone);

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    // Get role from Firestore
    const userDoc = await getDoc(doc(db, 'users', uid));
    let role = userDoc.exists() ? (userDoc.data().role || 'student') : 'student';
    if (phone.trim() === '01064106070') {
      role = 'admin';
    }

    return { ok: true, uid, role };
  } catch (err: any) {
    console.error('Login error:', err);
    if (
      err.code === 'auth/wrong-password' ||
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/invalid-email'
    ) {
      return { ok: false, error: 'رقم الهاتف أو كلمة المرور غير صحيحة' };
    }
    if (err.code === 'auth/user-not-found') {
      return { ok: false, error: 'لا يوجد حساب بهذا الرقم، يرجى إنشاء حساب أولاً' };
    }
    if (err.code === 'auth/too-many-requests') {
      return { ok: false, error: 'تم حظر الجهاز مؤقتاً بسبب المحاولات الكثيرة، حاول بعد قليل' };
    }
    return { ok: false, error: err.message || 'حدث خطأ، يرجى المحاولة مرة أخرى' };
  }
}

// ======================== SIGN OUT ========================
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// ======================== GET CURRENT USER ========================
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// ======================== GET USER PROFILE ========================
export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data();
}
