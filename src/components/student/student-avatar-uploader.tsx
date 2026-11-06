"use client";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { uploadAvatarImage } from "@/lib/firebase/image-upload";
import { toast } from "sonner";
export function StudentAvatarUploader({
  currentAvatar,
  studentName,
}: {
  currentAvatar?: string | null;
  studentName: string;
}) {
  const [avatar, setAvatar] = useState(
      currentAvatar || "/images/instructor.png",
    ),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState("");
  useEffect(() => {
    setAvatar(currentAvatar || "/images/instructor.png");
  }, [currentAvatar]);
  return (
    <div className="space-y-2">
      <div className="relative h-24 w-24 overflow-hidden rounded-3xl border">
        <img
          src={avatar}
          alt={studentName}
          className="h-full w-full object-cover"
        />
        {busy && (
          <span
            role="status"
            className="absolute inset-0 grid place-items-center bg-black/60 text-white"
          >
            {progress}%
          </span>
        )}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
        <Camera className="h-4 w-4" />
        تغيير الصورة
        <input
          type="file"
          className="max-w-48"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const input = e.currentTarget,
              file = input.files?.[0];
            if (!file) return;
            setBusy(true);
            setError("");
            setProgress(0);
            try {
              const image = await uploadAvatarImage(file, setProgress);
              if (!auth.currentUser) throw new Error("سجل الدخول");
              await updateDoc(doc(db, "users", auth.currentUser.uid), {
                avatarUrl: image.url,
              });
              setAvatar(image.url);
              toast.success("تم رفع وحفظ الصورة الشخصية");
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "تعذر حفظ الصورة";
              setError(message);
              toast.error(message);
            } finally {
              setBusy(false);
              input.value = "";
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
