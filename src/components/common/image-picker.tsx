"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ImageAttachment } from "@/lib/image-attachments";
export function ImagePicker({
  value,
  onChange,
  upload,
  disabled = false,
  label = "إرفاق صورة",
  onBusyChange,
}: {
  value?: ImageAttachment;
  onChange: (image?: ImageAttachment) => void;
  upload: (
    file: File,
    onProgress?: (percent: number) => void,
  ) => Promise<ImageAttachment>;
  disabled?: boolean;
  label?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const active = useRef(true);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold">
        {label}
        <input
          ref={input}
          aria-label={label}
          className="mt-2 block max-w-full text-sm"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setProgress(0);
            setError("");
            onBusyChange?.(true);
            try {
              const image = await upload(file, (percent) => {
                if (active.current) setProgress(percent);
              });
              if (active.current) onChange(image);
            } catch (err) {
              if (active.current) {
                setError(err instanceof Error ? err.message : "تعذر الرفع");
                toast.error(
                  err instanceof Error
                    ? err.message
                    : "تعذر رفع الصورة؛ تحقق من الاتصال وصلاحيات التخزين",
                );
              }
            } finally {
              if (active.current) {
                setBusy(false);
                if (input.current) input.current.value = "";
              }
              onBusyChange?.(false);
            }
          }}
        />
      </label>
      <p className="text-xs text-muted">
        JPG / PNG / WebP — حتى ٣ ميجابايت
        {busy ? ` · رفع ${progress}% والتحقق من الحفظ…` : ""}
      </p>
      {busy && (
        <progress
          aria-label="تقدم الرفع"
          value={progress}
          max={100}
          className="w-full"
        />
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/40 p-3 text-sm text-red-500"
        >
          {error}
        </p>
      )}
      {value && (
        <div className="space-y-2">
          <img
            src={value.url}
            alt={value.name || "الصورة المختارة"}
            className="max-h-56 max-w-full rounded-xl object-contain"
          />
          <button
            type="button"
            disabled={disabled || busy}
            className="text-sm text-red-500 underline"
            onClick={() => onChange(undefined)}
          >
            إزالة الصورة
          </button>
        </div>
      )}
    </div>
  );
}
