import { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'soft';
  size?: 'sm' | 'md';
};

const baseStyles =
  'inline-flex items-center justify-center rounded-full px-4 py-2 font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/60 active:scale-[0.98]';

const variants = {
  primary:
    'bg-leaf text-cream shadow-floaty hover:-translate-y-0.5 hover:shadow-cozy',
  soft:
    'bg-mint text-ink shadow-floaty hover:-translate-y-0.5 hover:shadow-cozy',
  ghost: 'bg-transparent text-ink hover:bg-oatmeal'
};

const sizes = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base px-4 py-2'
};

export const Button = ({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) => {
  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  );
};
