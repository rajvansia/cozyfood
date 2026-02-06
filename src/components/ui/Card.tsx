import { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
};

export const Card = ({ className, padded = true, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        'rounded-cozy bg-fog shadow-floaty border border-cream/70',
        padded && 'p-4',
        className
      )}
      {...props}
    />
  );
};
