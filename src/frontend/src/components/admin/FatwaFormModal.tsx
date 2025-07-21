import React, { useEffect, useMemo } from 'react';
import { Modal } from '@components/ui/Modal';
import { Input, TextArea, Select, Button } from '@components/ui';
import { useFormValidation, ValidationRules } from '@hooks/useFormValidation';
import { useLanguage } from '@contexts/LanguageContext';
import { t } from '../../translations';
import { Fatwa, CreateFatwaDto, UpdateFatwaDto } from '../../types/index';
import { fatwaApi } from '../../utils/api';

interface FatwaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  fatwa?: Fatwa | null;
  onSuccess?: (fatwa: Fatwa) => void;
}

interface FatwaFormData {
  FatwaId: number;
  TitleAr: string;
  TitleEn: string;
  QuestionAr: string;
  QuestionEn: string;
  AnswerAr: string;
  AnswerEn: string;
  Category: string;
  Tags: string;
  AutoTranslate: boolean;
}

// Mock categories for development
const mockCategories = [
  'فتاوى العبادات',
  'فتاوى الصلاة',
  'فتاوى الزكاة',
  'فتاوى الصوم',
  'فتاوى الحج',
  'فتاوى النكاح',
  'فتاوى الزواج',
  'فتاوى الطلاق',
  'فتاوى المعاملات',
  'فتاوى البيوع',
  'فتاوى الربا',
  'فتاوى الديون'
];

export const FatwaFormModal: React.FC<FatwaFormModalProps> = ({
  isOpen,
  onClose,
  fatwa,
  onSuccess
}) => {
  const { language } = useLanguage();
  const isEditing = !!fatwa;

  // Form initial values
  const initialValues: FatwaFormData = useMemo(() => ({
    FatwaId: fatwa?.FatwaId || Math.floor(Math.random() * 10000) + 9000,
    TitleAr: fatwa?.TitleAr || '',
    TitleEn: fatwa?.TitleEn || '',
    QuestionAr: fatwa?.QuestionAr || '',
    QuestionEn: fatwa?.QuestionEn || '',
    AnswerAr: fatwa?.AnswerAr || '',
    AnswerEn: fatwa?.AnswerEn || '',
    Category: fatwa?.Category || '',
    Tags: fatwa?.Tags?.join(', ') || '',
    AutoTranslate: false
  }), [fatwa]);

  // Validation rules
  const validationRules: ValidationRules = {
    TitleAr: {
      required: true,
      minLength: 5,
      maxLength: 200
    },
    QuestionAr: {
      required: true,
      minLength: 10,
      maxLength: 2000
    },
    AnswerAr: {
      required: true,
      minLength: 20,
      maxLength: 10000
    },
    Category: {
      required: true,
      custom: (value: string) => {
        if (!mockCategories.includes(value)) {
          return t('form.validation.invalidCategory', language);
        }
        return null;
      }
    },
    FatwaId: {
      required: true,
      custom: (value: number) => {
        if (!value || value < 1) {
          return t('form.validation.required', language);
        }
        return null;
      }
    }
  };

  const {
    values,
    errors,
    isValid,
    isSubmitting,
    handleChange,
    handleSubmit,
    reset,
    setFieldError
  } = useFormValidation(initialValues, validationRules);

  // Reset form when modal opens/closes or fatwa changes
  useEffect(() => {
    if (isOpen) {
      reset(initialValues);
    }
  }, [isOpen, initialValues, reset]);

  // Handle form submission
  const onSubmit = async (formData: FatwaFormData) => {
    try {
      const tags = formData.Tags
        ? formData.Tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];

      if (isEditing && fatwa) {
        // Update existing fatwa
        const updateData: UpdateFatwaDto = {
          TitleAr: formData.TitleAr,
          TitleEn: formData.TitleEn || undefined,
          QuestionAr: formData.QuestionAr,
          QuestionEn: formData.QuestionEn || undefined,
          AnswerAr: formData.AnswerAr,
          AnswerEn: formData.AnswerEn || undefined,
          Category: formData.Category,
          Tags: tags.length > 0 ? tags : undefined,
          ReTranslate: formData.AutoTranslate
        };

        const updatedFatwa = await fatwaApi.update(fatwa.FatwaId, updateData) as Fatwa;
        
        if (onSuccess) {
          onSuccess(updatedFatwa);
        }
      } else {
        // Create new fatwa
        const createData: CreateFatwaDto = {
          FatwaId: formData.FatwaId,
          TitleAr: formData.TitleAr,
          QuestionAr: formData.QuestionAr,
          AnswerAr: formData.AnswerAr,
          Category: formData.Category,
          Tags: tags.length > 0 ? tags : undefined,
          AutoTranslate: formData.AutoTranslate
        };

        const newFatwa = await fatwaApi.create(createData) as Fatwa;
        
        if (onSuccess) {
          onSuccess(newFatwa);
        }
      }

      onClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
      
      // Handle specific API errors
      if (error.message?.includes('FatwaId')) {
        setFieldError('FatwaId', t('form.validation.duplicateId', language));
      } else if (error.message?.includes('Category')) {
        setFieldError('Category', t('form.validation.invalidCategory', language));
      } else {
        setFieldError('TitleAr', error.message || t('error.unknown', language));
      }
    }
  };

  // Category options
  const categoryOptions = mockCategories.map(category => ({
    value: category,
    label: category
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('admin.editFatwa', language) : t('admin.createFatwa', language)}
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Fatwa ID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label={t('fatwa.id', language)}
            type="number"
            value={values.FatwaId}
            onChange={(e) => handleChange('FatwaId', parseInt(e.target.value) || 0)}
            error={errors.FatwaId}
            required
            disabled={isEditing}
            placeholder="1001"
          />
          
          <Select
            label={t('fatwa.category', language)}
            value={values.Category}
            onChange={(e) => handleChange('Category', e.target.value)}
            options={categoryOptions}
            placeholder={t('form.pleaseSelect', language)}
            error={errors.Category}
            required
          />
        </div>

        {/* Arabic Title */}
        <Input
          label={t('fatwa.titleAr', language)}
          value={values.TitleAr}
          onChange={(e) => handleChange('TitleAr', e.target.value)}
          error={errors.TitleAr}
          required
          placeholder={language === 'ar' ? 'أدخل عنوان الفتوى بالعربية' : 'Enter Arabic title'}
          className="text-right"
          dir="rtl"
        />

        {/* English Title */}
        <Input
          label={t('fatwa.titleEn', language)}
          value={values.TitleEn}
          onChange={(e) => handleChange('TitleEn', e.target.value)}
          error={errors.TitleEn}
          placeholder={language === 'ar' ? 'أدخل عنوان الفتوى بالإنجليزية (اختياري)' : 'Enter English title (optional)'}
          className="text-left"
          dir="ltr"
        />

        {/* Arabic Question */}
        <TextArea
          label={t('fatwa.questionAr', language)}
          value={values.QuestionAr}
          onChange={(e) => handleChange('QuestionAr', e.target.value)}
          error={errors.QuestionAr}
          required
          rows={4}
          placeholder={language === 'ar' ? 'أدخل نص السؤال بالعربية' : 'Enter Arabic question'}
          className="text-right"
          dir="rtl"
        />

        {/* English Question */}
        <TextArea
          label={t('fatwa.questionEn', language)}
          value={values.QuestionEn}
          onChange={(e) => handleChange('QuestionEn', e.target.value)}
          error={errors.QuestionEn}
          rows={4}
          placeholder={language === 'ar' ? 'أدخل نص السؤال بالإنجليزية (اختياري)' : 'Enter English question (optional)'}
          className="text-left"
          dir="ltr"
        />

        {/* Arabic Answer */}
        <TextArea
          label={t('fatwa.answerAr', language)}
          value={values.AnswerAr}
          onChange={(e) => handleChange('AnswerAr', e.target.value)}
          error={errors.AnswerAr}
          required
          rows={6}
          placeholder={language === 'ar' ? 'أدخل نص الجواب بالعربية' : 'Enter Arabic answer'}
          className="text-right"
          dir="rtl"
        />

        {/* English Answer */}
        <TextArea
          label={t('fatwa.answerEn', language)}
          value={values.AnswerEn}
          onChange={(e) => handleChange('AnswerEn', e.target.value)}
          error={errors.AnswerEn}
          rows={6}
          placeholder={language === 'ar' ? 'أدخل نص الجواب بالإنجليزية (اختياري)' : 'Enter English answer (optional)'}
          className="text-left"
          dir="ltr"
        />

        {/* Tags */}
        <Input
          label={t('fatwa.tags', language)}
          value={values.Tags}
          onChange={(e) => handleChange('Tags', e.target.value)}
          error={errors.Tags}
          placeholder={language === 'ar' ? 'العلامات مفصولة بفواصل' : 'Tags separated by commas'}
        />

        {/* Auto Translate */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="autoTranslate"
            checked={values.AutoTranslate}
            onChange={(e) => handleChange('AutoTranslate', e.target.checked)}
            className="rounded border-neutral-300 text-islamic-gold focus:ring-islamic-gold"
          />
          <label htmlFor="autoTranslate" className="text-sm font-medium text-neutral-700">
            {isEditing ? t('form.reTranslate', language) : t('form.autoTranslate', language)}
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-200">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('common.cancel', language)}
          </Button>
          
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={!isValid}
          >
            {isEditing ? t('common.update', language) : t('common.create', language)}
          </Button>
        </div>

        {/* Helper text */}
        <div className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded-lg">
          <p className="mb-2 font-medium">
            {language === 'ar' ? 'ملاحظات:' : 'Notes:'}
          </p>
          <ul className="space-y-1 text-start" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <li>• {language === 'ar' ? 'الحقول العربية مطلوبة' : 'Arabic fields are required'}</li>
            <li>• {language === 'ar' ? 'الحقول الإنجليزية اختيارية' : 'English fields are optional'}</li>
            <li>• {language === 'ar' ? 'يمكن تفعيل الترجمة التلقائية' : 'Auto-translation can be enabled'}</li>
            <li>• {language === 'ar' ? 'فصل العلامات بفواصل' : 'Separate tags with commas'}</li>
          </ul>
        </div>
      </form>
    </Modal>
  );
};