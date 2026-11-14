import React from 'react';
import { ExerciseCategory } from '../types/index.ts';
import { CATEGORY_COLORS, tint } from '../domain/constants.ts';
import { useApp } from '../context/AppContext.tsx';

interface CategoryChipProps {
  category: ExerciseCategory;
  count?: number;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

// Branded discipline icons drawn inline as SVG so the app owns them
// end-to-end (no lucide dependency for the category pills).
type CatIcon = (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;

function GymIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="9" width="3" height="5" rx="0.75" />
      <rect x="17" y="9" width="3" height="5" rx="0.75" />
      <rect x="6.5" y="11" width="11" height="1.1" rx="0.5" />
      <path d="M9.5 9v6" />
      <path d="M14.5 9v6" />
    </svg>
  );
}

function CalisthenicsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="6" r="2" />
      <path d="M9 8v8" />
      <path d="M5 18c0-2 2-3.5 5-3.5" />
      <path d="M19 18c0-2-2-3.5-5-3.5" />
      <path d="M9 16v3" />
      <path d="M7 12c1-1 3-1.5 4-1.5s3 0.5 4 1.5" opacity="0.6" />
    </svg>
  );
}

function MartialArtsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 11a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2H7z" />
      <path d="M7 15h10v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2z" />
      <path d="M9.5 9l1.5 2 1.5-2" />
      <path d="M13 9l1.5 2 1.5-2" />
      <path d="M9 17.5l2 1.5 2-1.5" />
    </svg>
  );
}

function CardioIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 12h4l2-4 3 8 3-10 2 6h5" />
      <path d="M4 12h2v6h-2" />
      <path d="M18 6h2v4h-2" />
    </svg>
  );
}

function CustomIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 4l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.3l5-.7z" />
    </svg>
  );
}

const CATEGORY_ICONS: Record<ExerciseCategory, CatIcon> = {
  gym: GymIcon,
  calisthenics: CalisthenicsIcon,
  martial_arts: MartialArtsIcon,
  cardio: CardioIcon,
  custom: CustomIcon
};

export const CategoryChip: React.FC<CategoryChipProps> = ({
  category,
  count,
  selected = false,
  onClick,
  className = ''
}) => {
  const { t } = useApp();
  const color = CATEGORY_COLORS[category] || 'var(--cat-gym)';
  const Icon = CATEGORY_ICONS[category] || CustomIcon;

  const label = (t[category as keyof typeof t] as string) || category.replace('_', ' ');

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderInlineStartColor: color,
        borderInlineStartWidth: '3px',
        backgroundColor: selected ? tint(color, 16) : tint(color, 7),
        borderColor: selected ? color : undefined
      }}
      className={`shrink-0 h-8 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors border border-app ${
        selected ? 'text-app-primary' : 'text-app-muted hover:text-app-primary'
      } ${className}`}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color }} aria-hidden="true" />
      <span className="capitalize leading-none whitespace-nowrap">{label}</span>
      {count !== undefined && (
        <span className="tabular-nums text-[10px] opacity-75 font-normal">
          {count}
        </span>
      )}
    </button>
  );
};
