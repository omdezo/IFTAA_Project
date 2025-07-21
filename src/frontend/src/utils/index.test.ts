import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatArabicNumber, truncateText, debounce } from './index';

describe('cn (classNames utility)', () => {
  it('should merge class names correctly', () => {
    expect(cn('base', 'additional')).toBe('base additional');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional');
  });

  it('should filter out falsy values', () => {
    expect(cn('base', null, undefined, '', 'valid')).toBe('base valid');
  });
});

describe('formatDate', () => {
  it('should format date in Arabic locale', () => {
    const date = new Date('2023-01-15');
    const result = formatDate(date, 'ar');
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it('should format date in English locale', () => {
    const date = new Date('2023-01-15');
    const result = formatDate(date, 'en');
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it('should handle invalid dates', () => {
    const result = formatDate(new Date('invalid'), 'en');
    expect(result).toBe('Invalid Date');
  });
});

describe('formatArabicNumber', () => {
  it('should convert English numbers to Arabic numerals', () => {
    expect(formatArabicNumber(123)).toBe('١٢٣');
    expect(formatArabicNumber(0)).toBe('٠');
    expect(formatArabicNumber(987654321)).toBe('٩٨٧٦٥٤٣٢١');
  });

  it('should handle string numbers', () => {
    expect(formatArabicNumber('456')).toBe('٤٥٦');
  });

  it('should handle non-numeric strings', () => {
    expect(formatArabicNumber('abc')).toBe('abc');
  });
});

describe('truncateText', () => {
  it('should truncate text to specified length', () => {
    const text = 'This is a long text that should be truncated';
    expect(truncateText(text, 20)).toBe('This is a long text…');
  });

  it('should not truncate short text', () => {
    const text = 'Short text';
    expect(truncateText(text, 20)).toBe('Short text');
  });

  it('should handle custom suffix', () => {
    const text = 'This is a long text that should be truncated';
    expect(truncateText(text, 20, '...')).toBe('This is a long text...');
  });

  it('should handle empty text', () => {
    expect(truncateText('', 10)).toBe('');
  });
});

describe('debounce', () => {
  it('should debounce function calls', async () => {
    let count = 0;
    const increment = () => count++;
    const debouncedIncrement = debounce(increment, 100);

    // Call multiple times
    debouncedIncrement();
    debouncedIncrement();
    debouncedIncrement();

    // Should not have executed yet
    expect(count).toBe(0);

    // Wait for debounce delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should have executed once
    expect(count).toBe(1);
  });

  it('should pass arguments to debounced function', async () => {
    let result = '';
    const setResult = (value: string) => { result = value; };
    const debouncedSet = debounce(setResult, 50);

    debouncedSet('test');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(result).toBe('test');
  });
});