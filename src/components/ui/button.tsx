'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'theme-inverse bg-brand-600 text-ink shadow-blue-soft hover:bg-brand-700',
        outline:
          'border border-brand-600/30 theme-panel bg-white dark:bg-slate-900 text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-950',
        ghost: 'hover:bg-brand-50 dark:hover:bg-brand-950 text-brand-700',
        secondary:
          'theme-panel bg-brand-100 dark:bg-brand-950 text-brand-800 hover:bg-brand-200 dark:hover:bg-brand-950',
        destructive:
          'theme-inverse bg-red-700 text-ink hover:bg-red-600',
        success:
          'theme-inverse bg-emerald-700 text-ink hover:bg-emerald-800',
        link: 'text-brand-700 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
