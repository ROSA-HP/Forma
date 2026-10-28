import React, { useState } from 'react';
import { 
  ArrowLeft, 
  X, 
  Check, 
  Dumbbell, 
  BicepsFlexed, 
  Repeat, 
  Timer, 
  Route, 
  Gauge, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Archive, 
  Copy, 
  ExternalLink, 
  Youtube 
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { 
  Exercise, 
  ExerciseCategory, 
  EquipmentType, 
  MuscleGroup, 
  TrackingType 
} from '../types/index.ts';
import { 
  MUSCLE_GROUPS, 
  REGION_ORDER, 
  REGION_MUSCLES, 
  CATEGORY_COLORS 
} from '../domain/constants.ts';
import { formatMuscleName, formatRegionName, formatWeight } from '../domain/calculations.ts';
import { HapticsService } from '../services/haptics.ts';

interface AddEditExerciseScreenProps {
  exerciseId?: string;
  returnToCollectionId?: string;
  onClose: () => void;
}

export const AddEditExerciseScreen: React.FC<AddEditExerciseScreenProps> = ({
  exerciseId,
  returnToCollectionId,
  onClose
}) => {
  const { 
    exercises, 
    saveExercise, 
    deleteExercise, 
    collections, 
    saveCollection, 
    sessions, 
    settings, 
    duplicateExercise, 
    t 
  } = useApp();

  const existing = exerciseId ? exercises.find(e => e.id === exerciseId) : null;
  const isEditing = !!existing;

  // Has logged sets?
  const hasLoggedSets = React.useMemo(() => {
    if (!existing) return false;
    return sessions.some(s => s.sets.some(set => set.exerciseId === existing.id && set.done));
  }, [existing, sessions]);

  // Form states
  const [name, setName] = useState(existing?.name || '');
  const [category, setCategory] = useState<ExerciseCategory>(existing?.category || 'gym');
  const [equipment, setEquipment] = useState<EquipmentType>(existing?.equipment || 'barbell');
  const [isConditioning, setIsConditioning] = useState<boolean>(existing?.conditioning || false);
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup | 'none'>(
    existing?.conditioning ? 'none' : (existing?.primaryMuscles[0] || 'chest')
  );
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>(
    existing?.secondaryMuscles || []
  );
  const [trackingType, setTrackingType] = useState<TrackingType>(existing?.trackingType || 'weight_reps');
  const [roundSec, setRoundSec] = useState(existing?.roundConfig?.roundSec || 180);
  const [roundRestSec, setRoundRestSec] = useState(existing?.roundConfig?.restSec || 60);
  const [roundsCount, setRoundsCount] = useState(existing?.roundConfig?.rounds || 5);
  const [defaultRestSec, setDefaultRestSec] = useState(existing?.defaultRestSec || 90);
  const [defaultRepMin, setDefaultRepMin] = useState(existing?.defaultRepMin || 8);
  const [defaultRepMax, setDefaultRepMax] = useState(existing?.defaultRepMax || 10);
  const [incrementKg, setIncrementKg] = useState(existing?.incrementKg || 2.5);
  const [notes, setNotes] = useState(existing?.notes || '');
  const [videoUrl, setVideoUrl] = useState(existing?.videoUrl || '');

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isValid = name.trim().length > 0;

  const toggleSecondaryMuscle = (m: MuscleGroup) => {
    if (m === primaryMuscle) return;
    if (secondaryMuscles.includes(m)) {
      setSecondaryMuscles(prev => prev.filter(item => item !== m));
    } else {
      if (secondaryMuscles.length < 4) {
        setSecondaryMuscles(prev => [...prev, m]);
      }
    }
  };

  const handleSave = async () => {
    if (!isValid) {
      setErrorMsg(t.errExerciseNameRequired);
      return;
    }

    HapticsService.medium();

    const updatedExercise: Exercise = {
      id: existing?.id || crypto.randomUUID(),
      name: name.trim(),
      category,
      equipment,
      conditioning: isConditioning,
      primaryMuscles: isConditioning || primaryMuscle === 'none' ? [] : [primaryMuscle],
      secondaryMuscles: isConditioning ? [] : secondaryMuscles.filter(m => m !== primaryMuscle),
      trackingType,
      defaultRestSec,
      defaultRepMin: trackingType === 'duration' || trackingType === 'rounds' ? undefined : defaultRepMin,
      defaultRepMax: trackingType === 'duration' || trackingType === 'rounds' ? undefined : defaultRepMax,
      incrementKg: trackingType === 'weight_reps' || trackingType === 'bodyweight' ? incrementKg : 0,
      roundConfig: trackingType === 'rounds' ? {
        roundSec,
        restSec: roundRestSec,
        rounds: roundsCount
      } : undefined,
      notes: notes.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      isPinned: existing?.isPinned ?? false,
      isArchived: existing?.isArchived ?? false,
      source: existing?.source || 'custom'
    };

    await saveExercise(updatedExercise);

    // If opened with returnToCollectionId, also append to that collection!
    if (returnToCollectionId) {
      const targetCol = collections.find(c => c.id === returnToCollectionId);
      if (targetCol) {
        const updatedCol = {
          ...targetCol,
          items: [
            ...targetCol.items,
            {
              exerciseId: updatedExercise.id,
              role: 'compound' as const,
              sets: 3,
              repsMin: defaultRepMin,
              repsMax: defaultRepMax,
              restSec: defaultRestSec
            }
          ]
        };
        await saveCollection(updatedCol);
      }
    }

    onClose();
  };

  const handleDuplicate = async () => {
    if (!existing) return;
    HapticsService.light();
    await duplicateExercise(existing.id);
    onClose();
  };

  const handleDeleteOrArchive = async () => {
    if (!existing) return;
    HapticsService.warning();
    if (existing.source === 'builtin' || hasLoggedSets) {
      // Archive instead of hard delete
      await saveExercise({ ...existing, isArchived: true });
    } else {
      await deleteExercise(existing.id);
    }
    onClose();
  };

  const trackingOptions: { id: TrackingType; title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      id: 'weight_reps',
      title: t.tracking_weight_reps,
      subtitle: settings.weightUnit === 'lb' ? t.trackSubWeightLb : t.trackSubWeightKg,
      icon: Dumbbell
    },
    {
      id: 'bodyweight',
      title: t.equip_bodyweight,
      subtitle: t.trackSubBodyweight,
      icon: BicepsFlexed
    },
    {
      id: 'reps',
      title: t.tracking_reps,
      subtitle: t.trackSubReps,
      icon: Repeat
    },
    {
      id: 'duration',
      title: t.duration,
      subtitle: t.trackSubDuration,
      icon: Timer
    },
    {
      id: 'distance_time',
      title: t.tracking_distance_time,
      subtitle: t.trackSubDistance,
      icon: Route
    },
    {
      id: 'rounds',
      title: t.tracking_rounds,
      subtitle: t.trackSubRounds,
      icon: Gauge
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-app-bg text-app-primary flex flex-col overflow-hidden">
      {/* Top App Header */}
      <header className="h-14 px-3.5 bg-app-surface border-b border-app flex items-center justify-between shrink-0 pt-safe">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label={t.back}
            className="w-10 h-10 -ms-1 rounded-lg flex items-center justify-center text-app-primary hover:bg-app-surface-2 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <h1 className="font-bold text-base text-app-primary truncate">
            {isEditing ? t.editExerciseTitle : t.addCustomExercise}
          </h1>
        </div>

        <button
          type="button"
          disabled={!isValid}
          onClick={handleSave}
          className={`h-9 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
            isValid
              ? 'bg-app-accent text-on-accent hover:opacity-90 active:scale-95 cursor-pointer'
              : 'bg-app-surface-2 border border-app text-app-muted opacity-50 cursor-not-allowed'
          }`}
        >
          {t.save}
        </button>
      </header>

      {/* Main Form Body */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2 pb-28 max-w-xl mx-auto w-full">
        {/* Section 1: Exercise Name */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="ex-name" className="text-xs font-bold uppercase tracking-wider text-app-muted">
              Exercise Name <span className="text-app-accent">*</span>
            </label>
            <span className="text-[10px] uppercase font-bold text-app-muted">{t.required}</span>
          </div>
          <div className="relative flex items-center">
            <input
              id="ex-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder={t.namePlaceholder}
              className="w-full h-12 rounded-xl bg-app-surface border border-app px-4 pe-10 text-sm font-semibold text-app-primary placeholder:text-app-muted/50 focus:outline-none focus:border-app-accent"
            />
            {name.length > 0 && (
              <button
                type="button"
                onClick={() => setName('')}
                aria-label={t.clearName}
                className="absolute end-2 w-8 h-8 rounded-lg flex items-center justify-center text-app-muted hover:text-app-primary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
        </div>

        {/* Section 2: Discipline Category */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
            {t.disciplineCategory}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(['gym', 'calisthenics', 'martial_arts', 'cardio', 'custom'] as ExerciseCategory[]).map(cat => {
              const isSelected = category === cat;
              const color = CATEGORY_COLORS[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  style={{
                    borderInlineStartColor: color,
                    borderInlineStartWidth: '3px',
                    borderColor: isSelected ? color : undefined,
                    backgroundColor: isSelected ? `${color}25` : undefined
                  }}
                  className={`h-11 px-3.5 rounded-lg border text-xs font-bold capitalize flex items-center gap-2 transition-all ${
                    isSelected
                      ? 'bg-app-surface text-app-primary'
                      : 'bg-app-surface border-app text-app-muted hover:text-app-primary'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span>{t[cat as keyof typeof t] || cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Equipment */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
            Equipment
          </span>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as EquipmentType)}
            className="w-full h-12 rounded-xl bg-app-surface border border-app px-4 text-sm font-semibold text-app-primary focus:outline-none focus:border-app-accent"
          >
            <option value="barbell">{t.equip_barbell}</option>
            <option value="dumbbell">{t.equip_dumbbell}</option>
            <option value="machine">{t.equip_machine}</option>
            <option value="cable">{t.equip_cable}</option>
            <option value="kettlebell">{t.equip_kettlebell}</option>
            <option value="bodyweight">{t.equip_bodyweight}</option>
            <option value="band">{t.equip_band}</option>
            <option value="bag">{t.equip_bag}</option>
            <option value="cardio_machine">{t.equip_cardio_machine}</option>
            <option value="other">{t.equip_other}</option>
          </select>
        </div>

        {/* Section 4: Primary Target Muscle */}
        <div className="p-2.5 rounded-xl bg-app-surface border border-app space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
              Primary Target Muscle
            </span>
            <span className="text-[10px] font-bold text-app-accent uppercase">{t.focus}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsConditioning(false);
                if (primaryMuscle === 'none') setPrimaryMuscle('chest');
              }}
              className={`flex-1 h-10 rounded-lg text-xs font-semibold border transition-colors ${
                !isConditioning
                  ? 'bg-app-accent/15 border-app-accent text-app-accent font-bold'
                  : 'bg-app-surface-2 border-app text-app-muted'
              }`}
            >
              {t.muscularHypertrophy}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsConditioning(true);
                setPrimaryMuscle('none');
              }}
              className={`flex-1 h-10 rounded-lg text-xs font-semibold border transition-colors ${
                isConditioning
                  ? 'bg-app-accent/15 border-app-accent text-app-accent font-bold'
                  : 'bg-app-surface-2 border-app text-app-muted'
              }`}
            >
              {t.conditioningNoMuscle}
            </button>
          </div>

          {!isConditioning && (
            <select
              value={primaryMuscle}
              onChange={(e) => setPrimaryMuscle(e.target.value as MuscleGroup)}
              className="w-full h-12 rounded-xl bg-app-surface-2 border border-app px-4 text-sm font-semibold text-app-primary focus:outline-none focus:border-app-accent"
            >
              {REGION_ORDER.map(region => (
                <optgroup key={region} label={formatRegionName(region)}>
                  {REGION_MUSCLES[region].map(m => (
                    <option key={m} value={m}>
                      {formatMuscleName(m)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </div>

        {/* Section 5: Secondary Muscles (Synergists) */}
        {!isConditioning && (
          <div className="p-2.5 rounded-xl bg-app-surface border border-app space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
                {t.secondaryMusclesLabel}
              </span>
              <span className="text-xs text-app-muted">{secondaryMuscles.length} / 4</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.filter(m => m !== primaryMuscle).map(m => {
                const isSelected = secondaryMuscles.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleSecondaryMuscle(m)}
                    className={`h-8 px-2.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                      isSelected
                        ? 'bg-app-accent text-on-accent border-app-accent font-bold'
                        : 'bg-app-surface-2 border-app text-app-muted hover:text-app-primary'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{formatMuscleName(m)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 6: Logging Metrics Format (Tracking Type) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
              {t.loggingMetricsFormat}
            </span>
            {hasLoggedSets && (
              <span className="text-[10px] text-amber-400 font-bold uppercase">
                {t.lockedHasLogs}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {trackingOptions.map(opt => {
              const isSelected = trackingType === opt.id;
              const Icon = opt.icon;

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={hasLoggedSets}
                  onClick={() => setTrackingType(opt.id)}
                  className={`p-2.5 rounded-xl border text-start flex flex-col justify-between gap-2 min-h-[76px] transition-all ${
                    isSelected
                      ? 'bg-app-surface border-app-accent ring-1 ring-app-accent'
                      : 'bg-app-surface border-app text-app-muted hover:border-app-accent/40'
                  } ${hasLoggedSets ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-app-accent' : 'text-app-muted'}`} />
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-app-accent text-on-accent flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-app-primary block leading-tight">
                      {opt.title}
                    </span>
                    <span className="text-[10px] text-app-muted block mt-0.5">
                      {opt.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Rounds configuration parameters if rounds selected */}
          {trackingType === 'rounds' && (
            <div className="p-3.5 rounded-xl bg-app-surface-2 border border-app grid grid-cols-3 gap-2 pt-2">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase text-app-muted">{t.roundSec}</label>
                <input
                  type="number"
                  value={roundSec}
                  onChange={(e) => setRoundSec(Number(e.target.value) || 180)}
                  className="h-10 rounded-lg bg-app-surface border border-app px-2 text-xs font-bold text-app-primary tabular-nums"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase text-app-muted">{t.restSec}</label>
                <input
                  type="number"
                  value={roundRestSec}
                  onChange={(e) => setRoundRestSec(Number(e.target.value) || 60)}
                  className="h-10 rounded-lg bg-app-surface border border-app px-2 text-xs font-bold text-app-primary tabular-nums"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase text-app-muted">{t.totalRounds}</label>
                <input
                  type="number"
                  value={roundsCount}
                  onChange={(e) => setRoundsCount(Number(e.target.value) || 5)}
                  className="h-10 rounded-lg bg-app-surface border border-app px-2 text-xs font-bold text-app-primary tabular-nums"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 7: Collapsible Advanced Settings */}
        <div className="rounded-xl bg-app-surface border border-app overflow-hidden">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="w-full p-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-app-primary hover:bg-app-surface-2 transition-colors"
          >
            <span>{t.advancedDefaults}</span>
            {isAdvancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isAdvancedOpen && (
            <div className="p-3 pt-0 border-t border-app space-y-2">
              <div className="grid grid-cols-2 gap-3 pt-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-app-muted">{t.defaultRestSec}</label>
                  <input
                    type="number"
                    value={defaultRestSec}
                    onChange={(e) => setDefaultRestSec(Number(e.target.value) || 60)}
                    className="h-11 rounded-lg bg-app-surface-2 border border-app px-3 text-sm text-app-primary tabular-nums"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-app-muted">{t.weightIncrement.replace('{unit}', settings.weightUnit)}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={incrementKg}
                    onChange={(e) => setIncrementKg(Number(e.target.value) || 2.5)}
                    className="h-11 rounded-lg bg-app-surface-2 border border-app px-3 text-sm text-app-primary tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-app-muted">{t.targetRepsMin}</label>
                  <input
                    type="number"
                    value={defaultRepMin}
                    onChange={(e) => setDefaultRepMin(Number(e.target.value) || 8)}
                    className="h-11 rounded-lg bg-app-surface-2 border border-app px-3 text-sm text-app-primary tabular-nums"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-app-muted">{t.targetRepsMax}</label>
                  <input
                    type="number"
                    value={defaultRepMax}
                    onChange={(e) => setDefaultRepMax(Number(e.target.value) || 12)}
                    className="h-11 rounded-lg bg-app-surface-2 border border-app px-3 text-sm text-app-primary tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 8: Notes & Form Cues */}
        <div className="space-y-1.5">
          <label htmlFor="ex-notes" className="text-xs font-bold uppercase tracking-wider text-app-muted">
            {t.notesFormCues}
          </label>
          <textarea
            id="ex-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.cuesPlaceholder}
            rows={3}
            className="w-full rounded-xl bg-app-surface border border-app p-3 text-sm text-app-primary placeholder:text-app-muted/50 focus:outline-none focus:border-app-accent resize-none"
          />
        </div>

        {/* Section 9: Video Tutorial Reference Link */}
        <div className="space-y-1.5">
          <label htmlFor="ex-video" className="text-xs font-bold uppercase tracking-wider text-app-muted">
            {t.videoTutorial}
          </label>
          <div className="relative flex items-center">
            <Youtube className="w-4 h-4 absolute start-3 text-app-muted" />
            <input
              id="ex-video"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder={t.videoUrlPlaceholder}
              className="w-full h-12 ps-10 pe-10 rounded-xl bg-app-surface border border-app text-sm text-app-primary placeholder:text-app-muted/50 focus:outline-none focus:border-app-accent"
            />
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute end-2 w-8 h-8 rounded-lg flex items-center justify-center text-app-accent hover:bg-app-surface-2"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Action Controls for Existing Exercise (Duplicate / Delete / Archive) */}
        {isEditing && (
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleDuplicate}
              className="flex-1 h-12 rounded-xl bg-app-surface border border-app text-app-primary font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-app-surface-2"
            >
              <Copy className="w-4 h-4 text-app-muted" />
              <span>{t.duplicateExercise}</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteOrArchive}
              className="h-12 px-4 rounded-xl bg-red-950/25 border border-red-500/30 text-red-400 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-red-950/40"
            >
              {existing.source === 'builtin' || hasLoggedSets ? (
                <>
                  <Archive className="w-4 h-4" />
                  <span>{t.archive}</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>{t.delete}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Persistent Bottom Sticky Action Surface */}
      <footer className="fixed bottom-0 inset-x-0 bg-app-surface border-t border-app p-3.5 pb-safe z-40">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <button
            type="button"
            disabled={!isValid}
            onClick={handleSave}
            className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.99] ${
              isValid
                ? 'bg-app-accent text-on-accent cursor-pointer'
                : 'bg-app-surface-2 border border-app text-app-muted opacity-60 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>
              {returnToCollectionId ? t.saveAddToWorkout : (isEditing ? t.saveExerciseChanges : t.saveNewExercise)}
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
};
