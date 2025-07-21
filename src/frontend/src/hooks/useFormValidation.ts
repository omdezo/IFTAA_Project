import { useState, useCallback } from 'react';
import { t } from '../translations';
import { useLanguage } from '@contexts/LanguageContext';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [field: string]: ValidationRule;
}

export interface FormErrors {
  [field: string]: string;
}

export interface UseFormValidationReturn<T> {
  values: T;
  errors: FormErrors;
  isValid: boolean;
  isSubmitting: boolean;
  handleChange: (field: keyof T, value: any) => void;
  handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => (e: React.FormEvent) => Promise<void>;
  setFieldError: (field: keyof T, error: string) => void;
  clearErrors: () => void;
  reset: (newValues?: Partial<T>) => void;
  setSubmitting: (submitting: boolean) => void;
  validateField: (field: keyof T) => boolean;
  validateForm: () => boolean;
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: ValidationRules = {}
): UseFormValidationReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { language } = useLanguage();

  const validateField = useCallback((field: keyof T): boolean => {
    const rules = validationRules[field as string];
    if (!rules) return true;

    const value = values[field];
    let error: string | null = null;

    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      error = t('form.validation.required', language);
    }

    // Min length validation
    if (!error && rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      error = t('form.validation.minLength', language, { min: rules.minLength });
    }

    // Max length validation
    if (!error && rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      error = t('form.validation.maxLength', language, { max: rules.maxLength });
    }

    // Pattern validation
    if (!error && rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      error = t('form.validation.invalidFormat', language);
    }

    // Custom validation
    if (!error && rules.custom) {
      error = rules.custom(value);
    }

    // Update errors
    setErrors(prev => {
      if (error) {
        return { ...prev, [field]: error };
      } else {
        const { [field as string]: _, ...rest } = prev;
        return rest;
      }
    });

    return !error;
  }, [values, validationRules, language]);

  const validateForm = useCallback((): boolean => {
    const fieldNames = Object.keys(validationRules) as (keyof T)[];
    let isFormValid = true;

    fieldNames.forEach(field => {
      const isFieldValid = validateField(field);
      if (!isFieldValid) {
        isFormValid = false;
      }
    });

    return isFormValid;
  }, [validateField, validationRules]);

  const handleChange = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field if it exists
    if (errors[field as string]) {
      setErrors(prev => {
        const { [field as string]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [errors]);

  const handleSubmit = useCallback((onSubmit: (values: T) => Promise<void> | void) => {
    return async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (isSubmitting) return;
      
      const isFormValid = validateForm();
      if (!isFormValid) return;

      try {
        setIsSubmitting(true);
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    };
  }, [values, validateForm, isSubmitting]);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field as string]: error }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const reset = useCallback((newValues?: Partial<T>) => {
    setValues(newValues ? { ...initialValues, ...newValues } : initialValues);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    isValid,
    isSubmitting,
    handleChange,
    handleSubmit,
    setFieldError,
    clearErrors,
    reset,
    setSubmitting,
    validateField,
    validateForm
  };
}