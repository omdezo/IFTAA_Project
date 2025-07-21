import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation, ValidationRules } from './useFormValidation';

// Mock the language context
vi.mock('@contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' })
}));

// Mock translations
vi.mock('../translations', () => ({
  t: (key: string, lang: string, params?: any) => {
    const translations: Record<string, string> = {
      'form.validation.required': 'This field is required',
      'form.validation.minLength': `Minimum ${params?.min || '{min}'} characters required`,
      'form.validation.maxLength': `Maximum ${params?.max || '{max}'} characters allowed`,
      'form.validation.invalidFormat': 'Invalid format'
    };
    return translations[key] || key;
  }
}));

interface TestFormData {
  name: string;
  email: string;
  age: number;
}

describe('useFormValidation', () => {
  const initialValues: TestFormData = {
    name: '',
    email: '',
    age: 0
  };

  const validationRules: ValidationRules = {
    name: {
      required: true,
      minLength: 2,
      maxLength: 50
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    age: {
      required: true,
      custom: (value: number) => {
        if (value < 18) return 'Must be 18 or older';
        return null;
      }
    }
  };

  it('should initialize with default values', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.isValid).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should handle field changes', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.handleChange('name', 'John');
    });

    expect(result.current.values.name).toBe('John');
  });

  it('should validate required fields', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.validateField('name');
    });

    expect(result.current.errors.name).toBe('This field is required');
  });

  it('should validate minimum length', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.handleChange('name', 'A');
      result.current.validateField('name');
    });

    expect(result.current.errors.name).toBe('Minimum 2 characters required');
  });

  it('should validate email pattern', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.handleChange('email', 'invalid-email');
      result.current.validateField('email');
    });

    expect(result.current.errors.email).toBe('Invalid format');
  });

  it('should validate custom rules', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.handleChange('age', 16);
      result.current.validateField('age');
    });

    expect(result.current.errors.age).toBe('Must be 18 or older');
  });

  it('should clear errors when field becomes valid', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    // Set invalid value
    act(() => {
      result.current.handleChange('name', '');
      result.current.validateField('name');
    });

    expect(result.current.errors.name).toBe('This field is required');

    // Set valid value
    act(() => {
      result.current.handleChange('name', 'John');
    });

    expect(result.current.errors.name).toBeUndefined();
  });

  it('should validate entire form', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      const isValid = result.current.validateForm();
      expect(isValid).toBe(false);
    });

    expect(result.current.errors.name).toBe('This field is required');
    expect(result.current.errors.email).toBe('This field is required');
  });

  it('should handle form submission', async () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    const mockSubmit = vi.fn();
    
    // Set valid values
    act(() => {
      result.current.handleChange('name', 'John Doe');
      result.current.handleChange('email', 'john@example.com');
      result.current.handleChange('age', 25);
    });

    const handleSubmit = result.current.handleSubmit(mockSubmit);
    const mockEvent = { preventDefault: vi.fn() } as any;

    await act(async () => {
      await handleSubmit(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
      age: 25
    });
  });

  it('should reset form values', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    // Change values
    act(() => {
      result.current.handleChange('name', 'John');
      result.current.setFieldError('name', 'Some error');
    });

    expect(result.current.values.name).toBe('John');
    expect(result.current.errors.name).toBe('Some error');

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
  });

  it('should set field errors manually', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setFieldError('name', 'Custom error');
    });

    expect(result.current.errors.name).toBe('Custom error');
  });

  it('should clear all errors', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setFieldError('name', 'Error 1');
      result.current.setFieldError('email', 'Error 2');
    });

    expect(Object.keys(result.current.errors)).toHaveLength(2);

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.errors).toEqual({});
  });
});