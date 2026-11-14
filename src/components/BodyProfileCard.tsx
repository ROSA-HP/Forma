import React from 'react';
import { Scale } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  BodyCategory,
  BMI_HEALTHY_MAX,
  BMI_OVERWEIGHT_MAX,
  BMI_UNDERWEIGHT_MAX,
  calculateBodyProfile
} from '../domain/bodyCalculations.ts';
import { kgToLb } from '../domain/calculations.ts';
import { tint } from '../domain/constants.ts';

const CATEGORY_COLOR: Record<BodyCategory, string> = {
  underweight: 'var(--band-maintenance)',
  healthy: 'var(--ready-fresh)',
  overweight: 'var(--band-peak)',
  obese: 'var(--band-deficit)'
};

// BMI span drawn on the scale bar; values outside are pinned to its ends
const SCALE_MIN = 14;
const SCALE_MAX = 38;
const SEGMENTS: { category: BodyCategory; from: number; to: number }[] = [
  { category: 'underweight', from: SCALE_MIN, to: BMI_UNDERWEIGHT_MAX },
  { category: 'healthy', from: BMI_UNDERWEIGHT_MAX, to: BMI_HEALTHY_MAX },
  { category: 'overweight', from: BMI_HEALTHY_MAX, to: BMI_OVERWEIGHT_MAX },
  { category: 'obese', from: BMI_OVERWEIGHT_MAX, to: SCALE_MAX }
];

interface BodyProfileCardProps {
  /** Called from the "add your height" prompt; omit to hide the button (e.g. inside Settings). */
  onOpenSettings?: () => void;
  /** Drops the outer card chrome so it can sit inside another card. */
  embedded?: boolean;
}

/**
 * Body type from the athlete's height and weight (BMI): skinny / healthy /
 * overweight / obese, with the healthy weight range for their height.
 */
export const BodyProfileCard: React.FC<BodyProfileCardProps> = ({ onOpenSettings, embedded = false }) => {
  const { settings, t } = useApp();
  const profile = calculateBodyProfile(settings.heightCm, settings.userBodyweightKg);

  const unit = settings.weightUnit;
  const inUnit = (kg: number) => (unit === 'lb' ? kgToLb(kg) : Math.round(kg * 10) / 10);

  const shell = embedded
    ? 'space-y-3'
    : 'p-4 rounded-xl bg-app-surface border border-app space-y-3';

  const header = (
    <div className="flex items-center gap-1.5">
      <Scale className="w-4 h-4 text-app-accent" />
      <h2 className="font-bold text-base text-app-primary">{t.bodyProfile}</h2>
    </div>
  );

  if (!profile) {
    // Inside Settings the fields sit right above, so there is nothing to prompt for
    if (embedded) return null;
    return (
      <section className={shell}>
        {!embedded && header}
        <p className="text-xs text-app-muted leading-relaxed">{t.bodyAddHeight}</p>
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="h-10 px-4 rounded-xl bg-app-surface-2 border border-app text-xs font-bold text-app-primary hover:border-app-accent transition-colors"
          >
            {t.bodyOpenSettings}
          </button>
        )}
      </section>
    );
  }

  const color = CATEGORY_COLOR[profile.category];
  const markerPct = ((Math.max(SCALE_MIN, Math.min(SCALE_MAX, profile.bmi)) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;

  const deltaText =
    profile.deltaToHealthyKg === 0
      ? t.bodyInRange
      : (profile.deltaToHealthyKg > 0 ? t.bodyBelowRange : t.bodyAboveRange)
          .replace('{amount}', String(inUnit(Math.abs(profile.deltaToHealthyKg))))
          .replace('{unit}', unit);

  return (
    <section className={shell}>
      {!embedded && header}

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted">
            {settings.heightCm} cm · {inUnit(settings.userBodyweightKg)} {unit}
          </span>
          <span className="text-lg font-bold tracking-tight" style={{ color }}>
            {t[`body_${profile.category}` as keyof typeof t]}
          </span>
        </div>
        <div
          className="shrink-0 px-3 py-1.5 rounded-xl border text-center"
          style={{ backgroundColor: tint(color, 12), borderColor: tint(color, 40) }}
        >
          <span className="block text-[9px] font-bold uppercase tracking-wider text-app-muted">{t.bmiLabel}</span>
          <span className="block text-base font-black text-app-primary tabular-nums">{profile.bmi.toFixed(1)}</span>
        </div>
      </div>

      {/* BMI scale: four bands with a marker at the athlete's value */}
      <div dir="ltr" className="pt-1">
        <div className="relative">
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            {SEGMENTS.map(seg => (
              <div
                key={seg.category}
                style={{
                  flexGrow: seg.to - seg.from,
                  flexBasis: 0,
                  backgroundColor: CATEGORY_COLOR[seg.category],
                  opacity: seg.category === profile.category ? 1 : 0.3
                }}
              />
            ))}
          </div>
          <div
            className="absolute -top-1 w-1 h-4 rounded-full -translate-x-1/2"
            style={{ left: `${markerPct}%`, backgroundColor: 'var(--text)', boxShadow: '0 0 0 2px var(--surface)' }}
          />
        </div>
        <div className="relative h-4 mt-1 text-[9px] text-app-muted tabular-nums">
          {[BMI_UNDERWEIGHT_MAX, BMI_HEALTHY_MAX, BMI_OVERWEIGHT_MAX].map(v => (
            <span
              key={v}
              className="absolute -translate-x-1/2"
              style={{ left: `${((v - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%` }}
            >
              {v}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-0.5 text-xs">
        <span className="font-semibold text-app-primary">{deltaText}</span>
        <span className="text-app-muted">
          {t.bodyHealthyRange
            .replace('{min}', String(inUnit(profile.healthyMinKg)))
            .replace('{max}', String(inUnit(profile.healthyMaxKg)))
            .replace('{unit}', unit)}
        </span>
      </div>

      <p className="text-[11px] text-app-muted leading-relaxed">{t.bodyBmiNote}</p>
    </section>
  );
};
