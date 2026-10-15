'use client';

import { useQuery } from '@tanstack/react-query';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  return document.cookie
    .split('; ')
    .find(r => r.startsWith('token='))
    ?.split('=')[1] || null;
}

export function useStudent() {
  return useQuery({
    queryKey: ['student', 'me'],
    queryFn: async () => {
      const token = getTokenFromCookie();
      if (!token) throw new Error('UNAUTHORIZED');
      const snap = await getDoc(doc(db, 'users', token));
      if (!snap.exists()) throw new Error('NOT_FOUND');
      const data = snap.data();
      return {
        id: token,
        uid: token,
        full_name: data.fullName || data.full_name || 'طالب',
        phone: data.phone || '',
        wallet_balance: data.walletBalance || data.wallet_balance || 0,
        role: data.role || 'student',
        avatar_url: data.avatarUrl || data.avatar_url || null,
        grade: data.grade || '',
        governorate: data.governorate || '',
      };
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentResults() {
  return useQuery({
    queryKey: ['student', 'results'],
    queryFn: async () => {
      const token = getTokenFromCookie();
      if (!token) return [];
      // Firebase: get exam attempts
      const { getDocs, collection, query, where, orderBy, limit } = await import('firebase/firestore');
      const q = query(
        collection(db, 'exam_attempts'),
        where('studentId', '==', token),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    retry: false,
  });
}

export async function fetchWalletBalance(): Promise<number> {
  const token = getTokenFromCookie();
  if (!token) return 0;
  try {
    const snap = await getDoc(doc(db, 'users', token));
    if (!snap.exists()) return 0;
    return Number(snap.data().walletBalance || snap.data().wallet_balance || 0);
  } catch {
    return 0;
  }
}

export async function fetchUnreadCount(): Promise<number> {
  return 0; // Will be implemented with Firebase notifications later
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async () => [],
    retry: false,
  });
}
