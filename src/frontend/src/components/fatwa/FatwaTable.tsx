import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fatwa, SearchResult } from '@types/index';
import { useLanguage } from '@contexts/LanguageContext';
import { useAuth } from '@contexts/AuthContext';
import { Button, LoadingSpinner } from '@components/ui';
import { t } from '../../translations';
import { formatDate, truncateText, cn } from '@utils/index';

interface FatwaTableProps {
  fatwas: SearchResult[] | Fatwa[];
  isLoading?: boolean;
  showRelevance?: boolean;
  onEdit?: (fatwa: Fatwa) => void;
  onDelete?: (fatwa: Fatwa) => void;
  onBulkDelete?: (fatwaIds: number[]) => void;
  className?: string;
}

interface TableHeaderProps {
  children: React.ReactNode;
  sortKey?: string;
  onSort?: (key: string) => void;
  currentSort?: { key: string; direction: 'asc' | 'desc' };
  className?: string;
}

const TableHeader: React.FC<TableHeaderProps> = ({
  children,
  sortKey,
  onSort,
  currentSort,
  className
}) => {
  const { language } = useLanguage();
  const isSorted = currentSort?.key === sortKey;
  
  return (
    <th className={cn(
      'px-4 py-3 text-start text-xs font-medium text-neutral-500 uppercase tracking-wider',
      sortKey && 'cursor-pointer hover:bg-neutral-50 select-none',
      className
    )}>
      <div 
        className="flex items-center gap-2"
        onClick={() => sortKey && onSort?.(sortKey)}
      >
        {children}
        {sortKey && (
          <svg 
            className={cn(
              'w-4 h-4 transition-transform',
              isSorted && currentSort?.direction === 'desc' && 'rotate-180',
              !isSorted && 'text-neutral-300'
            )}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </div>
    </th>
  );
};

// Mock data for development
const generateMockFatwas = (): Fatwa[] => [
  {
    FatwaId: 1001,
    TitleAr: 'أحكام الصلاة في السفر',
    TitleEn: 'Prayer Rules During Travel',
    QuestionAr: 'ما هي أحكام الصلاة عند السفر؟',
    QuestionEn: 'What are the prayer rules during travel?',
    AnswerAr: 'يجوز للمسافر قصر الصلاة الرباعية إلى ركعتين...',
    AnswerEn: 'A traveler may shorten four-unit prayers to two units...',
    Category: 'فتاوى الصلاة',
    Tags: ['صلاة', 'سفر', 'قصر'],
    CreatedAt: '2024-01-15T10:30:00Z',
    UpdatedAt: '2024-01-15T10:30:00Z'
  },
  {
    FatwaId: 1002,
    TitleAr: 'زكاة الأموال المدخرة',
    TitleEn: 'Zakat on Savings',
    QuestionAr: 'كيف تحسب زكاة الأموال المدخرة؟',
    QuestionEn: 'How is zakat calculated on savings?',
    AnswerAr: 'تحسب زكاة المال بنسبة 2.5% من المبلغ المدخر...',
    AnswerEn: 'Zakat on money is calculated at 2.5% of the saved amount...',
    Category: 'فتاوى الزكاة',
    Tags: ['زكاة', 'مال', 'حساب'],
    CreatedAt: '2024-01-14T14:20:00Z',
    UpdatedAt: '2024-01-14T14:20:00Z'
  },
  {
    FatwaId: 1003,
    TitleAr: 'صيام الحامل والمرضع',
    TitleEn: 'Fasting for Pregnant and Nursing Women',
    QuestionAr: 'هل يجب على الحامل والمرضع الصيام؟',
    QuestionEn: 'Must pregnant and nursing women fast?',
    AnswerAr: 'يرخص للحامل والمرضع الإفطار إذا خافتا على نفسيهما أو ولديهما...',
    AnswerEn: 'Pregnant and nursing women are permitted to break their fast if they fear for themselves or their children...',
    Category: 'فتاوى الصوم',
    Tags: ['صيام', 'حمل', 'رضاعة'],
    CreatedAt: '2024-01-13T09:15:00Z',
    UpdatedAt: '2024-01-13T09:15:00Z'
  },
  {
    FatwaId: 1004,
    TitleAr: 'أحكام النكاح في الإسلام',
    TitleEn: 'Marriage Rules in Islam',
    QuestionAr: 'ما هي الشروط الأساسية للنكاح في الإسلام؟',
    QuestionEn: 'What are the basic conditions for marriage in Islam?',
    AnswerAr: 'يشترط في النكاح الولي والشاهدان والمهر...',
    AnswerEn: 'Marriage requires a guardian, two witnesses, and a dowry...',
    Category: 'فتاوى النكاح',
    Tags: ['نكاح', 'شروط', 'زواج'],
    CreatedAt: '2024-01-12T16:45:00Z',
    UpdatedAt: '2024-01-12T16:45:00Z'
  },
  {
    FatwaId: 1005,
    TitleAr: 'أحكام البيع والشراء',
    TitleEn: 'Buying and Selling Rules',
    QuestionAr: 'ما هي الشروط الشرعية للبيع والشراء؟',
    QuestionEn: 'What are the Islamic conditions for buying and selling?',
    AnswerAr: 'يشترط في البيع رضا الطرفين ووضوح المبيع والثمن...',
    AnswerEn: 'Sale requires mutual consent and clarity of goods and price...',
    Category: 'فتاوى المعاملات',
    Tags: ['بيع', 'شراء', 'معاملات'],
    CreatedAt: '2024-01-11T11:30:00Z',
    UpdatedAt: '2024-01-11T11:30:00Z'
  }
];

export const FatwaTable: React.FC<FatwaTableProps> = ({
  fatwas: fatwasProp,
  isLoading = false,
  showRelevance = false,
  onEdit,
  onDelete,
  onBulkDelete,
  className
}) => {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const isAdmin = user?.role === 'admin';
  
  // Use mock data for development if no fatwas provided
  const fatwas = useMemo(() => {
    if (fatwasProp.length === 0 && !isLoading) {
      return generateMockFatwas().map(fatwa => ({ Fatwa: fatwa, RelevanceScore: Math.random() }));
    }
    return fatwasProp;
  }, [fatwasProp, isLoading]);

  // Sort fatwas
  const sortedFatwas = useMemo(() => {
    if (!sortConfig) return fatwas;

    return [...fatwas].sort((a, b) => {
      const fatwaA = 'Fatwa' in a ? a.Fatwa : a;
      const fatwaB = 'Fatwa' in b ? b.Fatwa : b;
      
      let aValue: any, bValue: any;
      
      switch (sortConfig.key) {
        case 'id':
          aValue = fatwaA.FatwaId;
          bValue = fatwaB.FatwaId;
          break;
        case 'title':
          aValue = language === 'ar' ? fatwaA.TitleAr : fatwaA.TitleEn || fatwaA.TitleAr;
          bValue = language === 'ar' ? fatwaB.TitleAr : fatwaB.TitleEn || fatwaB.TitleAr;
          break;
        case 'category':
          aValue = fatwaA.Category;
          bValue = fatwaB.Category;
          break;
        case 'date':
          aValue = new Date(fatwaA.CreatedAt).getTime();
          bValue = new Date(fatwaB.CreatedAt).getTime();
          break;
        case 'relevance':
          aValue = 'RelevanceScore' in a ? a.RelevanceScore : 0;
          bValue = 'RelevanceScore' in b ? b.RelevanceScore : 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [fatwas, sortConfig, language]);

  // Handle sort
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Handle row selection
  const handleSelectRow = (fatwaId: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(fatwaId)) {
      newSelected.delete(fatwaId);
    } else {
      newSelected.add(fatwaId);
    }
    setSelectedRows(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedRows.size === sortedFatwas.length) {
      setSelectedRows(new Set());
    } else {
      const allIds = sortedFatwas.map(item => {
        const fatwa = 'Fatwa' in item ? item.Fatwa : item;
        return fatwa.FatwaId;
      });
      setSelectedRows(new Set(allIds));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedRows.size > 0 && onBulkDelete) {
      onBulkDelete(Array.from(selectedRows));
      setSelectedRows(new Set());
    }
  };

  // Handle view fatwa
  const handleViewFatwa = (fatwa: Fatwa) => {
    navigate(`/fatwa/${fatwa.FatwaId}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" text={t('common.loading', language)} />
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-lg border border-neutral-200 overflow-hidden', className)}>
      
      {/* Table Header Actions */}
      {isAdmin && selectedRows.size > 0 && (
        <div className="border-b border-neutral-200 px-4 py-3 bg-neutral-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-700">
              {t('admin.bulk.selected', language, { count: selectedRows.size })}
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDelete}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              }
            >
              {t('admin.bulk.delete', language)}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              {/* Select All Checkbox */}
              {isAdmin && (
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === sortedFatwas.length && sortedFatwas.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-neutral-300 text-islamic-gold focus:ring-islamic-gold"
                  />
                </th>
              )}
              
              <TableHeader
                sortKey="id"
                onSort={handleSort}
                currentSort={sortConfig}
                className="w-20"
              >
                {t('table.id', language)}
              </TableHeader>
              
              <TableHeader
                sortKey="title"
                onSort={handleSort}
                currentSort={sortConfig}
              >
                {t('table.title', language)}
              </TableHeader>
              
              <TableHeader
                sortKey="category"
                onSort={handleSort}
                currentSort={sortConfig}
                className="w-40"
              >
                {t('table.category', language)}
              </TableHeader>
              
              {showRelevance && (
                <TableHeader
                  sortKey="relevance"
                  onSort={handleSort}
                  currentSort={sortConfig}
                  className="w-24"
                >
                  {t('fatwa.relevanceScore', language)}
                </TableHeader>
              )}
              
              <TableHeader
                sortKey="date"
                onSort={handleSort}
                currentSort={sortConfig}
                className="w-32"
              >
                {t('table.date', language)}
              </TableHeader>
              
              <TableHeader className="w-32">
                {t('table.actions', language)}
              </TableHeader>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-neutral-200">
            {sortedFatwas.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 + (showRelevance ? 1 : 0) : 5 + (showRelevance ? 1 : 0)} className="px-4 py-12 text-center text-neutral-500">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-neutral-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium mb-2">{t('table.noData', language)}</p>
                    <p className="text-sm">{t('common.noResults', language)}</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedFatwas.map((item) => {
                const fatwa = 'Fatwa' in item ? item.Fatwa : item;
                const relevanceScore = 'RelevanceScore' in item ? item.RelevanceScore : undefined;
                const isSelected = selectedRows.has(fatwa.FatwaId);
                const title = language === 'ar' ? fatwa.TitleAr : fatwa.TitleEn || fatwa.TitleAr;
                
                return (
                  <tr
                    key={fatwa.FatwaId}
                    className={cn(
                      'hover:bg-neutral-50 transition-colors',
                      isSelected && 'bg-islamic-gold bg-opacity-10'
                    )}
                  >
                    {/* Select Checkbox */}
                    {isAdmin && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(fatwa.FatwaId)}
                          className="rounded border-neutral-300 text-islamic-gold focus:ring-islamic-gold"
                        />
                      </td>
                    )}
                    
                    {/* ID */}
                    <td className="px-4 py-4 text-sm font-medium text-neutral-900">
                      #{fatwa.FatwaId}
                    </td>
                    
                    {/* Title */}
                    <td className="px-4 py-4">
                      <div className="max-w-xs">
                        <button
                          onClick={() => handleViewFatwa(fatwa)}
                          className="text-sm font-medium text-islamic-blue hover:text-islamic-blue-dark text-start"
                        >
                          {truncateText(title || '', 80, language)}
                        </button>
                        {fatwa.QuestionAr && (
                          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                            {truncateText(
                              language === 'ar' ? fatwa.QuestionAr : fatwa.QuestionEn || fatwa.QuestionAr, 
                              100, 
                              language
                            )}
                          </p>
                        )}
                      </div>
                    </td>
                    
                    {/* Category */}
                    <td className="px-4 py-4 text-sm text-neutral-900">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-islamic-blue text-white">
                        {fatwa.Category}
                      </span>
                    </td>
                    
                    {/* Relevance Score */}
                    {showRelevance && (
                      <td className="px-4 py-4 text-sm text-neutral-900">
                        {relevanceScore && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-islamic-gold text-white">
                            {Math.round(relevanceScore * 100)}%
                          </span>
                        )}
                      </td>
                    )}
                    
                    {/* Date */}
                    <td className="px-4 py-4 text-sm text-neutral-500">
                      {formatDate(fatwa.CreatedAt, language)}
                    </td>
                    
                    {/* Actions */}
                    <td className="px-4 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewFatwa(fatwa)}
                          className="p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Button>
                        
                        {isAdmin && onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(fatwa)}
                            className="p-1 text-islamic-gold hover:text-islamic-gold-dark"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                        )}
                        
                        {isAdmin && onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(fatwa)}
                            className="p-1 text-red-600 hover:text-red-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};