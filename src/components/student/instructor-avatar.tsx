import Image from 'next/image';
import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg' | 'hero';

const SIZE_CLASS: Record<Size, string> = {
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-20 w-20',
  hero: 'h-64 w-64 md:h-80 md:w-80',
};

const SIZE_PX: Record<Size, number> = {
  sm: 36,
  md: 48,
  lg: 80,
  hero: 320,
};

export function InstructorAvatar({
  src,
  size = 'md',
  rounded = false,
  glow = false,
  className,
  alt = 'مستر عبدالرحمن الأسيوطي',
}: {
  src: string;
  size?: Size;
  rounded?: boolean;
  glow?: boolean;
  className?: string;
  alt?: string;
}) {
  return (
    <div
      className={cn(
        'relative inline-block',
        rounded ? 'rounded-full' : 'rounded-[2rem]',
        glow && 'animate-pulse-glow',
        SIZE_CLASS[size],
        className
      )}
    >
      {glow && (
        <div
          aria-hidden
          className="absolute -inset-4 -z-10 rounded-[inherit] bg-brand-gradient opacity-60 blur-2xl"
        />
      )}
      <div
        className={cn(
          'relative h-full w-full overflow-hidden ring-4 ring-white/20',
          rounded ? 'rounded-full' : 'rounded-[inherit]'
        )}
      >
        <Image
          src={src}
          alt={alt}
          width={SIZE_PX[size]}
          height={SIZE_PX[size]}
          priority={size === 'hero'}
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
