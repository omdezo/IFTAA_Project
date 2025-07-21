import React from 'react';
import { cn } from '@utils/index';
import { useTranslation } from '@contexts/LanguageContext';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
  showInfo?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalResults,
  pageSize,
  onPageChange,
  className,
  showInfo = true
}) => {
  const { t } = useTranslation();

  // Calculate visible page numbers
  const getVisiblePages = (): number[] => {
    const delta = 2; // Number of pages to show on each side of current page
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter((page, index, array) => 
      page !== array[index - 1] && page !== array[index + 1]
    ) as number[];
  };

  const visiblePages = getVisiblePages();
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalResults);

  if (totalPages <= 1) {
    return showInfo ? (
      <div className={cn('flex justify-center text-sm text-neutral-600', className)}>
        {t('pagination.showing')} {totalResults} {t('common.results')}
      </div>
    ) : null;
  }

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4', className)}>
      {/* Results info */}
      {showInfo && (
        <div className="text-sm text-neutral-600 order-2 sm:order-1">
          {t('pagination.showing')} {startItem} {t('pagination.to')} {endItem} {t('pagination.total')} {totalResults} {t('common.results')}
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-2 order-1 sm:order-2">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">{t('common.previous')}</span>
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => {
            if (typeof page === 'string') {
              return (
                <span key={`dots-${index}`} className="px-2 py-1 text-neutral-400">
                  ...
                </span>
              );
            }

            return (
              <Button
                key={page}
                variant={page === currentPage ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(page)}
                className={cn(
                  'min-w-[2rem] px-2 py-1',
                  page === currentPage && 'bg-islamic-gold text-white'
                )}
              >
                {page}
              </Button>
            );
          })}
        </div>

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1"
        >
          <span className="hidden sm:inline">{t('common.next')}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
};