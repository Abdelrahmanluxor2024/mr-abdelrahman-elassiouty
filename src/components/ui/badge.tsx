import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent theme-inverse bg-brand-600 text-ink',
        secondary: 'border-transparent theme-panel bg-brand-100 dark:bg-brand-950 text-brand-800',
        outline: 'border-brand-300 text-brand-700',
        success: 'border-transparent theme-inverse bg-emerald-700 text-ink',
        warning: 'border-transparent bg-warning text-ink',
        error: 'border-transparent theme-inverse bg-red-700 text-ink',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
