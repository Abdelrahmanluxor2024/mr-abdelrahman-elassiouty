'use client';

import { useQuery } from '@tanstack/react-query';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { getCachedStudentProfile } from '@/lib/firebase/use-student-auth';

/* -------- client hooks (browser only) -------- */
export function useStudent() {
  return useQuery({
    queryKey: ['student', 'me'],
    queryFn: async () => {
      const cached = getCachedStudentProfile();
      const currentUser = auth.currentUser;
      const uid = currentUser?.uid || cached.id;

      if (!uid || uid === 'current-student') {
        return {
          id: cached.id,
          full_name: cached.fullName,
          phone: cached.phone,
          grade: cached.grade,
          wallet_balance: cached.walletBalance,
        };
      }

      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          const d = snap.data();
          return {
            id: uid,
            full_name: d.fullName || d.full_name || cached.fullName,
            phone: d.phone || cached.phone,
            grade: d.grade || cached.grade,
            wallet_balance: d.walletBalance || d.wallet_balance || 0,
          };
        }
      } catch (err) {
        console.warn('useStudent fetch fallback:', err);
      }

      return {
        id: cached.id,
        full_name: cached.fullName,
        phone: cached.phone,
        grade: cached.grade,
        wallet_balance: cached.walletBalance,
      };
    },
  });
}

export function useStudentResults() {
  return useQuery({
    queryKey: ['student', 'results'],
    queryFn: async () => {
      return [];
    },
  });
}

export async function fetchWalletBalance(): Promise<number> {
  const cached = getCachedStudentProfile();
  const currentUser = auth.currentUser;
  const uid = currentUser?.uid || cached.id;

  if (uid && uid !== 'current-student') {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const d = snap.data();
        return Number(d.walletBalance || d.wallet_balance || 0);
      }
    } catch (err) {
      console.warn('fetchWalletBalance fallback:', err);
    }
  }

  return Number(cached.walletBalance || 0);
}

export async function fetchUnreadCount(): Promise<number> {
  return 0;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async (): Promise<NotificationItem[]> => {
      return [];
    },
  });
}
