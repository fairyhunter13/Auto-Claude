/**
 * Avatar Component
 * 
 * Simple avatar with fallback support.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Avatar Root
// ─────────────────────────────────────────────────────────────────────────────

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

// ─────────────────────────────────────────────────────────────────────────────
// Avatar Image
// ─────────────────────────────────────────────────────────────────────────────

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  onLoadingStatusChange?: (status: 'loading' | 'loaded' | 'error') => void;
}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt, onLoadingStatusChange, ...props }, ref) => {
    const [status, setStatus] = React.useState<'loading' | 'loaded' | 'error'>('loading');

    React.useEffect(() => {
      if (!src) {
        setStatus('error');
        return;
      }

      setStatus('loading');
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setStatus('loaded');
        onLoadingStatusChange?.('loaded');
      };
      img.onerror = () => {
        setStatus('error');
        onLoadingStatusChange?.('error');
      };
    }, [src, onLoadingStatusChange]);

    if (status !== 'loaded') {
      return null;
    }

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn('aspect-square h-full w-full', className)}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = 'AvatarImage';

// ─────────────────────────────────────────────────────────────────────────────
// Avatar Fallback
// ─────────────────────────────────────────────────────────────────────────────

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
  delayMs?: number;
}

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, children, delayMs, ...props }, ref) => {
    const [canRender, setCanRender] = React.useState(delayMs === undefined);

    React.useEffect(() => {
      if (delayMs !== undefined) {
        const timer = setTimeout(() => setCanRender(true), delayMs);
        return () => clearTimeout(timer);
      }
    }, [delayMs]);

    if (!canRender) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex h-full w-full items-center justify-center rounded-full bg-muted',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
