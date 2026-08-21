'use client';

import Link from 'next/link';
import { useNotifications, useStudent } from '@/lib/queries/useStudent';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const { data: student } = useStudent();
  const qc = useQueryClient();

  async function markRead(id: string) {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-black text-brand-900">الإشعارات</h1>
      </header>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-slate-500">
            <Bell className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2">مفيش إشعارات.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                markRead(n.id);
                if (n.link) window.location.href = n.link;
              }}
              className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-right transition-colors ${
                n.is_read ? 'border-slate-100 bg-white' : 'border-brand-200 bg-brand-50/60'
              }`}
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900">{n.title}</p>
                <p className="text-sm text-slate-600">{n.message}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(n.created_at).toLocaleString('ar-EG')}</p>
              </div>
              {!n.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-brand-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
