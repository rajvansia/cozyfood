import { SVGProps } from 'react';

const baseProps: SVGProps<SVGSVGElement> = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

export const BasketIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...baseProps} {...props}>
    <path d="M4 10h16l-1.2 8.5a2 2 0 0 1-2 1.5H7.2a2 2 0 0 1-2-1.5L4 10z" />
    <path d="M8 10l4-6 4 6" />
  </svg>
);

export const MealIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...baseProps} {...props}>
    <path d="M4 15c2.5 3 13.5 3 16 0" />
    <path d="M6 12c2 2 10 2 12 0" />
    <path d="M9 6v6" />
    <path d="M15 6v6" />
  </svg>
);

export const CalendarIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...baseProps} {...props}>
    <rect x="3" y="5" width="18" height="16" rx="4" />
    <path d="M7 3v4M17 3v4M3 10h18" />
  </svg>
);

export const SparkleIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...baseProps} {...props}>
    <path d="M12 3l1.6 3.9L18 8l-4.4 1.1L12 13l-1.6-3.9L6 8l4.4-1.1L12 3z" />
    <path d="M5 14l.8 1.8L8 16l-2.2.6L5 18.5l-.8-1.9L2 16l2.2-.2L5 14z" />
  </svg>
);

export const PlusIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...baseProps} {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const TrashIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...baseProps} {...props}>
    <path d="M5 7h14" />
    <path d="M9 7V5h6v2" />
    <path d="M7 7l1 12h8l1-12" />
  </svg>
);

export const EditIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...baseProps} {...props}>
    <path d="M4 16.5V20h3.5L18 9.5l-3.5-3.5L4 16.5z" />
    <path d="M13.5 6L17 9.5" />
  </svg>
);
