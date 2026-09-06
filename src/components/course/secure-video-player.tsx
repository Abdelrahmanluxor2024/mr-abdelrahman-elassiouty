'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
export function SecureVideoPlayer({ src, poster, watermarkText, embed }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function block(e: Event) {
      e.preventDefault();
    }
    const v = videoRef.current;
    if (!v) return;
    v.addEventListener('contextmenu', block);
    v.addEventListener('dragstart', block);
    return () => {
      v.removeEventListener('contextmenu', block);
      v.removeEventListener('dragstart', block);
    };
  }, []);

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black shadow-blue-soft">
      {embed ? (
        <iframe
          src={src}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          className="aspect-video w-full border-0"
          title="مشغل الفيديو"
        />
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
          className="aspect-video w-full bg-black"
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
              <span className="-rotate-12 text-xs font-semibold text-white/30">
                {watermarkText}
              </span>
            </div>
          ))}
        </div>
      </div>

      {!embed && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent p-3">
          <Button size="icon" variant="ghost" onClick={toggle} className="text-white hover:bg-white/10">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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
            className="text-white hover:bg-white/10"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
            <div className="h-full bg-brand-500" style={{ width: `${progress}%` }} />
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => videoRef.current?.requestFullscreen()}
            className="text-white hover:bg-white/10"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
