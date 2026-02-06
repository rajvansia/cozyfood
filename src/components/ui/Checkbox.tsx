import { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type CheckboxProps = InputHTMLAttributes<HTMLInputElement>;

export const Checkbox = ({ className, ...props }: CheckboxProps) => {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input type="checkbox" className="peer sr-only" {...props} />
      <span
        className={cn(
          'h-6 w-6 rounded-full border-2 border-leaf bg-cream shadow-inner transition-all duration-200 peer-checked:bg-leaf peer-checked:shadow-floaty',
          className
        )}
      />
    </label>
  );
};
