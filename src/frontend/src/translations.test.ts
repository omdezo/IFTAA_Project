import { describe, it, expect } from 'vitest';
import { t } from './translations';

describe('translations', () => {
  it('should return correct translation for Arabic', () => {
    expect(t('common.loading', 'ar')).toBe('جاري التحميل...');
    expect(t('common.search', 'ar')).toBe('البحث');
    expect(t('common.save', 'ar')).toBe('حفظ');
  });

  it('should return correct translation for English', () => {
    expect(t('common.loading', 'en')).toBe('Loading...');
    expect(t('common.search', 'en')).toBe('Search');
    expect(t('common.save', 'en')).toBe('Save');
  });

  it('should handle parameter interpolation', () => {
    const result = t('form.validation.minLength', 'en', { min: 5 });
    expect(result).toBe('Minimum 5 characters required');
    
    const resultAr = t('form.validation.minLength', 'ar', { min: 5 });
    expect(resultAr).toBe('الحد الأدنى 5 أحرف مطلوب');
  });

  it('should handle multiple parameters', () => {
    const result = t('search.resultsFound', 'en', { count: 25, query: 'prayer' });
    expect(result).toBe('Found 25 results for "prayer"');
  });

  it('should fallback to key if translation not found', () => {
    expect(t('nonexistent.key', 'en')).toBe('nonexistent.key');
    expect(t('nonexistent.key', 'ar')).toBe('nonexistent.key');
  });

  it('should handle missing parameters gracefully', () => {
    const result = t('form.validation.minLength', 'en');
    expect(result).toBe('Minimum {min} characters required');
  });

  it('should handle null/undefined parameters', () => {
    expect(t('common.loading', 'en', null)).toBe('Loading...');
    expect(t('common.loading', 'en', undefined)).toBe('Loading...');
  });

  it('should work with nested translation keys', () => {
    expect(t('fatwa.details.question', 'ar')).toBe('السؤال');
    expect(t('fatwa.details.answer', 'en')).toBe('Answer');
    expect(t('admin.users.create', 'ar')).toBe('إنشاء مستخدم جديد');
  });
});