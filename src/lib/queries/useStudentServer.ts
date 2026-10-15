import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export interface StudentProfile {
  id: string;
  full_name: string;
  phone: string;
  wallet_balance: number;
  avatar_url?: string | null;
  grade?: string;
  governorate?: string;
  school?: string;
  role?: string;
}

export async function getCurrentStudent(): Promise<StudentProfile> {
  const cookieStore = cookies();
  const token =
    cookieStore.get('token')?.value ||
    cookieStore.get('firebaseToken')?.value ||
    cookieStore.get('session')?.value;

  if (!token) {
    redirect('/login');
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', token));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        id: token,
        full_name: data.fullName || data.full_name || 'طالب المنصة',
        phone: data.phone || '',
        wallet_balance: data.walletBalance || data.wallet_balance || 0,
        avatar_url: data.avatarUrl || data.avatar_url || null,
        grade: data.grade || '2nd_bac',
        governorate: data.governorate || 'القاهرة',
        school: data.school || '',
        role: data.role || 'student',
      };
    }
  } catch (err) {
    console.warn('Error reading user profile from Firebase:', err);
  }

  // Fallback profile if user document is being created
  return {
    id: token,
    full_name: 'طالب المنصة',
    phone: '',
    wallet_balance: 0,
    avatar_url: null,
    grade: '2nd_bac',
    governorate: 'القاهرة',
    school: '',
    role: 'student',
  };
}

export async function getStudentById(id: string): Promise<StudentProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', id));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        id,
        full_name: data.fullName || data.full_name || 'طالب المنصة',
        phone: data.phone || '',
        wallet_balance: data.walletBalance || data.wallet_balance || 0,
        avatar_url: data.avatarUrl || data.avatar_url || null,
        grade: data.grade || '2nd_bac',
        governorate: data.governorate || 'القاهرة',
        school: data.school || '',
        role: data.role || 'student',
      };
    }
  } catch (err) {
    console.warn('Error reading user profile by ID from Firebase:', err);
  }
  return null;
}
