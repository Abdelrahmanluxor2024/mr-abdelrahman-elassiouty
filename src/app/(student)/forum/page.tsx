'use client';

import { useState, useTransition } from 'react';
import { useForumPosts } from '@/lib/queries/useForum';
import { useStudent } from '@/lib/queries/useStudent';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function ForumPage() {
  const { data: posts = [], isLoading } = useForumPosts();
  const { data: student } = useStudent();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [creating, startCreate] = useTransition();
  const qc = useQueryClient();

  function onCreate() {
    if (!title.trim() || !content.trim()) return;
    startCreate(async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('forum_posts').insert({
        student_id: user.user_metadata.student_id ?? user.id,
        title,
        content,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('تم نشر سؤالك');
      setTitle('');
      setContent('');
      qc.invalidateQueries({ queryKey: ['forum', 'posts'] });
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-brand-900">المنتدى</h1>
          <p className="mt-1 text-slate-600">اسأل، ناقش، وساعد زمايلك.</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-brand-600" />
            منشور جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="عنوان السؤال" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="اشرح سؤالك بالتفصيل..." value={content} onChange={(e) => setContent(e.target.value)} />
          <Button onClick={onCreate} disabled={creating}>
            {creating ? 'جاري النشر...' : 'نشر'}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="transition-shadow hover:shadow-blue-soft">
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  <h3 className="flex-1 font-bold text-slate-900">{p.title}</h3>
                  {p.is_answered && <Badge variant="success">تمت الإجابة</Badge>}
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">{p.content}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {p.replies_count} رد
                  </span>
                  <span>❤️ {p.likes_count}</span>
                  <span>{new Date(p.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
