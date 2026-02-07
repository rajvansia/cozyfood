import { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type CheckboxProps = InputHTMLAttributes<HTMLInputElement>;

export const Checkbox = ({ className, ...props }: CheckboxProps) => {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input type="checkbox" className="peer sr-only" {...props} />
      <span
        className={cn(
          'relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-leaf bg-cream shadow-inner transition-all duration-200 peer-checked:bg-leaf peer-checked:shadow-floaty peer-checked:scale-105',
          className
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 text-cream opacity-0 transition-all duration-200 peer-checked:opacity-100 peer-checked:scale-100 scale-75"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12l4 4L19 7" />
        </svg>
      </span>
    </label>
  );
};
