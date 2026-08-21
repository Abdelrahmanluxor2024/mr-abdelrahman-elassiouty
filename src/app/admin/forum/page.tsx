'use client';

import { useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@supabase/ssr';
import { adminReplyToPost, deleteForumPost } from '@/app/actions/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { MessageSquare, Send, Trash2, CheckCircle2, User, Sparkles, Loader2 } from 'lucide-react';

export default function AdminForumPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const qc = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isPending, startTransition] = useTransition();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['admin', 'forum', 'posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_posts')
        .select('*, student:students(full_name, phone)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: replies = [], refetch: refetchReplies } = useQuery({
    queryKey: ['admin', 'forum', 'replies', selectedPost],
    enabled: !!selectedPost,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_replies')
        .select('*, student:students(full_name)')
        .eq('post_id', selectedPost!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  function handleSendReply() {
    if (!selectedPost || !replyText.trim()) return;
    startTransition(async () => {
      const res = await adminReplyToPost({ postId: selectedPost, content: replyText.trim() });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('تم إرسال رد المستر بنجاح');
      setReplyText('');
      await refetchReplies();
      qc.invalidateQueries({ queryKey: ['admin', 'forum', 'posts'] });
    });
  }

  function handleDelete(postId: string) {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    startTransition(async () => {
      const res = await deleteForumPost(postId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('تم حذف السؤال');
      if (selectedPost === postId) setSelectedPost(null);
      qc.invalidateQueries({ queryKey: ['admin', 'forum', 'posts'] });
    });
  }

  if (isLoading) return <Skeleton className="h-96 w-full rounded-3xl" />;

  const currentPost = posts.find((p: any) => p.id === selectedPost);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="font-display text-2xl font-black text-slate-900 dark:text-white">
          المنتدى والرد على أسئلة الطلاب 💬
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          يمكنك هنا متابعة كافة أسئلة واستفسارات الطلاب في المنتدى والرد عليها مباشرة بصفتك المستر.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Posts List */}
        <div className="space-y-3 lg:col-span-1">
          <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>أسئلة الطلاب ({posts.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
              {posts.map((p: any) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPost(p.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    selectedPost === p.id
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 shadow-sm'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {p.title}
                    </p>
                    <Badge variant={p.is_answered ? 'success' : 'outline'} className="text-[10px] shrink-0 font-bold">
                      {p.is_answered ? 'تم الرد ✅' : 'جديد'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {p.content}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                    <span>{p.student?.full_name ?? 'طالب'}</span>
                    <span>{new Date(p.created_at).toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>
              ))}

              {posts.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-8">لا توجد أسئلة بعد في المنتدى</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Post & Reply Panel */}
        <div className="space-y-4 lg:col-span-2">
          {currentPost ? (
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A] shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-black text-slate-900 dark:text-white">
                      {currentPost.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      طرحه الطالب: <span className="font-bold text-blue-600 dark:text-cyan-400">{currentPost.student?.full_name}</span> ({currentPost.student?.phone})
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(currentPost.id)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4 ms-1" />
                    حذف السؤال
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-6">
                {/* Question Details */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {currentPost.content}
                </div>

                {/* Replies Thread */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    الردود والمناقشة ({replies.length})
                  </h3>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto p-1">
                    {replies.map((r: any) => (
                      <div
                        key={r.id}
                        className={`p-3.5 rounded-2xl border ${
                          r.is_admin_reply
                            ? 'border-blue-500/40 bg-gradient-to-r from-blue-50 to-cyan-50/50 dark:from-blue-950/60 dark:to-cyan-950/40'
                            : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black flex items-center gap-1.5">
                            {r.is_admin_reply ? (
                              <>
                                <span className="bg-blue-600 text-white px-2 py-0.5 rounded-md text-[10px]">المستر</span>
                                <span className="text-blue-700 dark:text-cyan-300">مستر عبدالرحمن الأسيوطي</span>
                              </>
                            ) : (
                              <span className="text-slate-700 dark:text-slate-300">{r.student?.full_name ?? 'طالب'}</span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(r.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                          {r.content}
                        </p>
                      </div>
                    ))}

                    {replies.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">لم يتم إضافة ردود على هذا السؤال بعد.</p>
                    )}
                  </div>
                </div>

                {/* Admin Reply Box */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-cyan-400">
                    <Sparkles className="h-4 w-4" />
                    <span>كتابة رد المستر الرسمي:</span>
                  </div>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب إجابة المستر التوضيحية للطالب هنا..."
                    className="min-h-[90px] rounded-2xl border-slate-200 dark:border-slate-800 text-sm"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSendReply}
                      disabled={isPending || !replyText.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-xl shadow-md shadow-blue-600/20"
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin ms-1" /> : <Send className="h-4 w-4 ms-1" />}
                      إرسال الرد للطالب
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid place-items-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A] py-24 text-center">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="font-bold text-slate-600 dark:text-slate-400">اختر سؤالاً من القائمة الجانبية لعرضه والرد عليه</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
