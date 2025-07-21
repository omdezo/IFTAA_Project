import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Fatwa, SearchResult } from '@types/index';
import { useTranslation } from '@contexts/LanguageContext';
import { Card } from '@components/ui';
import { formatDate, truncateText, cn } from '@utils/index';

interface FatwaCardProps {
  fatwa: Fatwa;
  relevanceScore?: number;
  className?: string;
  showCategory?: boolean;
  showRelevance?: boolean;
}

export const FatwaCard: React.FC<FatwaCardProps> = ({
  fatwa,
  relevanceScore,
  className,
  showCategory = true,
  showRelevance = false
}) => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/fatwa/${fatwa.FatwaId}`);
  };

  const title = language === 'ar' ? fatwa.TitleAr : fatwa.TitleEn || fatwa.TitleAr;
  const question = language === 'ar' ? fatwa.QuestionAr : fatwa.QuestionEn || fatwa.QuestionAr;
  const answer = language === 'ar' ? fatwa.AnswerAr : fatwa.AnswerEn || fatwa.AnswerAr;

  return (
    <Card 
      hover 
      className={cn('cursor-pointer transition-all duration-200 hover:shadow-lg', className)}
      onClick={handleClick}
    >
      <div className="space-y-3">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-neutral-800 line-clamp-2 leading-tight">
              {title || t('fatwa.title')}
            </h3>
            
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-neutral-500">
                #{fatwa.FatwaId}
              </span>
              
              {showRelevance && relevanceScore && (
                <span className="text-xs bg-islamic-gold text-white px-2 py-0.5 rounded-full">
                  {Math.round(relevanceScore * 100)}%
                </span>
              )}
            </div>
          </div>
          
          {/* Category Badge */}
          {showCategory && fatwa.Category && (
            <span className="flex-shrink-0 text-xs bg-islamic-blue text-white px-2 py-1 rounded-md font-medium">
              {fatwa.Category}
            </span>
          )}
        </div>

        {/* Question Preview */}
        {question && (
          <div>
            <h4 className="text-sm font-medium text-neutral-700 mb-1">
              {t('fatwa.question')}:
            </h4>
            <p className="text-sm text-neutral-600 line-clamp-2">
              {truncateText(question, 150, language)}
            </p>
          </div>
        )}

        {/* Answer Preview */}
        {answer && (
          <div>
            <h4 className="text-sm font-medium text-neutral-700 mb-1">
              {t('fatwa.answer')}:
            </h4>
            <p className="text-sm text-neutral-600 line-clamp-3">
              {truncateText(answer, 200, language)}
            </p>
          </div>
        )}

        {/* Tags */}
        {fatwa.Tags && fatwa.Tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {fatwa.Tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
            {fatwa.Tags.length > 3 && (
              <span className="text-xs text-neutral-400">
                +{fatwa.Tags.length - 3} {language === 'ar' ? 'أخرى' : 'more'}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <span className="text-xs text-neutral-500">
            {formatDate(fatwa.CreatedAt, language)}
          </span>
          
          <div className="flex items-center gap-1 text-islamic-gold">
            <span className="text-xs font-medium">
              {t('common.view')}
            </span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Card>
  );
};

interface FatwaListProps {
  fatwas: SearchResult[] | Fatwa[];
  className?: string;
  showCategory?: boolean;
  showRelevance?: boolean;
  emptyMessage?: string;
}

export const FatwaList: React.FC<FatwaListProps> = ({
  fatwas,
  className,
  showCategory = true,
  showRelevance = false,
  emptyMessage
}) => {
  const { t } = useTranslation();

  if (fatwas.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-neutral-700 mb-2">
          {emptyMessage || t('dashboard.noFatwas')}
        </h3>
        <p className="text-neutral-500">
          {t('common.noResults')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {fatwas.map((item) => {
        // Handle both SearchResult and Fatwa types
        const fatwa = 'Fatwa' in item ? item.Fatwa : item;
        const relevanceScore = 'RelevanceScore' in item ? item.RelevanceScore : undefined;
        
        return (
          <FatwaCard
            key={fatwa.FatwaId}
            fatwa={fatwa}
            relevanceScore={relevanceScore}
            showCategory={showCategory}
            showRelevance={showRelevance}
          />
        );
      })}
    </div>
  );
};