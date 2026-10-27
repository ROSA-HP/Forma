import React from 'react';
import { X, Check } from 'lucide-react';
import { ExerciseFilters } from '../domain/collectionCalculations.ts';
import { MUSCLE_GROUPS, REGION_ORDER, REGION_MUSCLES } from '../domain/constants.ts';
import { formatMuscleName, formatRegionName } from '../domain/calculations.ts';
import { EquipmentType, TrackingType } from '../types/index.ts';
import { useApp } from '../context/AppContext.tsx';

interface ExerciseFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ExerciseFilters;
  onChange: (updated: ExerciseFilters) => void;
  onReset: () => void;
}

export const ExerciseFilterSheet: React.FC<ExerciseFilterSheetProps> = ({
  isOpen,
  onClose,
  filters,
  onChange,
  onReset
}) => {
  const { t } = useApp();

  if (!isOpen) return null;

  const equipments: { id: EquipmentType; label: string }[] = [
    { id: 'barbell', label: t.equip_barbell },
    { id: 'dumbbell', label: t.equip_dumbbell },
    { id: 'cable', label: t.equip_cable },
    { id: 'machine', label: t.equip_machine },
    { id: 'bodyweight', label: t.equip_bodyweight },
    { id: 'kettlebell', label: t.equip_kettlebell },
    { id: 'bag', label: t.equip_bag },
    { id: 'cardio_machine', label: t.equip_cardio_machine },
    { id: 'band', label: t.equip_band }
  ];

  const trackingTypes: { id: TrackingType; label: string }[] = [
    { id: 'weight_reps', label: t.tracking_weight_reps },
    { id: 'bodyweight', label: t.tracking_bodyweight },
    { id: 'reps', label: t.tracking_reps },
    { id: 'duration', label: t.tracking_duration },
    { id: 'distance_time', label: t.tracking_distance_time },
    { id: 'rounds', label: t.tracking_rounds }
  ];

  const toggleEquipment = (eq: string) => {
    const list = filters.equipment.includes(eq)
      ? filters.equipment.filter(e => e !== eq)
      : [...filters.equipment, eq];
    onChange({ ...filters, equipment: list });
  };

  const toggleMuscle = (m: string) => {
    const list = filters.muscleGroup.includes(m)
      ? filters.muscleGroup.filter(item => item !== m)
      : [...filters.muscleGroup, m];
    onChange({ ...filters, muscleGroup: list });
  };

  const toggleTracking = (tt: string) => {
    const list = filters.trackingType.includes(tt)
      ? filters.trackingType.filter(item => item !== tt)
      : [...filters.trackingType, tt];
    onChange({ ...filters, trackingType: list });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={t.filterExercises}
    >
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-app-surface border border-app max-h-[88dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-app">
          <h2 className="text-base font-bold text-app-primary">
            {t.filterSortExercises}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-semibold text-app-accent hover:opacity-80 px-2 py-1"
            >
              {t.resetAll}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.closeFilters}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-app-muted hover:text-app-primary hover:bg-app-surface-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Filter Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {/* Sort By */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
              {t.sortBy}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'name', label: t.sortNameAZ },
                { id: 'recently_logged', label: t.sortRecentlyLogged },
                { id: 'most_logged', label: t.sortMostLogged },
                { id: 'category', label: t.sortCategory }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange({ ...filters, sortBy: s.id as any })}
                  className={`h-10 px-3 rounded-lg text-xs font-semibold border flex items-center justify-between transition-colors ${
                    filters.sortBy === s.id
                      ? 'bg-app-accent/15 border-app-accent text-app-accent font-bold'
                      : 'bg-app-surface-2 border-app text-app-muted hover:text-app-primary'
                  }`}
                >
                  <span>{s.label}</span>
                  {filters.sortBy === s.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Tracking Type */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
              {t.loggingMetricFormat}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {trackingTypes.map(tt => {
                const isSelected = filters.trackingType.includes(tt.id);
                return (
                  <button
                    key={tt.id}
                    type="button"
                    onClick={() => toggleTracking(tt.id)}
                    className={`h-10 px-3 rounded-lg text-xs font-semibold border flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-app-accent/15 border-app-accent text-app-accent font-bold'
                        : 'bg-app-surface-2 border-app text-app-muted hover:text-app-primary'
                    }`}
                  >
                    <span className="truncate">{tt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
              Equipment
            </span>
            <div className="flex flex-wrap gap-1.5">
              {equipments.map(eq => {
                const isSelected = filters.equipment.includes(eq.id);
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => toggleEquipment(eq.id)}
                    className={`h-9 px-3 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-app-accent text-on-accent border-app-accent font-bold'
                        : 'bg-app-surface-2 border-app text-app-muted hover:text-app-primary'
                    }`}
                  >
                    <span>{eq.label}</span>
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Muscle Groups by Region */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
              {t.targetMuscleGroup}
            </span>
            <div className="space-y-2.5">
              {REGION_ORDER.map(region => {
                const muscles = REGION_MUSCLES[region];
                return (
                  <div key={region} className="p-2.5 rounded-lg bg-app-surface-2 border border-app space-y-1.5">
                    <span className="text-[11px] font-bold text-app-primary uppercase tracking-wide">
                      {formatRegionName(region)}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {muscles.map(m => {
                        const isSelected = filters.muscleGroup.includes(m);
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => toggleMuscle(m)}
                            className={`h-7 px-2.5 rounded text-[11px] font-medium border transition-colors ${
                              isSelected
                                ? 'bg-app-accent text-on-accent border-app-accent font-bold'
                                : 'bg-app-surface border-app text-app-muted hover:text-app-primary'
                            }`}
                          >
                            {formatMuscleName(m)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* History filter */}
          <div className="space-y-2 pt-1 border-t border-app">
            <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
              {t.workoutHistory}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...filters, loggedOnly: !filters.loggedOnly, neverLoggedOnly: false })}
                className={`h-10 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                  filters.loggedOnly
                    ? 'bg-app-accent text-on-accent border-app-accent font-bold'
                    : 'bg-app-surface-2 border-app text-app-muted hover:text-app-primary'
                }`}
              >
                <span>{t.loggedBefore}</span>
                {filters.loggedOnly && <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...filters, neverLoggedOnly: !filters.neverLoggedOnly, loggedOnly: false })}
                className={`h-10 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                  filters.neverLoggedOnly
                    ? 'bg-app-accent text-on-accent border-app-accent font-bold'
                    : 'bg-app-surface-2 border-app text-app-muted hover:text-app-primary'
                }`}
              >
                <span>{t.neverLogged}</span>
                {filters.neverLoggedOnly && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-app bg-app-surface">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-app-accent text-on-accent font-bold text-sm flex items-center justify-center transition-opacity hover:opacity-90 active:scale-[0.99]"
          >
            {t.applyFilters}
          </button>
        </div>
      </div>
    </div>
  );
};
