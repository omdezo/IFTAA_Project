import React from 'react';
import { cn } from '@utils/index';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const paddingVariants = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
};

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hover = false,
  padding = 'md',
  onClick
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-neutral-200 shadow-sm transition-all duration-200',
        hover && 'hover:shadow-md hover:border-neutral-300',
        onClick && 'cursor-pointer',
        paddingVariants[padding],
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('border-b border-neutral-200 pb-3 mb-4', className)}>
      {children}
    </div>
  );
};

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('border-t border-neutral-200 pt-3 mt-4', className)}>
      {children}
    </div>
  );
};