'use client';

import Link from 'next/link';
import { useLiveSessions } from '@/lib/queries/useForum';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Radio, Calendar, ExternalLink } from 'lucide-react';

export default function LivePage() {
  const { data: sessions = [] } = useLiveSessions();
  const upcoming = sessions.filter((s) => s.status === 'scheduled' || s.status === 'live');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-black text-brand-900">البث المباشر</h1>
        <p className="mt-1 text-slate-600">تابع محاضرات لايف مع مستر عبدالرحمن الأسيوطي.</p>
      </header>

      {upcoming.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-slate-500">
            مفيش لايفات مجدولة حالياً. تابعنا عشان أول ما يتحدد ميعاد هنبعتلك إشعار.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {upcoming.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant={s.status === 'live' ? 'error' : 'secondary'}>
                    {s.status === 'live' ? '🔴 لايف دلوقتي' : 'قريباً'}
                  </Badge>
                </div>
                <CardTitle>{s.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {s.description && <p className="text-sm text-slate-600">{s.description}</p>}
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(s.scheduled_at).toLocaleString('ar-EG')}
                </p>
                {s.stream_url && (
                  <Button asChild className="w-full">
                    <Link href={s.stream_url} target="_blank" rel="noreferrer">
                      <Radio className="h-4 w-4" />
                      انضم للبث
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
