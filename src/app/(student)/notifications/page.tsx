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
        <Skeleton className="h-32 w-full rounded-3xl" />
      ) : !data || data.length === 0 ? (
        <Card className="rounded-3xl border border-slate-200 dark:border-slate-800">
          <CardContent className="p-10 text-center text-slate-500">
            <Bell className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-semibold">لا توجد إشعارات جديدة حالياً.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((n) => {
            const hasImage = n.link?.startsWith('image:') ? n.link.replace('image:', '') : null;
            const linkUrl = n.link && !n.link.startsWith('image:') ? n.link : null;

            return (
              <div
                key={n.id}
                onClick={() => {
                  markRead(n.id);
                  if (linkUrl) window.location.href = linkUrl;
                }}
                className={`flex flex-col sm:flex-row items-start gap-4 rounded-3xl border p-5 text-right transition-all ${
                  n.is_read
                    ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A]'
                    : 'border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/30 shadow-md shadow-blue-500/5'
                }`}
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-cyan-400 font-bold">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 dark:text-white text-base">{n.title}</p>
                    {!n.is_read && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        جديد
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{n.message}</p>
                  
                  {/* Attached Image */}
                  {hasImage && (
                    <div className="mt-3 relative max-h-72 w-full max-w-md rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={hasImage} alt="مرفق الإشعار" className="max-h-72 w-full object-contain" />
                    </div>
                  )}

                  <p className="mt-1 text-[11px] text-slate-400">{new Date(n.created_at).toLocaleString('ar-EG')}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
