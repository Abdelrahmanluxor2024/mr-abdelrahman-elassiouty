"use client";

import { ImagePicker } from "@/components/common/image-picker";
import { uploadAdminImage } from "@/lib/firebase/image-upload";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  MessageSquare,
  Upload,
  Send,
  Trash2,
  Heart,
  MessageCircle,
} from "lucide-react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function AdminCommunityPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);

  async function loadPosts() {
    try {
      const snap = await getDocs(collection(db, "community_posts"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort(
        (a: any, b: any) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime(),
      );
      setPosts(list);
    } catch (err) {
      console.error("Error loading community posts:", err);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function onPublish() {
    if (uploading) return;
    if (!title.trim() || !content.trim()) {
      toast.error("يرجى كتابة عنوان وتفاصيل المنشور");
      return;
    }

    setPending(true);
    try {
      await addDoc(collection(db, "community_posts"), {
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl.trim() || null,
        created_at: new Date().toISOString(),
        author: "مستر عبدالرحمن الأسيوطي",
      });
      toast.success("تم نشر البوست على جروب المنصة بنجاح 🎉");
      setTitle("");
      setContent("");
      setImageUrl("");
      await loadPosts();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء النشر");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(postId: string) {
    if (!confirm("هل أنت متأكد من حذف هذا المنشور؟")) return;
    try {
      await deleteDoc(doc(db, "community_posts", postId));
      toast.success("تم حذف المنشور");
      await loadPosts();
    } catch (err: any) {
      toast.error(err.message || "فشل حذف المنشور");
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="font-display text-2xl font-black text-brand-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-blue-600 dark:text-cyan-400" />
          جروب المنصة (منشورات المستر)
        </h1>
        <p className="text-xs text-muted mt-1">
          انشر التحديثات والتحديات والأسئلة للطلاب على الصفحة الرئيسية، مع
          إمكانية تلقي تعليقات الطلاب والرد عليها.
        </p>
      </div>

      {/* Create New Teacher Post */}
      <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">
            نشر بوست جديد على جروب المنصة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="font-bold text-ink dark:text-slate-200">
              عنوان المنشور
            </Label>
            <Input
              placeholder="مثال: مسابقة برمجية جديدة وجوائز للمراكز الأولى 🏆"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 font-bold text-ink dark:text-white bg-slate-50 dark:bg-slate-900 rounded-2xl"
            />
          </div>

          <div>
            <Label className="font-bold text-ink dark:text-slate-200">
              محتوى المنشور
            </Label>
            <Textarea
              placeholder="اكتب رسالتك وتوجيهاتك لطلاب المنصة هنا..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1.5 min-h-[140px] text-sm text-ink dark:text-white bg-slate-50 dark:bg-slate-900 rounded-2xl leading-relaxed"
            />
          </div>

          {/* Image Attachment */}
          <div className="space-y-2">
            <Label className="font-bold text-ink dark:text-slate-200">
              إرفاق صورة مع البوست (اختياري)
            </Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <ImagePicker
                label="رفع صورة من جهازك"
                value={
                  imageUrl
                    ? { url: imageUrl, path: "", name: "صورة" }
                    : undefined
                }
                upload={(file, onProgress) =>
                  uploadAdminImage("community", file, onProgress)
                }
                onChange={(image) => setImageUrl(image?.url || "")}
                disabled={pending || uploading}
                onBusyChange={setUploading}
              />
              <span className="text-xs text-muted">أو رابط صورة مباشر:</span>
            </div>
            <Input
              placeholder="رابط الصورة https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-900 rounded-2xl"
            />

            {/* Preview */}
            {imageUrl && (
              <div className="mt-2 relative h-40 w-72 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-md theme-inverse bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="معاينة"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button
              onClick={onPublish}
              disabled={pending || uploading}
              className="w-full theme-inverse bg-blue-600 hover:bg-blue-700 text-ink font-bold py-3 rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              {pending ? "جاري النشر..." : "نشر على جروب المنصة الآن 📢"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Published Teacher Posts */}
      <div className="space-y-4">
        <h2 className="font-bold text-lg text-ink dark:text-white">
          المنشورات الحالية على الجروب ({posts.length})
        </h2>
        {posts.map((post: any) => {
          const imgMatch = post.content.match(/\[IMG\](.*?)\[\/IMG\]/);
          const cleanText = post.content
            .replace(/\[IMG\].*?\[\/IMG\]/g, "")
            .trim();

          return (
            <Card
              key={post.id}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              <CardHeader className="bg-slate-50/75 dark:bg-slate-900/50 flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl overflow-hidden theme-inverse bg-blue-600 text-ink grid place-items-center font-bold">
                    أ
                  </div>
                  <div>
                    <h3 className="font-bold text-ink dark:text-white text-base">
                      {post.title}
                    </h3>
                    <p className="text-xs text-muted">
                      {new Date(post.created_at).toLocaleString("ar-EG")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(post.id)}
                  className="rounded-xl text-red-600 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-4 w-4 ms-1" />
                  حذف المنشور
                </Button>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <p className="text-sm leading-relaxed text-ink dark:text-slate-200 whitespace-pre-line">
                  {cleanText}
                </p>
                {imgMatch && (
                  <div className="relative max-h-96 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 theme-inverse bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgMatch[1]}
                      alt="مرفق المنشور"
                      className="max-h-96 w-full object-contain mx-auto"
                    />
                  </div>
                )}

                {/* Comments List */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                  <p className="text-xs font-bold text-muted">
                    تعليقات الطلاب ({post.replies?.length ?? 0}):
                  </p>
                  {(post.replies ?? []).map((rep: any) => (
                    <div
                      key={rep.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <p className="font-bold text-blue-600 dark:text-cyan-400">
                        {rep.student?.full_name || "طالب"}
                      </p>
                      <p className="text-ink dark:text-slate-300 mt-1">
                        {rep.content}
                      </p>
                      <p className="text-[10px] text-muted mt-1">
                        {new Date(rep.created_at).toLocaleTimeString("ar-EG")}
                      </p>
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
