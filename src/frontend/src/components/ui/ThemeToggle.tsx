import React from 'react';
import { useLanguage } from '@contexts/LanguageContext';
import { Button } from './Button';
import { t } from '../../translations';
import { cn } from '@utils/index';

interface ThemeToggleProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  showText = true,
  size = 'md'
}) => {
  const { language, direction, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const buttonSizes = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2', 
    lg: 'text-base px-4 py-3'
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Language/Direction Toggle */}
      <Button
        variant="outline"
        size={size}
        onClick={toggleLanguage}
        className={cn(
          'relative overflow-hidden transition-all duration-300',
          buttonSizes[size]
        )}
        title={t('common.selectLanguage', language)}
      >
        <div className="flex items-center gap-2">
          {/* Language Icon */}
          <svg 
            className={cn(
              'transition-transform duration-300',
              size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4',
              direction === 'rtl' ? 'rotate-0' : 'rotate-180'
            )} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" 
            />
          </svg>
          
          {/* Language Text */}
          {showText && (
            <span className="font-medium">
              {language === 'ar' ? 'EN' : 'عر'}
            </span>
          )}
          
          {/* Direction Indicator */}
          <div className="flex items-center gap-1">
            <div className={cn(
              'w-1 h-3 bg-current transition-all duration-300 rounded-full',
              direction === 'rtl' ? 'opacity-100' : 'opacity-30'
            )} />
            <div className={cn(
              'w-1 h-3 bg-current transition-all duration-300 rounded-full',
              direction === 'ltr' ? 'opacity-100' : 'opacity-30'
            )} />
          </div>
        </div>
        
        {/* Ripple effect on click */}
        <div className="absolute inset-0 bg-islamic-gold opacity-0 transition-opacity duration-150 pointer-events-none" />
      </Button>

      {/* Text Display */}
      {showText && (
        <div className="hidden md:flex flex-col text-xs text-neutral-600">
          <span className="font-medium">
            {language === 'ar' ? 'العربية' : 'English'}
          </span>
          <span className="text-neutral-400">
            {direction === 'rtl' ? t('theme.rtl', language) : t('theme.ltr', language)}
          </span>
        </div>
      )}
    </div>
  );
};

// Enhanced Theme Context for future theme features
interface ThemeContextType {
  language: 'ar' | 'en';
  direction: 'rtl' | 'ltr';
  theme: 'light' | 'dark';
  setLanguage: (lang: 'ar' | 'en') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;
}

// RTL/LTR Helper Component
interface DirectionalWrapperProps {
  children: React.ReactNode;
  className?: string;
  forceDirection?: 'rtl' | 'ltr';
}

export const DirectionalWrapper: React.FC<DirectionalWrapperProps> = ({
  children,
  className,
  forceDirection
}) => {
  const { direction } = useLanguage();
  const appliedDirection = forceDirection || direction;

  return (
    <div 
      dir={appliedDirection}
      className={cn(
        'transition-all duration-300',
        appliedDirection === 'rtl' ? 'text-right' : 'text-left',
        className
      )}
    >
      {children}
    </div>
  );
};

// RTL-aware Icon Component
interface RTLIconProps {
  children: React.ReactNode;
  className?: string;
  flipOnRTL?: boolean;
}

export const RTLIcon: React.FC<RTLIconProps> = ({
  children,
  className,
  flipOnRTL = false
}) => {
  const { direction } = useLanguage();
  
  return (
    <span className={cn(
      'inline-flex items-center justify-center transition-transform duration-300',
      flipOnRTL && direction === 'rtl' && 'scale-x-[-1]',
      className
    )}>
      {children}
    </span>
  );
};

// CSS-in-JS style generator for RTL/LTR
export const getDirectionalStyles = (direction: 'rtl' | 'ltr') => ({
  textAlign: direction === 'rtl' ? 'right' as const : 'left' as const,
  paddingLeft: direction === 'rtl' ? undefined : '1rem',
  paddingRight: direction === 'rtl' ? '1rem' : undefined,
  borderLeftWidth: direction === 'rtl' ? undefined : '1px',
  borderRightWidth: direction === 'rtl' ? '1px' : undefined,
  marginLeft: direction === 'rtl' ? undefined : 'auto',
  marginRight: direction === 'rtl' ? 'auto' : undefined
});

// Tailwind class helpers for RTL/LTR
export const rtlClasses = {
  textAlign: (direction: 'rtl' | 'ltr') => direction === 'rtl' ? 'text-right' : 'text-left',
  paddingStart: 'ps-4', // Uses logical properties
  paddingEnd: 'pe-4',
  marginStart: 'ms-auto',
  marginEnd: 'me-auto',
  borderStart: 'border-s',
  borderEnd: 'border-e',
  roundedStart: 'rounded-s',
  roundedEnd: 'rounded-e'
};

// Hook for RTL-aware animations
export const useRTLAnimation = () => {
  const { direction } = useLanguage();
  
  return {
    slideIn: direction === 'rtl' ? 'animate-slide-in-right' : 'animate-slide-in-left',
    slideOut: direction === 'rtl' ? 'animate-slide-out-left' : 'animate-slide-out-right',
    direction
  };
};