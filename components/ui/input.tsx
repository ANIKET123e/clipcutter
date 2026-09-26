import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg bg-white/[0.05] border border-white/10 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent-violet/60 focus:bg-white/[0.07] outline-none transition-colors',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
