'use client';

import { useState, useTransition } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { updateStudentAvatar } from '@/app/actions/auth';
import { toast } from 'sonner';

export function StudentAvatarUploader({ 
  currentAvatar, 
  studentName 
}: { 
  currentAvatar?: string | null; 
  studentName: string; 
}) {
  const [avatar, setAvatar] = useState<string>(currentAvatar || '/images/instructor.png');
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 3 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatar(base64);
      startTransition(async () => {
        const res = await updateStudentAvatar(base64);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success('تم تحديث صورتك الشخصية بنجاح 🎉');
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="relative group shrink-0">
      <div className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-3xl border-2 border-white/40 shadow-xl bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar}
          alt={studentName}
          className="h-full w-full object-cover"
        />
        {isPending && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-xs text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>

      {/* Upload Camera Overlay Badge */}
      <label 
        className="absolute -bottom-1 -left-1 grid h-8 w-8 cursor-pointer place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/40 hover:bg-blue-500 hover:scale-110 active:scale-95 transition"
        title="تغيير الصورة الشخصية"
      >
        <Camera className="h-4 w-4" />
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={isPending}
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}
