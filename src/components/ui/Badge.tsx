import { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type BadgeProps = HTMLAttributes<HTMLSpanElement>;

export const Badge = ({ className, ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full bg-oatmeal px-3 py-1 text-xs font-semibold text-ink/80',
      className
    )}
    {...props}
  />
);
