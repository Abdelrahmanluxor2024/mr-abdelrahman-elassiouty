'use client';

import { useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MessageSquare, Upload, Send, Trash2, Heart, MessageCircle } from 'lucide-react';
import { createTeacherCommunityPost, deleteForumPost } from '@/app/actions/admin';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminCommunityPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [pending, startTransition] = useTransition();

  const { data: posts = [] } = useQuery({
    queryKey: ['platform_group_posts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('forum_posts')
        .select('*, replies:forum_replies(*, student:students(*)), student:students(*)')
        .ilike('title', '%[جروب المنصة]%')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  function onPublish() {
    if (!title.trim() || !content.trim()) {
      toast.error('يرجى كتابة عنوان وتفاصيل المنشور');
      return;
    }

    startTransition(async () => {
      const res = await createTeacherCommunityPost({
        title,
        content,
        imageUrl: imageUrl.trim() || undefined,
      });

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success('تم نشر البوست على جروب المنصة بنجاح 🎉');
      setTitle('');
      setContent('');
      setImageUrl('');
      qc.invalidateQueries({ queryKey: ['platform_group_posts'] });
    });
  }

  async function onDelete(postId: string) {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;
    const res = await deleteForumPost(postId);
    if (res.ok) {
      toast.success('تم حذف المنشور');
      qc.invalidateQueries({ queryKey: ['platform_group_posts'] });
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="font-display text-2xl font-black text-brand-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-blue-600 dark:text-cyan-400" />
          جروب المنصة (منشورات المستر)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          انشر التحديثات والتحديات والأسئلة للطلاب على الصفحة الرئيسية، مع إمكانية تلقي تعليقات الطلاب والرد عليها.
        </p>
      </div>

      {/* Create New Teacher Post */}
      <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">نشر بوست جديد على جروب المنصة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="font-bold text-slate-800 dark:text-slate-200">عنوان المنشور</Label>
            <Input
              placeholder="مثال: مسابقة برمجية جديدة وجوائز للمراكز الأولى 🏆"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 rounded-2xl"
            />
          </div>

          <div>
            <Label className="font-bold text-slate-800 dark:text-slate-200">محتوى المنشور</Label>
            <Textarea
              placeholder="اكتب رسالتك وتوجيهاتك لطلاب المنصة هنا..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1.5 min-h-[140px] text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 rounded-2xl leading-relaxed"
            />
          </div>

          {/* Image Attachment */}
          <div className="space-y-2">
            <Label className="font-bold text-slate-800 dark:text-slate-200">إرفاق صورة مع البوست (اختياري)</Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:from-blue-500 transition">
                <Upload className="h-4 w-4" />
                <span>اختر صورة من جهاز الكمبيوتر</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setImageUrl(event.target?.result as string);
                        toast.success('تم اختيار الصورة');
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              <span className="text-xs text-slate-400">أو رابط صورة مباشر:</span>
            </div>
            <Input
              placeholder="رابط الصورة https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-900 rounded-2xl"
            />

            {/* Preview */}
            {imageUrl && (
              <div className="mt-2 relative h-40 w-72 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-md bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="معاينة" className="h-full w-full object-cover" />
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button
              onClick={onPublish}
              disabled={pending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              {pending ? 'جاري النشر...' : 'نشر على جروب المنصة الآن 📢'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Published Teacher Posts */}
      <div className="space-y-4">
        <h2 className="font-bold text-lg text-slate-900 dark:text-white">المنشورات الحالية على الجروب ({posts.length})</h2>
        {posts.map((post: any) => {
          const imgMatch = post.content.match(/\[IMG\](.*?)\[\/IMG\]/);
          const cleanText = post.content.replace(/\[IMG\].*?\[\/IMG\]/g, '').trim();

          return (
            <Card key={post.id} className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/75 dark:bg-slate-900/50 flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl overflow-hidden bg-blue-600 text-white grid place-items-center font-bold">
                    أ
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{post.title}</h3>
                    <p className="text-xs text-slate-400">{new Date(post.created_at).toLocaleString('ar-EG')}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(post.id)}
                  className="rounded-xl text-red-600 border-red-200 dark:border-red-900 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 ms-1" />
                  حذف المنشور
                </Button>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">{cleanText}</p>
                {imgMatch && (
                  <div className="relative max-h-96 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgMatch[1]} alt="مرفق المنشور" className="max-h-96 w-full object-contain mx-auto" />
                  </div>
                )}

                {/* Comments List */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                  <p className="text-xs font-bold text-slate-500">تعليقات الطلاب ({post.replies?.length ?? 0}):</p>
                  {(post.replies ?? []).map((rep: any) => (
                    <div key={rep.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                      <p className="font-bold text-blue-600 dark:text-cyan-400">{rep.student?.full_name || 'طالب'}</p>
                      <p className="text-slate-700 dark:text-slate-300 mt-1">{rep.content}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(rep.created_at).toLocaleTimeString('ar-EG')}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
