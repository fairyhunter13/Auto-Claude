import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-green-500/15 text-green-700 dark:text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)] hover:bg-green-500/25',
        warning: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)] hover:bg-amber-500/25',
        info: 'border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)] hover:bg-blue-500/25',
        purple: 'border-transparent bg-purple-500/15 text-purple-700 dark:text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)] hover:bg-purple-500/25'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
