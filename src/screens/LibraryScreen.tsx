import React, { useState } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  Pin, 
  Plus, 
  MoreVertical, 
  TrendingUp, 
  Trophy, 
  Dumbbell, 
  Accessibility, 
  Swords, 
  HeartPulse, 
  Folders, 
  Upload, 
  Copy, 
  Edit3, 
  Archive, 
  Check, 
  Clock 
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { CategoryChip } from '../components/CategoryChip.tsx';
import { ExerciseFilterSheet } from '../components/ExerciseFilterSheet.tsx';
import { Dialog } from '../components/Dialog.tsx';
import { Exercise, ExerciseCategory, Collection } from '../types/index.ts';
import { CATEGORY_COLORS } from '../domain/constants.ts';
import { formatMuscleName } from '../domain/calculations.ts';
import { filterAndSortExercises, ExerciseFilters } from '../domain/collectionCalculations.ts';
import { HapticsService } from '../services/haptics.ts';

export const LibraryScreen: React.FC = () => {
  const { 
    exercises, 
    collections, 
    sessions, 
    saveCollection, 
    togglePinExercise, 
    toggleArchiveExercise, 
    duplicateExercise, 
    setActiveCollectionId, 
    setActiveExerciseModal, 
    t 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'exercises' | 'collections'>('exercises');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [activeMenuExId, setActiveMenuExId] = useState<string | null>(null);
  const [isNewCollectionDialogOpen, setIsNewCollectionDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [addToColExercise, setAddToColExercise] = useState<Exercise | null>(null);

  const defaultFilters: ExerciseFilters = {
    searchQuery: '',
    category: 'all',
    equipment: [],
    muscleGroup: [],
    trackingType: [],
    loggedOnly: false,
    neverLoggedOnly: false,
    sortBy: 'name'
  };

  const [filters, setFilters] = useState<ExerciseFilters>(defaultFilters);

  // Compute category counts
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: exercises.filter(e => !e.isArchived).length };
    exercises.forEach(e => {
      if (!e.isArchived) {
        counts[e.category] = (counts[e.category] || 0) + 1;
      }
    });
    return counts;
  }, [exercises]);

  // Non-archived exercises for primary view
  const activeExercises = React.useMemo(() => {
    return exercises.filter(e => !e.isArchived);
  }, [exercises]);

  const filteredExercises = React.useMemo(() => {
    return filterAndSortExercises(activeExercises, filters, sessions);
  }, [activeExercises, filters, sessions]);

  // Pinned and recently logged items
  const pinnedExercises = React.useMemo(() => {
    return activeExercises.filter(e => e.isPinned);
  }, [activeExercises]);

  const handleCreateNewCollection = async () => {
    if (!newCollectionName.trim()) return;
    HapticsService.medium();
    const newCol: Collection = {
      id: crypto.randomUUID(),
      name: newCollectionName.trim(),
      goal: 'hypertrophy',
      items: []
    };
    await saveCollection(newCol);
    setNewCollectionName('');
    setIsNewCollectionDialogOpen(false);
    setActiveCollectionId(newCol.id);
  };

  const handleImportCollection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.name && Array.isArray(parsed.items)) {
          const importedCol: Collection = {
            ...parsed,
            id: crypto.randomUUID()
          };
          await saveCollection(importedCol);
          setActiveCollectionId(importedCol.id);
        }
      } catch {
        //
      }
    };
    reader.readAsText(file);
  };

  const handleAddExerciseToCollection = async (collectionId: string) => {
    if (!addToColExercise) return;
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;

    await saveCollection({
      ...col,
      items: [
        ...col.items,
        {
          exerciseId: addToColExercise.id,
          role: 'compound',
          sets: 3,
          repsMin: addToColExercise.defaultRepMin || 8,
          repsMax: addToColExercise.defaultRepMax || 12,
          restSec: addToColExercise.defaultRestSec || 75
        }
      ]
    });
    setAddToColExercise(null);
  };

  const getCategoryIcon = (category: ExerciseCategory) => {
    switch (category) {
      case 'gym':
        return Dumbbell;
      case 'calisthenics':
        return Accessibility;
      case 'martial_arts':
        return Swords;
      case 'cardio':
        return HeartPulse;
      default:
        return Dumbbell;
    }
  };

  const formatTypedPRChip = (ex: Exercise): string => {
    switch (ex.trackingType) {
      case 'weight_reps':
        return t.prChipWeight;
      case 'bodyweight':
        return t.prChipBodyweight;
      case 'reps':
        return t.prChipReps;
      case 'rounds':
        return t.prChipRounds;
      case 'distance_time':
        return t.prChipDistance;
      case 'duration':
        return t.prChipDuration;
      default:
        return t.prChipRecord;
    }
  };

  return (
    <div className="flex flex-col w-full px-4 pt-20 pb-32 max-w-xl mx-auto space-y-4">
      {/* Exercises | Collections Segmented Switcher */}
      <div className="grid grid-cols-2 p-1 bg-app-surface-2 border border-app rounded-xl">
        <button
          type="button"
          onClick={() => {
            HapticsService.light();
            setActiveTab('exercises');
          }}
          className={`h-10 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === 'exercises'
              ? 'bg-app-accent text-on-accent'
              : 'text-app-muted hover:text-app-primary'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span>{t.exercises}</span>
          <span className="tabular-nums">({activeExercises.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            HapticsService.light();
            setActiveTab('collections');
          }}
          className={`h-10 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeTab === 'collections'
              ? 'bg-app-accent text-on-accent'
              : 'text-app-muted hover:text-app-primary'
          }`}
        >
          <Folders className="w-4 h-4" />
          <span>{t.collectionsTab}</span>
          <span className="tabular-nums">({collections.length})</span>
        </button>
      </div>

      {activeTab === 'exercises' ? (
        <>
          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 absolute start-3 text-app-muted pointer-events-none" />
              <input
                type="search"
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                placeholder={t.searchLibraryPlaceholder.replace('{count}', String(activeExercises.length))}
                className="w-full h-12 ps-10 pe-4 rounded-xl bg-app-surface border border-app text-sm text-app-primary placeholder:text-app-muted/60 focus:outline-none focus:border-app-accent"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
              aria-label={t.filterExercises}
              className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                filters.equipment.length > 0 || filters.muscleGroup.length > 0 || filters.trackingType.length > 0 || filters.loggedOnly || filters.neverLoggedOnly
                  ? 'bg-app-accent/20 border-app-accent text-app-accent'
                  : 'bg-app-surface border-app text-app-muted hover:text-app-primary hover:bg-app-surface-2'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Category Chips Carousel with Live Counts */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4">
            <button
              type="button"
              onClick={() => setFilters({ ...filters, category: 'all' })}
              className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                filters.category === 'all'
                  ? 'bg-app-accent text-on-accent border-app-accent'
                  : 'bg-app-surface border-app text-app-muted hover:text-app-primary'
              }`}
            >
              <span>{t.all}</span>
              <span className="tabular-nums text-[10px]">{categoryCounts.all}</span>
            </button>

            {(['gym', 'calisthenics', 'martial_arts', 'cardio', 'custom'] as ExerciseCategory[]).map(cat => (
              <CategoryChip
                key={cat}
                category={cat}
                count={categoryCounts[cat] || 0}
                selected={filters.category === cat}
                onClick={() => setFilters({ ...filters, category: cat })}
              />
            ))}
          </div>

          {/* Section 1: Recently Logged & Pinned (Quick Access) */}
          {pinnedExercises.length > 0 && !filters.searchQuery && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-app-muted">
                  <Pin className="w-3.5 h-3.5 text-app-accent" />
                  <span>{t.recentlyPinned}</span>
                </div>
                <span className="text-xs text-app-muted">{pinnedExercises.length} {t.quickAccess}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {pinnedExercises.slice(0, 2).map((ex) => {
                  const Icon = getCategoryIcon(ex.category);
                  const color = CATEGORY_COLORS[ex.category] || '#60A5FA';
                  const prChip = formatTypedPRChip(ex);

                  return (
                    <div
                      key={ex.id}
                      onClick={() => setActiveExerciseModal({ mode: 'edit', exerciseId: ex.id })}
                      className="p-3.5 rounded-xl bg-app-surface border border-app flex flex-col justify-between gap-3 hover:border-app-accent/60 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${color}20`, color: color }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="px-2 py-0.5 rounded bg-app-surface-2 border border-app text-xs font-bold text-app-accent tabular-nums">
                          {prChip}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-app-primary leading-tight line-clamp-2">
                          {ex.name}
                        </h3>
                        <p className="text-[11px] text-app-muted mt-1 capitalize truncate">
                          {ex.primaryMuscles.map(formatMuscleName).join(', ') || t.conditioning} • {ex.equipment}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-app-muted text-xs pt-1 border-t border-app/60">
                        <span>{t.twoDaysAgo}</span>
                        <TrendingUp className="w-3.5 h-3.5 text-app-accent" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: All Exercises (A-Z) List */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
                All Exercises ({filteredExercises.length})
              </span>
              <span className="text-xs text-app-muted capitalize">
                Sort: {filters.sortBy.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-2">
              {filteredExercises.map(ex => {
                const color = CATEGORY_COLORS[ex.category] || '#60A5FA';
                const Icon = getCategoryIcon(ex.category);
                const prChip = formatTypedPRChip(ex);
                const isMenuOpen = activeMenuExId === ex.id;

                return (
                  <div
                    key={ex.id}
                    className="relative rounded-xl bg-app-surface border border-app flex items-stretch overflow-hidden hover:border-app-accent/50 transition-colors"
                  >
                    {/* Leading 4px Vertical Discipline Stripe */}
                    <div 
                      className="w-1 self-stretch shrink-0" 
                      style={{ backgroundColor: color }} 
                    />

                    <div className="flex-1 p-3 flex items-center justify-between gap-3 min-w-0">
                      {/* Left: Icon & Text */}
                      <div 
                        onClick={() => setActiveExerciseModal({ mode: 'edit', exerciseId: ex.id })}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${color}15`, color: color }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="flex flex-col min-w-0">
                          {/* 2-Line wrapping title per deviation guidelines */}
                          <h3 className="font-bold text-sm text-app-primary line-clamp-2 leading-tight">
                            {ex.name}
                          </h3>

                          <div className="flex items-center gap-1.5 text-[11px] text-app-muted mt-1 flex-wrap">
                            {ex.primaryMuscles.slice(0, 2).map(m => (
                              <span 
                                key={m}
                                className="px-1.5 py-0.5 rounded bg-app-surface-2 border border-app text-app-primary font-medium"
                              >
                                {formatMuscleName(m)}
                              </span>
                            ))}
                            {ex.primaryMuscles.length > 2 && (
                              <span className="text-app-muted">
                                +{ex.primaryMuscles.length - 2}
                              </span>
                            )}
                            <span>•</span>
                            <span className="capitalize">{ex.equipment}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: PR Chip & Context Overflow */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="px-2 py-0.5 rounded bg-app-surface-2 border border-app text-xs font-bold text-app-accent tabular-nums">
                            {prChip}
                          </span>
                          <span className="text-[10px] text-app-muted mt-0.5">
                            3 sets logged
                          </span>
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuExId(isMenuOpen ? null : ex.id)}
                            aria-label={`Actions for ${ex.name}`}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-app-muted hover:text-app-primary hover:bg-app-surface-2"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Context Overflow Menu */}
                          {isMenuOpen && (
                            <div className="absolute end-0 top-10 w-44 rounded-xl bg-app-surface border border-app p-1.5 z-40 flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuExId(null);
                                  setActiveExerciseModal({ mode: 'edit', exerciseId: ex.id });
                                }}
                                className="w-full h-9 px-2.5 rounded-lg text-xs font-semibold text-app-primary flex items-center gap-2 hover:bg-app-surface-2"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-app-muted" />
                                <span>{t.editExercise}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuExId(null);
                                  duplicateExercise(ex.id);
                                }}
                                className="w-full h-9 px-2.5 rounded-lg text-xs font-semibold text-app-primary flex items-center gap-2 hover:bg-app-surface-2"
                              >
                                <Copy className="w-3.5 h-3.5 text-app-muted" />
                                <span>{t.duplicate}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuExId(null);
                                  togglePinExercise(ex.id);
                                }}
                                className="w-full h-9 px-2.5 rounded-lg text-xs font-semibold text-app-primary flex items-center gap-2 hover:bg-app-surface-2"
                              >
                                <Pin className="w-3.5 h-3.5 text-app-accent" />
                                <span>{ex.isPinned ? t.unpin : t.pinToTop}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuExId(null);
                                  setAddToColExercise(ex);
                                }}
                                className="w-full h-9 px-2.5 rounded-lg text-xs font-semibold text-app-primary flex items-center gap-2 hover:bg-app-surface-2"
                              >
                                <Plus className="w-3.5 h-3.5 text-app-muted" />
                                <span>{t.addToWorkout}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuExId(null);
                                  toggleArchiveExercise(ex.id);
                                }}
                                className="w-full h-9 px-2.5 rounded-lg text-xs font-semibold text-app-muted flex items-center gap-2 hover:bg-app-surface-2 hover:text-red-400"
                              >
                                <Archive className="w-3.5 h-3.5" />
                                <span>{t.archive}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredExercises.length === 0 && (
                <div className="py-12 text-center text-sm text-app-muted border border-dashed border-app rounded-xl">
                  No exercises found matching your filter criteria.
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Collections Tab View */
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
              {t.workoutCollections.replace('{count}', String(collections.length))}
            </span>

            <label className="text-xs font-semibold text-app-accent flex items-center gap-1.5 cursor-pointer hover:underline">
              <Upload className="w-3.5 h-3.5" />
              <span>{t.importJSONShort}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportCollection}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-3">
            {collections.map(col => {
              return (
                <div
                  key={col.id}
                  onClick={() => {
                    HapticsService.light();
                    setActiveCollectionId(col.id);
                  }}
                  className="p-4 rounded-xl bg-app-surface border border-app flex flex-col gap-3 hover:border-app-accent/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-app-accent">
                        {col.goal}
                      </span>
                      <h3 className="font-bold text-base text-app-primary mt-0.5 group-hover:text-app-accent transition-colors">
                        {col.name}
                      </h3>
                    </div>

                    {col.scheduleChip && (
                      <span className="px-2 py-0.5 rounded bg-app-surface-2 border border-app text-xs font-semibold text-app-accent uppercase tracking-wider">
                        {col.scheduleChip}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-app-muted">
                    <span className="text-app-primary font-semibold">
                      {col.items.length} Exercises
                    </span>
                    <span>•</span>
                    <span>~{col.items.length * 10} min</span>
                    {col.lastPerformed && (
                      <>
                        <span>•</span>
                        <span>Done {col.lastPerformed}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sticky Bottom Creation Button (48px Touch Target) */}
      <div className="fixed bottom-16 inset-x-0 p-4 bg-app-surface/90 border-t border-app max-w-xl mx-auto z-30">
        {activeTab === 'exercises' ? (
          <button
            type="button"
            onClick={() => {
              HapticsService.light();
              setActiveExerciseModal({ mode: 'create' });
            }}
            className="w-full h-12 rounded-xl bg-app-accent text-on-accent font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-transform cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>{t.newExercise}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsNewCollectionDialogOpen(true)}
            className="w-full h-12 rounded-xl bg-app-accent text-on-accent font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-transform cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>{t.newCollection}</span>
          </button>
        )}
      </div>

      {/* Exercise Filter Sheet Modal */}
      <ExerciseFilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(defaultFilters)}
      />

      {/* Add To Collection Quick Dialog */}
      <Dialog
        isOpen={!!addToColExercise}
        title={t.addToCollectionTitle}
        description={t.addToCollectionDesc.replace('{name}', addToColExercise?.name || '')}
        onClose={() => setAddToColExercise(null)}
        cancelLabel={t.cancel}
      >
        <div className="space-y-2 py-2 max-h-48 overflow-y-auto">
          {collections.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleAddExerciseToCollection(c.id)}
              className="w-full p-3 rounded-lg bg-app-surface-2 border border-app text-sm font-semibold text-app-primary flex items-center justify-between hover:border-app-accent"
            >
              <span>{c.name}</span>
              <span className="text-xs text-app-muted">({c.items.length} {t.exAbbrev})</span>
            </button>
          ))}
        </div>
      </Dialog>

      {/* Create New Collection Dialog */}
      <Dialog
        isOpen={isNewCollectionDialogOpen}
        title={t.createCollectionTitle}
        onClose={() => setIsNewCollectionDialogOpen(false)}
        onConfirm={handleCreateNewCollection}
        confirmLabel={t.create}
      >
        <div className="space-y-2 py-2">
          <label htmlFor="new-col-name" className="text-xs font-bold uppercase text-app-muted">
            {t.collectionName}
          </label>
          <input
            id="new-col-name"
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder={t.collectionNamePlaceholder}
            className="w-full h-12 rounded-xl bg-app-surface-2 border border-app px-4 text-sm font-semibold text-app-primary focus:outline-none focus:border-app-accent"
          />
        </div>
      </Dialog>
    </div>
  );
};
