import React, { useState } from 'react';
import { 
  ArrowLeft, 
  MoreVertical, 
  Play, 
  PlusCircle, 
  ArrowUpDown, 
  Share2, 
  Calendar as CalendarIcon, 
  ChevronUp, 
  ChevronDown, 
  GripVertical, 
  Pencil, 
  Trash2, 
  Copy, 
  Download, 
  Layers, 
  Clock, 
  Target 
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { 
  Collection, 
  CollectionItem, 
  CollectionRole, 
  CollectionGoal, 
  ExerciseCategory 
} from '../types/index.ts';
import { computeCollectionStats } from '../domain/collectionCalculations.ts';
import { CATEGORY_COLORS, GOAL_PRESETS } from '../domain/constants.ts';
import { MuscleHexagon } from '../components/MuscleHexagon.tsx';
import { ExercisePickerModal } from '../components/ExercisePickerModal.tsx';
import { ScheduleModal } from '../components/ScheduleModal.tsx';
import { Dialog } from '../components/Dialog.tsx';
import { ShareService } from '../services/share.ts';
import { HapticsService } from '../services/haptics.ts';

interface CollectionDetailScreenProps {
  collectionId: string;
  onBack: () => void;
  onStartWorkout: (collection: Collection) => void;
}

export const CollectionDetailScreen: React.FC<CollectionDetailScreenProps> = ({
  collectionId,
  onBack,
  onStartWorkout
}) => {
  const { 
    collections, 
    exercises, 
    saveCollection, 
    deleteCollection, 
    duplicateCollection, 
    setActiveExerciseModal, 
    t 
  } = useApp();

  const collection = collections.find(c => c.id === collectionId);
  const exercisesMap = React.useMemo(() => new Map(exercises.map(e => [e.id, e])), [exercises]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(collection?.name || '');
  const [isReordering, setIsReordering] = useState(false);
  const [isHexagonOpen, setIsHexagonOpen] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activeEditingItemIndex, setActiveEditingItemIndex] = useState<number | null>(null);

  if (!collection) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh p-4 text-center">
        <p className="text-sm text-app-muted">{t.collectionNotFound}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-xl bg-app-surface-2 border border-app text-sm font-semibold text-app-primary"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const stats = computeCollectionStats(collection, exercisesMap);

  const handleSaveName = async () => {
    if (nameInput.trim() && nameInput.trim() !== collection.name) {
      await saveCollection({ ...collection, name: nameInput.trim() });
    }
    setIsEditingName(false);
  };

  const handleAddExercises = async (newExIds: string[]) => {
    HapticsService.light();
    const newItems: CollectionItem[] = newExIds.map(id => {
      const ex = exercisesMap.get(id);
      return {
        exerciseId: id,
        role: (ex?.trackingType === 'rounds' ? 'skill' : 'compound') as CollectionRole,
        sets: 3,
        repsMin: ex?.defaultRepMin || 8,
        repsMax: ex?.defaultRepMax || 12,
        restSec: ex?.defaultRestSec || 75
      };
    });

    await saveCollection({
      ...collection,
      items: [...collection.items, ...newItems]
    });
  };

  const handleMoveItem = async (index: number, direction: 'up' | 'down') => {
    HapticsService.light();
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= collection.items.length) return;

    const reordered = [...collection.items];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    await saveCollection({ ...collection, items: reordered });
  };

  const handleDuplicateItem = async (index: number) => {
    HapticsService.light();
    const item = collection.items[index];
    const items = [...collection.items];
    items.splice(index + 1, 0, { ...item });
    await saveCollection({ ...collection, items });
  };

  const handleRemoveItem = async (index: number) => {
    HapticsService.light();
    const items = collection.items.filter((_, i) => i !== index);
    await saveCollection({ ...collection, items });
  };

  const handleCycleGoal = async () => {
    HapticsService.light();
    const goals: CollectionGoal[] = ['hypertrophy', 'strength', 'endurance', 'power', 'conditioning'];
    const curIdx = goals.indexOf(collection.goal);
    const nextGoal = goals[(curIdx + 1) % goals.length];
    await saveCollection({ ...collection, goal: nextGoal });
  };

  const handleShare = async () => {
    HapticsService.medium();
    const lines = [
      `🏋️ ${collection.name} (${collection.goal.toUpperCase()})`,
      `${collection.items.length} Exercises · Est. ${stats.estimatedMinutes} min`,
      '',
      ...collection.items.map((it, idx) => {
        const ex = exercisesMap.get(it.exerciseId);
        return `${idx + 1}. ${ex?.name || it.exerciseId} — ${it.sets} Sets × ${it.repsMin}-${it.repsMax} Reps (Rest: ${it.restSec}s)`;
      })
    ];
    await ShareService.shareText(collection.name, lines.join('\n'));
  };

  const handleExportJSON = () => {
    HapticsService.light();
    const jsonStr = JSON.stringify(collection, null, 2);
    ShareService.downloadFile(
      `${collection.name.toLowerCase().replace(/\s+/g, '_')}_collection.json`,
      jsonStr,
      'application/json'
    );
  };

  const handleDuplicateCollection = async () => {
    await duplicateCollection(collection.id);
    onBack();
  };

  const handleDeleteCollection = async () => {
    await deleteCollection(collection.id);
    setIsDeleteDialogOpen(false);
    onBack();
  };

  // Active editing item for sheet
  const editingItem = activeEditingItemIndex !== null ? collection.items[activeEditingItemIndex] : null;

  const handleUpdateItem = async (updated: CollectionItem) => {
    if (activeEditingItemIndex === null) return;
    const items = [...collection.items];
    items[activeEditingItemIndex] = updated;
    await saveCollection({ ...collection, items });
    setActiveEditingItemIndex(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-app-bg text-app-primary flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="h-16 px-4 bg-app-surface border-b border-app flex items-center justify-between shrink-0 pt-safe">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label={t.back}
            className="w-10 h-10 -ms-1 rounded-lg flex items-center justify-center text-app-primary hover:bg-app-surface-2 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>

          {isEditingName ? (
            <input
              type="text"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              className="h-9 px-2 rounded-lg bg-app-surface-2 border border-app-accent text-sm font-bold text-app-primary focus:outline-none"
            />
          ) : (
            <div 
              onClick={() => setIsEditingName(true)}
              className="flex items-center gap-1.5 cursor-pointer group min-w-0"
            >
              <h1 className="font-bold text-base text-app-primary truncate">
                {collection.name}
              </h1>
              <Pencil className="w-3.5 h-3.5 text-app-muted group-hover:text-app-accent shrink-0" />
            </div>
          )}
        </div>

        {/* Overflow Menu Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOverflowOpen(!isOverflowOpen)}
            aria-label={t.collectionMenu}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-app-muted hover:text-app-primary hover:bg-app-surface-2"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {isOverflowOpen && (
            <div className="absolute end-0 top-12 w-48 rounded-xl bg-app-surface border border-app p-1.5 z-50 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsOverflowOpen(false);
                  setIsEditingName(true);
                }}
                className="w-full h-10 px-3 rounded-lg text-xs font-semibold text-app-primary flex items-center gap-2 hover:bg-app-surface-2"
              >
                <Pencil className="w-4 h-4 text-app-muted" />
                <span>{t.renameCollection}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOverflowOpen(false);
                  handleDuplicateCollection();
                }}
                className="w-full h-10 px-3 rounded-lg text-xs font-semibold text-app-primary flex items-center gap-2 hover:bg-app-surface-2"
              >
                <Copy className="w-4 h-4 text-app-muted" />
                <span>{t.duplicate}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOverflowOpen(false);
                  handleExportJSON();
                }}
                className="w-full h-10 px-3 rounded-lg text-xs font-semibold text-app-primary flex items-center gap-2 hover:bg-app-surface-2"
              >
                <Download className="w-4 h-4 text-app-muted" />
                <span>{t.exportCollectionJSON}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOverflowOpen(false);
                  setIsDeleteDialogOpen(true);
                }}
                className="w-full h-10 px-3 rounded-lg text-xs font-semibold text-red-400 flex items-center gap-2 hover:bg-red-950/30"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t.deleteCollection}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 pb-28 max-w-xl mx-auto w-full">
        {/* Routine Overview Summary Card */}
        <section className="p-4 rounded-xl bg-app-surface border border-app space-y-3">
          {/* Metadata Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span 
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: stats.distinctCategories.length === 1 
                    ? CATEGORY_COLORS[stats.distinctCategories[0]] 
                    : '#C8F31D'
                }} 
              />
              <span className="text-xs font-bold text-app-primary capitalize">
                {stats.isMixed ? t.mixedProtocol : (stats.distinctCategories[0] || t.gym)}
              </span>
              <span className="text-app-muted text-xs">•</span>
              <span className="text-xs text-app-muted">{stats.totalExerciseCount} Exercises</span>
              <span className="text-app-muted text-xs">•</span>
              <span className="text-xs text-app-muted">~{stats.estimatedMinutes} min est.</span>
            </div>

            {collection.scheduleChip && (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-app-surface-2 border border-app text-[11px] font-bold text-app-accent uppercase tracking-wider">
                <CalendarIcon className="w-3 h-3 text-app-accent" />
                <span>{collection.scheduleChip}</span>
              </div>
            )}
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2.5 rounded-lg bg-app-surface-2 border border-app text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-app-muted">
                Sets
              </span>
              <span className="text-base font-bold text-app-primary tabular-nums mt-0.5 block">
                {stats.totalSets}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-app-surface-2 border border-app text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-app-muted">
                Avg Rest
              </span>
              <span className="text-base font-bold text-app-primary tabular-nums mt-0.5 block">
                {stats.avgRestSec}s
              </span>
            </div>

            <div 
              onClick={handleCycleGoal}
              className="p-2.5 rounded-lg bg-app-surface-2 border border-app text-center cursor-pointer hover:border-app-accent transition-colors"
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider text-app-muted">
                Target Focus
              </span>
              <span className="text-sm font-bold text-app-accent capitalize mt-0.5 block truncate">
                {collection.goal}
              </span>
            </div>
          </div>
        </section>

        {/* Collapsible Muscle Coverage Hexagon */}
        <div className="rounded-xl bg-app-surface border border-app overflow-hidden">
          <button
            type="button"
            onClick={() => setIsHexagonOpen(!isHexagonOpen)}
            className="w-full p-3.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-app-primary hover:bg-app-surface-2"
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-app-accent" />
              <span>{t.muscleCoverageTarget}</span>
            </div>
            {isHexagonOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isHexagonOpen && (
            <div className="p-4 pt-1 border-t border-app flex flex-col items-center">
              <MuscleHexagon
                values={stats.regionSetCounts}
                mode="volume"
                size="sm"
                showLabels={true}
              />
              <span className="text-[11px] text-app-muted mt-2 text-center">
                Planned working set distribution across regions
              </span>
            </div>
          )}
        </div>

        {/* Utility Action Bar */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="h-11 rounded-xl bg-app-surface border border-app text-xs font-bold text-app-primary flex items-center justify-center gap-1.5 hover:bg-app-surface-2 transition-colors active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-app-accent" />
            <span>{t.addExerciseShort}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsReordering(!isReordering)}
            className={`h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95 ${
              isReordering 
                ? 'bg-app-accent text-on-accent border-app-accent' 
                : 'bg-app-surface border-app text-app-primary hover:bg-app-surface-2'
            }`}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span>{isReordering ? t.done : t.reorder}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="h-11 rounded-xl bg-app-surface border border-app text-xs font-bold text-app-primary flex items-center justify-center gap-1.5 hover:bg-app-surface-2 transition-colors active:scale-95"
          >
            <Share2 className="w-4 h-4 text-app-muted" />
            <span>{t.share}</span>
          </button>
        </div>

        {/* Reorder Status Pill */}
        {isReordering && (
          <div className="p-2.5 rounded-lg bg-app-accent/10 border border-app-accent/30 flex items-center justify-between text-xs text-app-accent font-semibold">
            <span>{t.reorderHint}</span>
            <span className="tabular-nums">{collection.items.length} total</span>
          </div>
        )}

        {/* Exercise Items List */}
        <div className="space-y-2">
          {collection.items.map((item, index) => {
            const ex = exercisesMap.get(item.exerciseId);
            const isMoving = isReordering;

            return (
              <div
                key={`${item.exerciseId}-${index}`}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  isMoving 
                    ? 'bg-app-surface-2 border-app-accent' 
                    : 'bg-app-surface border-app hover:border-app-accent/50'
                }`}
              >
                {/* Drag Handle / Reorder Controls */}
                {isReordering ? (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveItem(index, 'up')}
                      aria-label={t.moveItemUp}
                      className="w-7 h-6 rounded bg-app-surface border border-app flex items-center justify-center text-app-primary disabled:opacity-30"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === collection.items.length - 1}
                      onClick={() => handleMoveItem(index, 'down')}
                      aria-label={t.moveItemDown}
                      className="w-7 h-6 rounded bg-app-surface border border-app flex items-center justify-center text-app-primary disabled:opacity-30"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="w-6 text-center text-xs font-bold text-app-muted shrink-0">
                    {index + 1}.
                  </span>
                )}

                {/* Content */}
                <div 
                  onClick={() => !isReordering && setActiveEditingItemIndex(index)}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-sm text-app-primary truncate">
                      {ex?.name || item.exerciseId}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded bg-app-surface-2 text-[10px] font-bold uppercase tracking-wider text-app-muted border border-app">
                      {item.role}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-app-muted flex-wrap">
                    <span className="text-app-primary font-semibold">
                      {item.sets} Sets × {item.repsMin}–{item.repsMax} Reps
                    </span>
                    <span>•</span>
                    <span>Rest: {item.restSec}s</span>
                  </div>

                  {item.note && (
                    <p className="text-[11px] text-app-accent mt-1 italic truncate">
                      "{item.note}"
                    </p>
                  )}
                </div>

                {/* Trailing Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDuplicateItem(index)}
                    aria-label={t.duplicateItem}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-app-muted hover:text-app-primary hover:bg-app-surface-2"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    aria-label={t.removeItem}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-app-muted hover:text-red-400 hover:bg-app-surface-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {collection.items.length === 0 && (
            <div className="py-12 text-center text-sm text-app-muted border border-dashed border-app rounded-xl">
              No exercises in this workout. Tap "Add Ex." above to get started.
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Dock */}
      <footer className="fixed bottom-0 inset-x-0 bg-app-surface border-t border-app p-4 pb-safe z-40">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsScheduleOpen(true)}
            className="h-12 px-4 rounded-xl bg-app-surface-2 border border-app text-app-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-app-surface active:scale-95 transition-all"
          >
            <CalendarIcon className="w-4 h-4 text-app-accent" />
            <span>{t.schedule}</span>
          </button>

          <button
            type="button"
            disabled={collection.items.length === 0}
            onClick={() => onStartWorkout(collection)}
            className="flex-1 h-12 rounded-xl bg-app-accent text-on-accent font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.99] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t.startThisWorkout}</span>
          </button>
        </div>
      </footer>

      {/* Exercise Picker Modal */}
      <ExercisePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onAddExercises={handleAddExercises}
        alreadySelectedIds={collection.items.map(it => it.exerciseId)}
      />

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isScheduleOpen}
        collection={collection}
        onClose={() => setIsScheduleOpen(false)}
      />

      {/* Edit Item Parameters Bottom Sheet */}
      {editingItem && (
        <Dialog
          isOpen={true}
          title={`${t.edit} ${exercisesMap.get(editingItem.exerciseId)?.name || t.exercise}`}
          onClose={() => setActiveEditingItemIndex(null)}
          onConfirm={() => {}}
          cancelLabel={t.close}
        >
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase text-app-muted">{t.sets}</label>
                <input
                  type="number"
                  value={editingItem.sets}
                  onChange={(e) => handleUpdateItem({ ...editingItem, sets: Math.max(1, Number(e.target.value) || 1) })}
                  className="h-11 rounded-lg bg-app-surface-2 border border-app px-3 text-sm font-bold text-app-primary tabular-nums"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase text-app-muted">{t.restSecParens}</label>
                <input
                  type="number"
                  value={editingItem.restSec}
                  onChange={(e) => handleUpdateItem({ ...editingItem, restSec: Math.max(0, Number(e.target.value) || 0) })}
                  className="h-11 rounded-lg bg-app-surface-2 border border-app px-3 text-sm font-bold text-app-primary tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase text-app-muted">{t.minReps}</label>
                <input
                  type="number"
                  value={editingItem.repsMin}
                  onChange={(e) => handleUpdateItem({ ...editingItem, repsMin: Number(e.target.value) || 1 })}
                  className="h-11 rounded-lg bg-app-surface-2 border border-app px-3 text-sm font-bold text-app-primary tabular-nums"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase text-app-muted">{t.maxReps}</label>
                <input
                  type="number"
                  value={editingItem.repsMax}
                  onChange={(e) => handleUpdateItem({ ...editingItem, repsMax: Number(e.target.value) || 1 })}
                  className="h-11 rounded-lg bg-app-surface-2 border border-app px-3 text-sm font-bold text-app-primary tabular-nums"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold uppercase text-app-muted">{t.movementRole}</label>
              <select
                value={editingItem.role}
                onChange={(e) => handleUpdateItem({ ...editingItem, role: e.target.value as CollectionRole })}
                className="h-11 rounded-lg bg-app-surface-2 border border-app px-3 text-sm font-semibold text-app-primary"
              >
                <option value="warmup">{t.roleWarmup}</option>
                <option value="compound">{t.roleCompound}</option>
                <option value="isolation">{t.roleIsolation}</option>
                <option value="finisher">{t.roleFinisher}</option>
                <option value="skill">{t.roleSkill}</option>
                <option value="cooldown">{t.roleCooldown}</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold uppercase text-app-muted">{t.techniqueNote}</label>
              <input
                type="text"
                value={editingItem.note || ''}
                onChange={(e) => handleUpdateItem({ ...editingItem, note: e.target.value })}
                placeholder={t.notePlaceholder}
                className="h-11 rounded-lg bg-app-surface-2 border border-app px-3 text-sm text-app-primary"
              />
            </div>
          </div>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={isDeleteDialogOpen}
        title={t.deleteCollectionTitle}
        description={t.deleteCollectionDesc}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteCollection}
        confirmLabel={t.delete}
        isDestructive={true}
      />
    </div>
  );
};
