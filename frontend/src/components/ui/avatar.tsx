import * as React from 'react';
import { cn } from '../../utils/cn';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}

const sizeMap = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };

export function Avatar({ src, alt, fallback, size = 'sm', className, title }: AvatarProps) {
  const initials = fallback
    ? fallback.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full bg-primary/10 text-primary font-medium',
        sizeMap[size],
        className
      )}
      title={title}
    >
      {src ? (
        <img src={src} alt={alt || ''} className="rounded-full object-cover w-full h-full" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
