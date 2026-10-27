import React, { useState } from 'react';
import { X, Search, Check, Plus } from 'lucide-react';
import { Exercise, ExerciseCategory } from '../types/index.ts';
import { useApp } from '../context/AppContext.tsx';
import { CategoryChip } from './CategoryChip.tsx';
import { CATEGORY_COLORS } from '../domain/constants.ts';

interface ExercisePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExercises: (selectedExerciseIds: string[]) => void;
  alreadySelectedIds?: string[];
}

export const ExercisePickerModal: React.FC<ExercisePickerModalProps> = ({
  isOpen,
  onClose,
  onAddExercises,
  alreadySelectedIds = []
}) => {
  const { exercises, t } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filtered = exercises.filter(ex => {
    if (category !== 'all' && ex.category !== category) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = ex.name.toLowerCase().includes(q);
      const matchMuscle = ex.primaryMuscles.some(m => m.toLowerCase().includes(q));
      const matchEquip = ex.equipment.toLowerCase().includes(q);
      if (!matchName && !matchMuscle && !matchEquip) return false;
    }
    return true;
  });

  const handleConfirm = () => {
    onAddExercises(Array.from(selectedIds));
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={t.addExercisesToWorkout}
    >        <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-app-surface border border-app max-h-[88dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-app">
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-app-primary">
              {t.addExercises}
            </h2>
            <span className="text-xs text-app-muted">
              {t.selectMovements}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}              aria-label={t.closePicker}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-app-muted hover:text-app-primary hover:bg-app-surface-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Categories */}
        <div className="p-4 pb-2 space-y-3 border-b border-app">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute start-3 text-app-muted pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPickerPlaceholder}
              className="w-full h-11 ps-9 pe-4 rounded-xl bg-app-surface-2 border border-app text-sm text-app-primary placeholder:text-app-muted/60 focus:outline-none focus:border-app-accent"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`shrink-0 h-7 px-3 rounded-md text-xs font-semibold border transition-colors ${
                category === 'all'
                  ? 'bg-app-accent text-on-accent border-app-accent font-bold'
                  : 'bg-app-surface-2 border-app text-app-muted hover:text-app-primary'
              }`}
            >
              {t.all}
            </button>
            {(['gym', 'calisthenics', 'martial_arts', 'cardio'] as ExerciseCategory[]).map(cat => (
              <CategoryChip
                key={cat}
                category={cat}
                selected={category === cat}
                onClick={() => setCategory(cat)}
                className="h-7"
              />
            ))}
          </div>
        </div>

        {/* Scrollable Exercise List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.map(ex => {
            const isChecked = selectedIds.has(ex.id);
            const isAlreadyIn = alreadySelectedIds.includes(ex.id);
            const catColor = CATEGORY_COLORS[ex.category] || '#60A5FA';

            return (
              <div
                key={ex.id}
                onClick={() => toggleSelect(ex.id)}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  isChecked
                    ? 'bg-app-accent/15 border-app-accent'
                    : 'bg-app-surface-2 border-app hover:border-app-accent/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-1 self-stretch rounded-full shrink-0" 
                    style={{ backgroundColor: catColor }} 
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-app-primary truncate">
                        {ex.name}
                      </span>
                      {isAlreadyIn && (
                        <span className="text-[10px] uppercase font-bold text-app-muted px-1.5 py-0.2 rounded bg-app-surface border border-app">
                          In workout
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-app-muted capitalize">
                      {ex.category} · {ex.equipment} · {ex.primaryMuscles.join(', ')}
                    </span>
                  </div>
                </div>

                <div 
                  className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    isChecked
                      ? 'bg-app-accent border-app-accent text-on-accent'
                      : 'border-app text-transparent'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-app-muted">
              No exercises match your search query.
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 border-t border-app bg-app-surface">
          <button
            type="button"
            disabled={selectedIds.size === 0}
            onClick={handleConfirm}
            className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              selectedIds.size > 0
                ? 'bg-app-accent text-on-accent cursor-pointer active:scale-[0.99]'
                : 'bg-app-surface-2 border border-app text-app-muted cursor-not-allowed opacity-60'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Selected ({selectedIds.size})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
