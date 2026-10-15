import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export interface StudentProfile {
  uid: string;
  full_name: string;
  phone: string;
  parent_phone?: string;
  gender?: string;
  governorate?: string;
  school?: string;
  grade?: string;
  role: string;
  wallet_balance: number;
  avatar_url?: string;
  created_at: string;
}

/**
 * Returns the current authenticated student from Firebase via cookie token.
 * Redirects to /login if not logged in.
 */
export async function getCurrentStudent(): Promise<StudentProfile> {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/login');
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', token));
    if (!userDoc.exists()) {
      redirect('/login');
    }
    const data = userDoc.data();
    return {
      uid: token,
      full_name: data.fullName || data.full_name || 'طالب',
      phone: data.phone || '',
      parent_phone: data.parentPhone || data.parent_phone || '',
      gender: data.gender || '',
      governorate: data.governorate || '',
      school: data.school || '',
      grade: data.grade || '',
      role: data.role || 'student',
      wallet_balance: data.walletBalance || data.wallet_balance || 0,
      avatar_url: data.avatarUrl || data.avatar_url || '',
      created_at: data.createdAt || data.created_at || new Date().toISOString(),
    };
  } catch (err) {
    console.error('getCurrentStudent error:', err);
    // Return a safe fallback student so dashboard doesn't crash
    return {
      uid: token,
      full_name: 'طالب',
      phone: '',
      role: 'student',
      wallet_balance: 0,
      created_at: new Date().toISOString(),
    };
  }
}

export async function getStudentById(id: string): Promise<StudentProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', id));
    if (!userDoc.exists()) return null;
    const data = userDoc.data();
    return {
      uid: id,
      full_name: data.fullName || data.full_name || 'طالب',
      phone: data.phone || '',
      role: data.role || 'student',
      wallet_balance: data.walletBalance || 0,
      avatar_url: data.avatarUrl || '',
      created_at: data.createdAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
