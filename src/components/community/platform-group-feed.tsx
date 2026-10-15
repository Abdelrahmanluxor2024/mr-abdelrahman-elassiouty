'use client';

import { useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, Heart, Send, MessageCircle, Sparkles, Pin } from 'lucide-react';
import { addCommunityComment, likeCommunityPost } from '@/app/actions/community';
import Image from 'next/image';

export function PlatformGroupFeed() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const qc = useQueryClient();
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [pendingPostId, setPendingPostId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['platform_group_feed'],
    queryFn: async () => {
      const { data } = await supabase
        .from('forum_posts')
        .select('*, replies:forum_replies(*, student:students(*)), student:students(*)')
        .ilike('title', '%[جروب المنصة]%')
        .order('created_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  async function handleLike(postId: string) {
    if (likedPosts[postId]) return;
    setLikedPosts((p) => ({ ...p, [postId]: true }));
    const res = await likeCommunityPost(postId);
    if (res.ok) {
      qc.invalidateQueries({ queryKey: ['platform_group_feed'] });
    }
  }

  async function handleAddComment(postId: string) {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    setPendingPostId(postId);
    const res = await addCommunityComment({ postId, commentText: text });
    setPendingPostId(null);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success('تمت إضافة تعليقك بنجاح');
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    qc.invalidateQueries({ queryKey: ['platform_group_feed'] });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-44 w-full rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-[#0E172A]/50 backdrop-blur-md p-8 text-center">
        <MessageSquare className="mx-auto h-10 w-10 text-blue-500/60 mb-2" />
        <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">جروب المنصة الرسمي</h3>
        <p className="text-xs text-slate-500 mt-1">
          ترقبوا منشورات وتوجيهات وتحديات مستر عبدالرحمن الأسيوطي هنا قريباً!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Feed Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              جروب المنصة الرسمي 📢
              <Badge className="bg-blue-600/10 text-blue-600 dark:text-cyan-300 border-blue-500/20 text-[10px] px-2 py-0.5">
                منشورات المستر الحصرية
              </Badge>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              توجيهات، مسابقات، ومناقشات تفاعلية بين المستر والطلاب
            </p>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-6">
        {posts.map((post: any) => {
          const imgMatch = post.content.match(/\[IMG\](.*?)\[\/IMG\]/);
          const cleanText = post.content.replace(/\[IMG\].*?\[\/IMG\]/g, '').trim();
          const cleanTitle = post.title.replace('📢 [جروب المنصة]:', '').trim();
          const replies = post.replies ?? [];

          return (
            <Card
              key={post.id}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0E172A] shadow-md shadow-slate-200/20 dark:shadow-none overflow-hidden transition hover:border-blue-500/40"
            >
              {/* Teacher Header */}
              <CardHeader className="bg-slate-50/75 dark:bg-slate-900/50 p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="relative h-12 w-12 shrink-0 rounded-2xl overflow-hidden border-2 border-blue-500/40 bg-black shadow-md">
                    <Image
                      src="/images/teacher-hero.jpg"
                      alt="مستر عبدالرحمن الأسيوطي"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-white text-base">مستر عبدالرحمن الأسيوطي</p>
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white">
                        المعلم 👨‍🏫
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">
                      {new Date(post.created_at).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400">
                  <Pin className="h-4 w-4" />
                </div>
              </CardHeader>

              {/* Content */}
              <CardContent className="p-5 sm:p-6 space-y-4">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {cleanTitle}
                </h3>

                <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-line">
                  {cleanText}
                </p>

                {/* Attached Image */}
                {imgMatch && (
                  <div className="relative max-h-[480px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgMatch[1]}
                      alt="مرفق المنشور"
                      className="max-h-[480px] w-full object-contain mx-auto"
                    />
                  </div>
                )}

                {/* Post Actions (Like & Comment Counters) */}
                <div className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                      likedPosts[post.id]
                        ? 'text-red-500 bg-red-50 dark:bg-red-950/50'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${likedPosts[post.id] ? 'fill-red-500 text-red-500' : ''}`} />
                    <span>{post.likes_count || 0} إعجاب</span>
                  </button>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400">
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                    <span>{replies.length} تعليق</span>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-3 pt-2 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                  {/* Write Comment Box */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="اكتب تعليقك أو استفسارك على منشور المستر..."
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(post.id);
                      }}
                      className="text-xs bg-white dark:bg-slate-900 rounded-xl"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddComment(post.id)}
                      disabled={pendingPostId === post.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs px-3 font-bold shrink-0"
                    >
                      <Send className="h-3.5 w-3.5 ms-1" />
                      تعليق
                    </Button>
                  </div>

                  {/* List of Student Comments */}
                  {replies.length > 0 && (
                    <div className="space-y-2 pt-2 divide-y divide-slate-100 dark:divide-slate-800">
                      {replies.map((rep: any) => (
                        <div key={rep.id} className="pt-2 text-xs flex items-start gap-2.5">
                          <div className="h-7 w-7 shrink-0 rounded-xl overflow-hidden bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-cyan-300 grid place-items-center font-bold text-[11px]">
                            {rep.student?.full_name?.[0] || 'ط'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-slate-900 dark:text-white">
                                {rep.student?.full_name || 'طالب متميز'}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(rep.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                              {rep.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
