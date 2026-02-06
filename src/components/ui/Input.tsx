import { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className, ...props }: InputProps) => {
  return (
    <input
      className={cn(
        'w-full rounded-full border border-cream/70 bg-cream px-4 py-2 text-ink placeholder:text-ink/50 shadow-inner focus:outline-none focus:ring-2 focus:ring-leaf/40',
        className
      )}
      {...props}
    />
  );
};
