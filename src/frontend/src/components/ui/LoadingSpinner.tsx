import React from 'react';
import { cn } from '@utils/index';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  color?: 'primary' | 'secondary' | 'neutral';
}

const sizeVariants = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

const colorVariants = {
  primary: 'text-islamic-gold',
  secondary: 'text-islamic-blue',
  neutral: 'text-neutral-400'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  text,
  color = 'primary'
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <svg
        className={cn(
          'animate-spin',
          sizeVariants[size],
          colorVariants[color]
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {text && (
        <p className={cn('text-sm font-medium', colorVariants[color])}>
          {text}
        </p>
      )}
    </div>
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  text,
  className
}) => {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
          <LoadingSpinner text={text} />
        </div>
      )}
    </div>
  );
};

interface SkeletonProps {
  className?: string;
  lines?: number;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  lines = 1,
  width = '100%',
  height = '1rem'
}) => {
  if (lines === 1) {
    return (
      <div
        className={cn(
          'animate-pulse bg-neutral-200 rounded',
          className
        )}
        style={{ width, height }}
      />
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="animate-pulse bg-neutral-200 rounded"
          style={{
            width: index === lines - 1 ? '75%' : width,
            height
          }}
        />
      ))}
    </div>
  );
};