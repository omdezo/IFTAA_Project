import React from 'react';
import { cn } from '@utils/index';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  isLoading?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string; disabled?: boolean }>;
  placeholder?: string;
  isLoading?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  isLoading,
  className,
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-700 mb-1 text-start"
        >
          {label}
          {props.required && <span className="text-red-500 ms-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-neutral-400">
            {leftIcon}
          </div>
        )}
        
        <input
          id={inputId}
          className={cn(
            'block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-500 transition-colors duration-200',
            'focus:border-islamic-gold focus:outline-none focus:ring-2 focus:ring-islamic-gold focus:ring-offset-0',
            'disabled:bg-neutral-100 disabled:cursor-not-allowed',
            leftIcon && 'ps-10',
            rightIcon && 'pe-10',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          disabled={isLoading || props.disabled}
          {...props}
        />
        
        {(rightIcon || isLoading) && (
          <div className="absolute inset-y-0 end-0 pe-3 flex items-center">
            {isLoading ? (
              <svg className="animate-spin h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            ) : (
              rightIcon && <span className="text-neutral-400">{rightIcon}</span>
            )}
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600 text-start">{error}</p>
      )}
    </div>
  );
};

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  isLoading,
  className,
  id,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={textareaId}
          className="block text-sm font-medium text-neutral-700 mb-1 text-start"
        >
          {label}
          {props.required && <span className="text-red-500 ms-1">*</span>}
        </label>
      )}
      
      <textarea
        id={textareaId}
        className={cn(
          'block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-500 transition-colors duration-200 resize-y min-h-[80px]',
          'focus:border-islamic-gold focus:outline-none focus:ring-2 focus:ring-islamic-gold focus:ring-offset-0',
          'disabled:bg-neutral-100 disabled:cursor-not-allowed',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-600 text-start">{error}</p>
      )}
    </div>
  );
};

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  placeholder,
  isLoading,
  className,
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-neutral-700 mb-1 text-start"
        >
          {label}
          {props.required && <span className="text-red-500 ms-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            'block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 transition-colors duration-200 appearance-none cursor-pointer',
            'focus:border-islamic-gold focus:outline-none focus:ring-2 focus:ring-islamic-gold focus:ring-offset-0',
            'disabled:bg-neutral-100 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          disabled={isLoading || props.disabled}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        <div className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none">
          {isLoading ? (
            <svg className="animate-spin h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          ) : (
            <svg className="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600 text-start">{error}</p>
      )}
    </div>
  );
};