import { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = ({ className, ...props }: SelectProps) => {
  return (
    <select
      className={cn(
        'w-full rounded-full border border-cream/70 bg-cream px-4 py-2 text-ink shadow-inner focus:outline-none focus:ring-2 focus:ring-leaf/40',
        className
      )}
      {...props}
    />
  );
};
