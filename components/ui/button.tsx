import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-accent-violet to-accent-blue text-white shadow-lg shadow-accent-violet/20 hover:brightness-110',
  secondary: 'bg-white/[0.06] text-zinc-100 border border-white/10 hover:bg-white/[0.1]',
  ghost: 'text-zinc-300 hover:text-white hover:bg-white/[0.06]',
  danger: 'bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20'
};

const sizes: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5 rounded-lg',
  md: 'text-sm px-4 py-2.5 rounded-xl',
  lg: 'text-base px-6 py-3 rounded-xl'
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(({ className, variant = 'primary', size = 'md', ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none',
      variants[variant],
      sizes[size],
      className
    )}
    {...props}
  />
));
Button.displayName = 'Button';
