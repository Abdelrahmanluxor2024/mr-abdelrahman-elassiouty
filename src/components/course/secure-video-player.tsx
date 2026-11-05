"use client";

import { useEffect, useRef, useState } from "react";
import {
  Maximize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Settings,
} from "lucide-react";
import { getVideoSource } from "@/lib/video-url";
import { Button } from "@/components/ui/button";

type Props = {
  src: string;
  poster?: string;
  watermarkText: string;
  /** Optional poster image, e.g. for Bunny.net iframe */
  embed?: boolean;
};

/**
 * Custom HTML5 player with:
 *  - Dynamic watermark (student name + phone)
 *  - Disabled right-click, picture-in-picture, download
 *  - Pointer-events: none on the watermark so it doesn't block controls
 *  - Optional embed mode (iframe) for protected providers
 */
export function SecureVideoPlayer({
  src,
  poster,
  watermarkText,
  embed,
}: Props) {
  const source = getVideoSource(src);
  src = source.src;
  embed = source.embed;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [youtubeSettingsOpen, setYoutubeSettingsOpen] = useState(false);
  const isYouTube =
    source.embed &&
    source.src.startsWith("https://www.youtube-nocookie.com/embed/");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setYoutubeSettingsOpen(false);
  }, [source.src]);

  useEffect(() => {
    function block(e: Event) {
      e.preventDefault();
    }
    const v = videoRef.current;
    if (!v) return;
    v.addEventListener("contextmenu", block);
    v.addEventListener("dragstart", block);
    return () => {
      v.removeEventListener("contextmenu", block);
      v.removeEventListener("dragstart", block);
    };
  }, []);

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }

  if (!src)
    return (
      <div className="rounded-2xl border border-amber-500/30 p-6 text-center text-amber-300">
        رابط الفيديو غير صالح. تواصل مع المعلم لتحديثه.
      </div>
    );
  return (
    <div className="relative overflow-hidden rounded-2xl theme-inverse bg-black shadow-blue-soft">
      {embed ? (
        <div className="relative">
          <iframe
            src={
              isYouTube ? `${src}?playsinline=1&rel=0&iv_load_policy=3` : src
            }
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            className="aspect-video w-full border-0"
            title="مشغل الفيديو"
          />
          {isYouTube && !youtubeSettingsOpen && (
            <>
              {/* Click deterrents only: not access control or link/capture protection.
              Do not crop the iframe; native settings can be restored below. */}
              <div
                aria-hidden="true"
                data-youtube-shield="title"
                className="absolute left-0 top-0 h-16 w-[calc(100%-144px)] bg-transparent"
              />
              <div
                aria-hidden="true"
                data-youtube-shield="footer"
                className="absolute bottom-0 left-0 right-0 h-10 bg-transparent"
              />
            </>
          )}
        </div>
      ) : (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          controlsList="nodownload noplaybackrate noremoteplayback"
          disablePictureInPicture
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            setProgress((v.currentTime / Math.max(v.duration, 1)) * 100);
          }}
          className="aspect-video w-full theme-inverse bg-black"
        />
      )}

      {/* Dynamic watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 select-none"
      >
        <div className="grid h-full w-full grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center justify-center">
              <span className="-rotate-12 text-xs font-semibold text-white/25">
                {watermarkText}
              </span>
            </div>
          ))}
        </div>
      </div>

      {isYouTube && (
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-slate-950 px-4 py-3 text-white">
          <p className="text-xs text-slate-300">
            {youtubeSettingsOpen
              ? "استخدم ترس يوتيوب داخل الفيديو لضبط الجودة، ثم أغلق الإعدادات."
              : "تقليل الضغط على الروابط فقط؛ لا يمنع استخراج رابط الفيديو."}
          </p>
          <button
            type="button"
            aria-pressed={youtubeSettingsOpen}
            onClick={() => setYoutubeSettingsOpen((open) => !open)}
            className="flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            {youtubeSettingsOpen
              ? "إغلاق وضع الإعدادات"
              : "إعدادات الجودة والتحكم"}
          </button>
        </div>
      )}
      {!embed && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 theme-inverse bg-gradient-to-t from-black/80 to-transparent p-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggle}
            className="text-ink hover:bg-white/10"
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              v.muted = !v.muted;
              setMuted(v.muted);
            }}
            className="text-ink hover:bg-white/10"
          >
            {muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full theme-inverse bg-brand-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => videoRef.current?.requestFullscreen()}
            className="text-ink hover:bg-white/10"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
