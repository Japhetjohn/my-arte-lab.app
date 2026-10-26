import React from 'react';
import { cn } from '@/lib/utils';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'white' | 'current' | 'muted';
  srLabel?: string;
}

const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
  xs: 'w-3 h-3 border-[1.5px]',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
  xl: 'w-12 h-12 border-[2.5px]',
};

const variantClasses: Record<NonNullable<SpinnerProps['variant']>, string> = {
  primary: 'border-[#9747FF] border-t-transparent',
  white: 'border-white border-t-transparent',
  current: 'border-current border-t-transparent',
  muted: 'border-gray-400 dark:border-gray-500 border-t-transparent',
};

/**
 * Canonical rolling circle spinner for MyArteLab.
 * Implements the standard: rounded-full border-2 border-[#9747FF] border-t-transparent animate-spin
 */
export function Spinner({
  size = 'sm',
  variant = 'primary',
  srLabel = 'Loading...',
  className,
  ...props
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={srLabel}
      className={cn(
        'rounded-full animate-spin motion-reduce:animate-none shrink-0 pointer-events-none',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {srLabel && <span className="sr-only">{srLabel}</span>}
    </div>
  );
}

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'page' | 'section' | 'inline';
  size?: SpinnerProps['size'];
  spinnerVariant?: SpinnerProps['variant'];
  message?: string;
  subMessage?: string;
}

/**
 * Standard container loading state with clean typography and no layout jumps.
 */
export function LoadingState({
  variant = 'section',
  size,
  spinnerVariant = 'primary',
  message,
  subMessage,
  className,
  ...props
}: LoadingStateProps) {
  const defaultSize = variant === 'page' ? 'lg' : variant === 'section' ? 'md' : 'sm';
  const resolvedSize = size || defaultSize;

  if (variant === 'page') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center min-h-[60vh] py-20 animate-in fade-in duration-150',
          className
        )}
        {...props}
      >
        <Spinner size={resolvedSize} variant={spinnerVariant} />
        {message && (
          <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            {message}
          </p>
        )}
        {subMessage && (
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {subMessage}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div
        className={cn('inline-flex items-center gap-2', className)}
        {...props}
      >
        <Spinner size={resolvedSize} variant={spinnerVariant} />
        {message && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {message}
          </span>
        )}
      </div>
    );
  }

  // variant === 'section'
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in duration-150',
        className
      )}
      {...props}
    >
      <Spinner size={resolvedSize} variant={spinnerVariant} />
      {message && (
        <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
          {message}
        </p>
      )}
      {subMessage && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {subMessage}
        </p>
      )}
    </div>
  );
}
