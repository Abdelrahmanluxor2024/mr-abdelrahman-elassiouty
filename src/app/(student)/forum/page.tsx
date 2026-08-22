'use client';

import { useState, useTransition } from 'react';
import { useForumPosts, useForumReplies } from '@/lib/queries/useForum';
import { useStudent } from '@/lib/queries/useStudent';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Plus, Send, ChevronDown, ChevronUp, Sparkles, CheckCircle2, User, Loader2, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { ForumPost } from '@/types/supabase';

export default function ForumPage() {
  const { data: posts = [], isLoading } = useForumPosts();
  const { data: student } = useStudent();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
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
        student_id: user.id,
        title: title.trim(),
        content: content.trim(),
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('تم نشر سؤالك في المنتدى بنجاح 🎉');
      setTitle('');
      setContent('');
      qc.invalidateQueries({ queryKey: ['forum', 'posts'] });
    });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0E172A] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>المنتدى والأسئلة</span>
            <span className="text-xl">💬</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            اطرح سؤالك هنا وهيتم الرد عليك مباشرة من مستر عبدالرحمن وفريق العمل.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-xl border-blue-500/30 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 font-bold px-3 py-1.5 text-xs">
            {posts.length} سؤال متاح
          </Badge>
        </div>
      </header>

      {/* New Question Form */}
      <Card className="rounded-3xl border border-blue-500/20 bg-white dark:bg-[#0E172A] shadow-md">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Plus className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
            اطرح سؤالاً أو استفساراً جديداً
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <Input 
            placeholder="عنوان السؤال باختصار (مثال: سؤال بخصوص شروط if في بايثون)" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            className="rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-sm"
          />
          <Textarea 
            placeholder="اشرح سؤالك بالتفصيل، واكتب كودك أو المشكلة التي واجهتك..." 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            className="min-h-[100px] rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-sm leading-relaxed"
          />
          <div className="flex justify-end">
            <Button 
              onClick={onCreate} 
              disabled={creating || !title.trim() || !content.trim()}
              className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-md shadow-blue-600/20"
            >
              {creating ? <><Loader2 className="h-4 w-4 animate-spin ms-2" /> جاري النشر...</> : 'نشر السؤال'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questions Feed */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              isExpanded={expandedPostId === post.id}
              onToggle={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
            />
          ))}

          {posts.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-[#0E172A] rounded-3xl border border-slate-100 dark:border-slate-800">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">لا توجد أسئلة بعد. كن أول من يطرح سؤالاً!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PostCard({ 
  post, 
  isExpanded, 
  onToggle 
}: { 
  post: ForumPost; 
  isExpanded: boolean; 
  onToggle: () => void; 
}) {
  const { data: replies = [], refetch } = useForumReplies(isExpanded ? post.id : '');
  const [replyText, setReplyText] = useState('');
  const [sending, startSend] = useTransition();
  const qc = useQueryClient();

  function onSendReply() {
    if (!replyText.trim()) return;
    startSend(async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('forum_replies').insert({
        post_id: post.id,
        student_id: user.id,
        content: replyText.trim(),
        is_admin_reply: false,
      });

      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('تمت إضافة ردك');
      setReplyText('');
      await refetch();
      qc.invalidateQueries({ queryKey: ['forum', 'posts'] });
    });
  }

  return (
    <Card className={cn(
      "rounded-3xl transition-all border overflow-hidden",
      isExpanded 
        ? "border-blue-500/40 bg-white dark:bg-[#0E172A] shadow-lg shadow-blue-500/10" 
        : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0E172A] hover:border-blue-300 dark:hover:border-blue-800 shadow-sm"
    )}>
      {/* Clickable Header */}
      <div 
        onClick={onToggle}
        className="p-5 cursor-pointer select-none transition hover:bg-slate-50/50 dark:hover:bg-slate-900/40"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                {post.title}
              </h3>
              {post.is_answered ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 px-3 py-0.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  تم الرد من المعلم ✅
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                  قيد الانتظار
                </span>
              )}
            </div>
            <p className={cn("text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed", !isExpanded && "line-clamp-2")}>
              {post.content}
            </p>
          </div>

          <div className="shrink-0 pt-1 text-slate-400">
            {isExpanded ? <ChevronUp className="h-5 w-5 text-blue-600" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>

        {/* Footer Meta */}
        <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-cyan-400">
              <MessageSquare className="h-4 w-4" />
              {post.replies_count ?? 0} {post.replies_count === 1 ? 'رد' : 'ردود'}
            </span>
            <span>{new Date(post.created_at).toLocaleDateString('ar-EG')}</span>
          </div>

          <span className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline">
            {isExpanded ? 'إخفاء الردود' : 'عرض رد المعلم والمناقشة ←'}
          </span>
        </div>
      </div>

      {/* Expanded Thread & Replies */}
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#070B14] p-5 space-y-4">
          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            الردود وإجابات المستر:
          </h4>

          {/* List of Replies */}
          <div className="space-y-3">
            {replies.map((r: any) => (
              <div
                key={r.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all",
                  r.is_admin_reply
                    ? "border-blue-500/50 bg-gradient-to-tr from-blue-900/30 via-indigo-950/40 to-cyan-950/30 bg-blue-50/80 shadow-md shadow-blue-500/10"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A]"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {r.is_admin_reply ? (
                      <div className="flex items-center gap-1.5">
                        <span className="grid h-6 w-6 place-items-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-sm">
                          👑
                        </span>
                        <span className="font-black text-xs sm:text-sm text-blue-700 dark:text-cyan-300">
                          مستر عبدالرحمن الأسيوطي (المعلم)
                        </span>
                        <span className="rounded-md bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5">
                          رد رسمي
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                          {r.student?.full_name ?? 'طالب'}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(r.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
                  {r.content}
                </p>
              </div>
            ))}

            {replies.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-400">
                لم تتم إضافة أي ردود بعد. سيقوم المستر بالرد قريباً! ⏳
              </div>
            )}
          </div>

          {/* Add Reply Input */}
          <div className="pt-2 space-y-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="اكتب تعليقاً أو استفساراً إضافياً هنا..."
              className="min-h-[75px] rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A] text-xs sm:text-sm"
            />
            <div className="flex justify-end">
              <Button
                onClick={onSendReply}
                disabled={sending || !replyText.trim()}
                size="sm"
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-4"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin ms-1" /> : <Send className="h-3.5 w-3.5 ms-1" />}
                إرسال التعليق
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

