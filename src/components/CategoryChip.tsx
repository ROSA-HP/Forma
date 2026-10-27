import React from 'react';
import { ExerciseCategory } from '../types/index.ts';
import { CATEGORY_COLORS } from '../domain/constants.ts';
import { useApp } from '../context/AppContext.tsx';

interface CategoryChipProps {
  category: ExerciseCategory;
  count?: number;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({
  category,
  count,
  selected = false,
  onClick,
  className = ''
}) => {
  const { t } = useApp();
  const color = CATEGORY_COLORS[category] || '#60A5FA';

  const label = t[category as keyof typeof t] || category;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderInlineStartColor: color,
        borderInlineStartWidth: '3px',
        backgroundColor: selected ? `${color}25` : `${color}10`,
        borderColor: selected ? color : undefined
      }}
      className={`shrink-0 h-8 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors border-t border-b border-inline-end border-app ${
        selected ? 'text-app-primary' : 'text-app-muted hover:text-app-primary'
      } ${className}`}
    >
      <span 
        className="w-2 h-2 rounded-full" 
        style={{ backgroundColor: color }} 
        aria-hidden="true" 
      />
      <span>{label}</span>
      {count !== undefined && (
        <span className="tabular-nums text-[10px] opacity-75 font-normal">
          {count}
        </span>
      )}
    </button>
  );
};
