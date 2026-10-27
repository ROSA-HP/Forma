import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  ChevronDown, 
  Check, 
  Plus, 
  Trash2, 
  MoreVertical, 
  Clock, 
  Sparkles, 
  AlertTriangle,
  MapPin,
  FileText,
  Dumbbell
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { SetEntry, SetTag, Exercise, PRRecord } from '../types/index.ts';
import { CategoryChip } from '../components/CategoryChip.tsx';
import { RestTimerModal } from '../components/RestTimerModal.tsx';
import { RoundTimerModal } from '../components/RoundTimerModal.tsx';
import { PRCelebrationModal } from '../components/PRCelebrationModal.tsx';
import { ExercisePickerModal } from '../components/ExercisePickerModal.tsx';
import { Dialog } from '../components/Dialog.tsx';
import { formatDuration } from '../domain/sessionCalculations.ts';
import { smartTarget, epley1RM, detectPRs, kgToLb, lbToKg } from '../domain/calculations.ts';
import { SoundService } from '../services/sound.ts';
import { HapticsService } from '../services/haptics.ts';
import { KeepAwakeService } from '../services/keepAwake.ts';

export const ActiveWorkoutScreen: React.FC = () => {
  const { 
    activeDraft, 
    updateDraft, 
    togglePauseWorkout, 
    finishWorkout, 
    discardWorkout, 
    setIsWorkoutMinimized, 
    exercises, 
    sessions, 
    locations, 
    settings,
    restTimer,
    startRestTimer,
    adjustRestTimer,
    skipRestTimer,
    toggleRestTimerMinimize,
    roundTimer,
    startRoundTimer,
    pauseRoundTimer,
    resumeRoundTimer,
    skipRoundTimerPhase,
    stopRoundTimer,
    toggleRoundTimerMinimize,
    celebrationPR,
    triggerPRCelebration,
    dismissPRCelebration,
    t
  } = useApp();

  const [elapsedSec, setElapsedSec] = useState(0);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [sessionNotes, setSessionNotes] = useState(activeDraft?.notes || '');
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(activeDraft?.locationId);
  const [rpeSelectorSetId, setRpeSelectorSetId] = useState<string | null>(null);

  // Live Timer ticker & visibilitychange handler
  useEffect(() => {
    if (!activeDraft) return;

    const calcElapsed = () => {
      const start = new Date(activeDraft.startedAt).getTime();
      const paused = activeDraft.pausedMs || 0;
      const current = activeDraft.isPaused && activeDraft.lastPausedAt
        ? new Date(activeDraft.lastPausedAt).getTime()
        : Date.now();
      const diff = Math.max(0, Math.floor((current - start - paused) / 1000));
      setElapsedSec(diff);
    };

    calcElapsed();
    const timer = setInterval(calcElapsed, 1000);

    const handleVisibilityChange = async () => {
      calcElapsed();
      if (document.visibilityState === 'visible') {
        await KeepAwakeService.reacquireIfNeeded();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeDraft]);

  if (!activeDraft) {
    return null;
  }

  const isLb = settings.weightUnit === 'lb';

  // Map of exerciseId -> Exercise object
  const exMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const e of exercises) map.set(e.id, e);
    return map;
  }, [exercises]);

  // Group activeDraft sets by exercise
  const exerciseSetsMap = useMemo(() => {
    const map = new Map<string, SetEntry[]>();
    for (const s of activeDraft.sets) {
      const list = map.get(s.exerciseId) || [];
      list.push(s);
      map.set(s.exerciseId, list);
    }
    return map;
  }, [activeDraft.sets]);

  // Get past history for an exercise
  const getPastSetsForExercise = (exerciseId: string): SetEntry[] => {
    for (const sess of sessions) {
      const match = sess.sets.filter(s => s.exerciseId === exerciseId && s.done && s.tag !== 'warmup');
      if (match.length > 0) return match;
    }
    return [];
  };

  // Toggle set done status & trigger celebration / timer
  const handleToggleSetDone = async (set: SetEntry, ex: Exercise) => {
    const nextDone = !set.done;
    SoundService.playSetCompleteBeep();
    HapticsService.light();

    const updatedSets = activeDraft.sets.map(s => {
      if (s.id === set.id) {
        return {
          ...s,
          done: nextDone,
          completedAt: nextDone ? new Date().toISOString() : undefined
        };
      }
      return s;
    });

    await updateDraft(d => ({ ...d, sets: updatedSets }));

    if (nextDone) {
      // Check for PR
      const exSets = updatedSets.filter(s => s.exerciseId === ex.id);
      const prs = detectPRs(ex, exSets, sessions, settings.userBodyweightKg);
      if (prs.length > 0) {
        triggerPRCelebration(prs[0]);
      }

      // Automatically launch Rest Timer (default 90s, or 120s for heavy compound)
      const restDuration = ex.category === 'gym' ? 90 : 60;
      startRestTimer(restDuration, ex.name);
    }
  };

  // Update set numeric or tag values
  const handleUpdateSet = async (setId: string, updates: Partial<SetEntry>) => {
    const updatedSets = activeDraft.sets.map(s => {
      if (s.id === setId) {
        return { ...s, ...updates };
      }
      return s;
    });
    await updateDraft(d => ({ ...d, sets: updatedSets }));
  };

  // Adjust numeric value with +/- touch stepper
  const handleStepValue = async (setId: string, field: 'loadKg' | 'reps' | 'durationSec', step: number) => {
    const targetSet = activeDraft.sets.find(s => s.id === setId);
    if (!targetSet) return;
    HapticsService.light();

    let curVal = (targetSet[field] as number) ?? 0;
    if (field === 'loadKg' && isLb) {
      // convert to lb, step by 5 lb (or 2.5 lb), convert back to kg
      const curLb = kgToLb(curVal);
      const nextLb = Math.max(0, curLb + step);
      await handleUpdateSet(setId, { loadKg: lbToKg(nextLb) });
    } else {
      const nextVal = Math.max(0, curVal + step);
      await handleUpdateSet(setId, { [field]: nextVal });
    }
  };

  // Cycle set tag (Normal -> Warmup -> Drop -> Failure)
  const handleCycleTag = async (setId: string, currentTag: SetTag) => {
    const tags: SetTag[] = ['normal', 'warmup', 'drop', 'failure'];
    const nextIdx = (tags.indexOf(currentTag) + 1) % tags.length;
    await handleUpdateSet(setId, { tag: tags[nextIdx] });
  };

  // Add new set to an exercise
  const handleAddSet = async (exerciseId: string) => {
    HapticsService.light();
    const existing = exerciseSetsMap.get(exerciseId) || [];
    const lastSet = existing[existing.length - 1];

    const newSet: SetEntry = {
      id: crypto.randomUUID(),
      exerciseId,
      tag: 'normal',
      loadKg: lastSet?.loadKg ?? 20,
      reps: lastSet?.reps ?? 10,
      durationSec: lastSet?.durationSec,
      distanceM: lastSet?.distanceM,
      rounds: lastSet?.rounds,
      done: false
    };

    await updateDraft(d => ({
      ...d,
      sets: [...d.sets, newSet]
    }));
  };

  // Delete set
  const handleDeleteSet = async (setId: string) => {
    HapticsService.medium();
    await updateDraft(d => ({
      ...d,
      sets: d.sets.filter(s => s.id !== setId)
    }));
  };

  // Add exercises from picker
  const handleAddExercises = async (newExIds: string[]) => {
    const newExercisesToAdd = newExIds
      .map(id => exMap.get(id))
      .filter((e): e is Exercise => !!e && !activeDraft.exercises.some(ae => ae.id === e.id));

    const newSetsToAdd: SetEntry[] = [];
    for (const ex of newExercisesToAdd) {
      const pastSets = getPastSetsForExercise(ex.id);
      const target = smartTarget(pastSets, 8, 12);
      // create 3 default sets
      for (let i = 0; i < 3; i++) {
        newSetsToAdd.push({
          id: crypto.randomUUID(),
          exerciseId: ex.id,
          tag: i === 0 && ex.category === 'gym' ? 'warmup' : 'normal',
          loadKg: ex.trackingType === 'reps' ? undefined : (i === 0 ? target.weightKg * 0.5 : target.weightKg),
          reps: ex.trackingType === 'duration' ? undefined : target.reps,
          durationSec: ex.trackingType === 'duration' ? 45 : undefined,
          distanceM: ex.trackingType === 'distance_time' ? 1000 : undefined,
          rounds: ex.trackingType === 'rounds' ? 3 : undefined,
          done: false
        });
      }
    }

    await updateDraft(d => ({
      ...d,
      exercises: [...d.exercises, ...newExercisesToAdd],
      sets: [...d.sets, ...newSetsToAdd]
    }));
  };

  // Remove exercise completely from active workout
  const handleRemoveExercise = async (exerciseId: string) => {
    await updateDraft(d => ({
      ...d,
      exercises: d.exercises.filter(e => e.id !== exerciseId),
      sets: d.sets.filter(s => s.exerciseId !== exerciseId)
    }));
  };

  const completedSetsCount = activeDraft.sets.filter(s => s.done).length;

  const handleFinishAttempt = () => {
    if (completedSetsCount === 0) {
      setShowFinishConfirm(true);
    } else {
      finishWorkout({
        notes: sessionNotes,
        locationId: selectedLocationId
      });
    }
  };

  return (
    <div className="min-h-dvh bg-app-bg text-app-primary flex flex-col antialiased pb-24">
      {/* Sticky Workout Top Navigation Header */}
      <header className="sticky top-0 z-30 bg-app-surface/95 border-b border-app px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsWorkoutMinimized(true)}
            className="w-10 h-10 rounded-xl bg-app-surface-2 border border-app flex items-center justify-center text-app-muted hover:text-app-primary active:scale-95 transition-transform"
            aria-label={t.minimizeWorkoutAria}
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <h1 className="text-base font-bold text-app-primary tracking-tight leading-tight truncate max-w-[160px] sm:max-w-xs">
              {activeDraft.collectionName || t.activeWorkout}
            </h1>
            <div className="flex items-center gap-2 text-xs text-app-muted">
              <span className="tabular-nums font-bold text-app-accent flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatDuration(elapsedSec)}</span>
              </span>
              <button
                type="button"
                onClick={togglePauseWorkout}
                className="px-1.5 py-0.5 rounded bg-app-surface-2 border border-app text-[10px] font-bold uppercase tracking-wider text-app-muted hover:text-app-primary flex items-center gap-1"
                aria-label={activeDraft.isPaused ? t.resumeTimerAria : t.pauseTimerAria}
              >
                {activeDraft.isPaused ? (
                  <>
                    <Play className="w-2.5 h-2.5 fill-current text-emerald-400" />
                    <span className="text-emerald-400">{t.paused}</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-2.5 h-2.5 fill-current" />
                    <span>{t.pause}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Finish & Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNotesModal(true)}
            className="w-10 h-10 rounded-xl bg-app-surface-2 border border-app flex items-center justify-center text-app-muted hover:text-app-primary active:scale-95 transition-transform"
            aria-label={t.workoutNotesAria}
          >
            <FileText className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleFinishAttempt}
            className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{t.finishWorkout}</span>
          </button>
        </div>
      </header>

      {/* Main Exercise Cards List */}
      <main className="w-full max-w-3xl mx-auto p-3 space-y-3">
        {activeDraft.exercises.length === 0 ? (
          <div className="p-8 rounded-2xl bg-app-surface border border-dashed border-app text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-app-surface-2 border border-app flex items-center justify-center text-app-muted mb-3">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-app-primary">{t.noExercisesInWorkout}</h3>
            <p className="text-xs text-app-muted mt-1 max-w-sm mb-4">
              {t.noExercisesDesc}
            </p>
            <button
              type="button"
              onClick={() => setShowExercisePicker(true)}
              className="h-11 px-5 rounded-xl bg-app-accent text-on-accent font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addFirstExercise}</span>
            </button>
          </div>
        ) : (
          activeDraft.exercises.map((ex, exIdx) => {
            const exSets = exerciseSetsMap.get(ex.id) || [];
            const pastSets = getPastSetsForExercise(ex.id);
            const target = smartTarget(pastSets, 8, 12);

            return (
              <section 
                key={ex.id}
                className="rounded-2xl bg-app-surface border border-app overflow-hidden"
              >
                {/* Exercise Header */}
                <div className="p-3 border-b border-app flex items-start justify-between gap-3 bg-app-surface-2/30">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <CategoryChip category={ex.category} />
                      <span className="text-[10px] uppercase font-bold text-app-muted tracking-wider">
                        #{exIdx + 1}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-app-primary tracking-tight">
                      {ex.name}
                    </h2>
                    <span className="text-xs text-app-muted capitalize">
                      {ex.equipment.replace(/_/g, ' ')} · {ex.primaryMuscles.map(m => m.replace(/_/g, ' ')).join(', ')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(ex.id)}
                    className="p-2 rounded-lg text-app-muted hover:text-red-400 transition-colors"
                    aria-label={`${t.removeExerciseAria.replace('{name}', ex.name)}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Smart Overload Recommendation Pill */}
                {target.reason && (
                  <div className="mx-3 mt-2 p-2.5 rounded-xl bg-app-surface-2 border border-app-accent/20 flex items-center gap-2.5 text-xs text-app-primary">
                    <div className="w-6 h-6 rounded-lg bg-app-accent/15 flex items-center justify-center text-app-accent shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 text-[11px] leading-tight">
                      <span className="font-bold text-app-accent">{t.smartTarget}: </span>
                      <span className="text-app-muted">{target.reason}</span>
                    </div>
                  </div>
                )}

                {/* Sets Table */}
                <div className="p-3 overflow-x-auto">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-app text-[10px] uppercase font-bold text-app-muted tracking-wider">
                        <th className="py-2 px-1 text-center w-7">{t.colSet}</th>
                        <th className="py-2 px-1 text-center w-9">{t.colTag}</th>
                        <th className="py-2 px-2 text-start">
                          {ex.trackingType === 'reps' ? t.colType : isLb ? t.colWeightLb : t.colWeightKg}
                        </th>
                        <th className="py-2 px-2 text-start">
                          {ex.trackingType === 'duration' ? t.colDurationSec : t.colReps}
                        </th>
                        <th className="py-2 px-1 text-center w-12">{t.setRPE}</th>
                        <th className="py-2 px-1 text-center w-14">{t.done}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app/50">
                      {exSets.map((s, sIdx) => {
                        const est1RM = s.loadKg && s.reps ? epley1RM(s.loadKg, s.reps, ex.trackingType === 'bodyweight', settings.userBodyweightKg) : 0;
                        const weightDisplay = s.loadKg !== undefined 
                          ? (isLb ? kgToLb(s.loadKg).toFixed(1) : s.loadKg)
                          : '—';

                        return (
                          <tr 
                            key={s.id} 
                            className={`transition-colors ${s.done ? 'bg-emerald-500/5' : ''}`}
                          >
                            {/* Set Number */}
                            <td className="py-2.5 px-1 text-center font-bold text-app-muted tabular-nums">
                              {sIdx + 1}
                            </td>

                            {/* Set Tag badge button */}
                            <td className="py-2.5 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleCycleTag(s.id, s.tag)}
                                className={`w-7 h-7 rounded-lg text-[10px] font-black uppercase flex items-center justify-center border transition-all ${
                                  s.tag === 'warmup' 
                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                                    : s.tag === 'drop'
                                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                                    : s.tag === 'failure'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                    : 'bg-app-surface-2 text-app-muted border-app'
                                }`}
                                aria-label={t.setTagAria.replace('{n}', String(sIdx + 1)).replace('{tag}', s.tag)}
                              >
                                {s.tag === 'warmup' ? 'W' : s.tag === 'drop' ? 'D' : s.tag === 'failure' ? 'F' : '—'}
                              </button>
                            </td>

                            {/* Weight / Load with Steppers */}
                            <td className="py-2 px-1.5">
                              {ex.trackingType === 'reps' ? (
                                <span className="text-app-muted text-xs">{t.equip_bodyweight}</span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleStepValue(s.id, 'loadKg', isLb ? -5 : -2.5)}
                                    className="w-7 h-8 rounded-lg bg-app-surface-2 border border-app hover:bg-app-surface text-app-muted hover:text-app-primary flex items-center justify-center text-xs font-bold active:scale-95"
                                    aria-label={t.decreaseWeight}
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    step={isLb ? '2.5' : '1.25'}
                                    value={weightDisplay}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      handleUpdateSet(s.id, { loadKg: isLb ? lbToKg(val) : val });
                                    }}
                                    className="w-14 h-8 text-center rounded-lg bg-app-surface-2 border border-app text-xs font-bold text-app-primary focus:border-app-accent focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleStepValue(s.id, 'loadKg', isLb ? 5 : 2.5)}
                                    className="w-7 h-8 rounded-lg bg-app-surface-2 border border-app hover:bg-app-surface text-app-muted hover:text-app-primary flex items-center justify-center text-xs font-bold active:scale-95"
                                    aria-label={t.increaseWeight}
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Reps or Duration with Steppers */}
                            <td className="py-2 px-1.5">
                              {ex.trackingType === 'duration' ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleStepValue(s.id, 'durationSec', -5)}
                                    className="w-7 h-8 rounded-lg bg-app-surface-2 border border-app hover:bg-app-surface text-app-muted hover:text-app-primary flex items-center justify-center text-xs font-bold active:scale-95"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    value={s.durationSec ?? 30}
                                    onChange={(e) => handleUpdateSet(s.id, { durationSec: parseInt(e.target.value, 10) || 0 })}
                                    className="w-12 h-8 text-center rounded-lg bg-app-surface-2 border border-app text-xs font-bold text-app-primary focus:border-app-accent focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleStepValue(s.id, 'durationSec', 5)}
                                    className="w-7 h-8 rounded-lg bg-app-surface-2 border border-app hover:bg-app-surface text-app-muted hover:text-app-primary flex items-center justify-center text-xs font-bold active:scale-95"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleStepValue(s.id, 'reps', -1)}
                                    className="w-7 h-8 rounded-lg bg-app-surface-2 border border-app hover:bg-app-surface text-app-muted hover:text-app-primary flex items-center justify-center text-xs font-bold active:scale-95"
                                    aria-label={t.decreaseReps}
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    value={s.reps ?? 10}
                                    onChange={(e) => handleUpdateSet(s.id, { reps: parseInt(e.target.value, 10) || 0 })}
                                    className="w-10 h-8 text-center rounded-lg bg-app-surface-2 border border-app text-xs font-bold text-app-primary focus:border-app-accent focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleStepValue(s.id, 'reps', 1)}
                                    className="w-7 h-8 rounded-lg bg-app-surface-2 border border-app hover:bg-app-surface text-app-muted hover:text-app-primary flex items-center justify-center text-xs font-bold active:scale-95"
                                    aria-label={t.increaseReps}
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* RPE Selector Pill */}
                            <td className="py-2.5 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => setRpeSelectorSetId(rpeSelectorSetId === s.id ? null : s.id)}
                                className={`px-2 py-1 rounded text-[11px] font-bold border transition-all ${
                                  s.rpe 
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                                    : 'bg-app-surface-2 text-app-muted border-app hover:text-app-primary'
                                }`}
                              >
                                {s.rpe ? s.rpe : t.setRPE}
                              </button>
                            </td>

                            {/* 48px Completion Checkmark (Gym-finger friendly touch target) */}
                            <td className="py-2 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleSetDone(s, ex)}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                                  s.done 
                                    ? 'bg-emerald-500 text-black font-black' 
                                    : 'bg-app-surface-2 border-2 border-app text-app-muted hover:border-emerald-500/50'
                                }`}
                                aria-label={t.markSetAria.replace('{n}', String(sIdx + 1))}
                              >
                                <Check className={`w-6 h-6 stroke-[3] ${s.done ? 'scale-110' : 'opacity-40'}`} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Inline RPE Selection Bar (when clicked) */}
                {rpeSelectorSetId && exSets.some(s => s.id === rpeSelectorSetId) && (
                  <div className="mx-3 mb-2.5 p-3 rounded-xl bg-app-surface-2 border border-app flex items-center justify-between gap-1 overflow-x-auto">
                    <span className="text-[10px] font-bold uppercase text-app-muted shrink-0 me-2">
                      {t.selectRPE}
                    </span>
                    {[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          handleUpdateSet(rpeSelectorSetId, { rpe: val });
                          setRpeSelectorSetId(null);
                        }}
                        className="h-8 px-2.5 rounded-lg bg-app-surface border border-app hover:border-amber-400 text-xs font-bold text-app-primary active:scale-95 transition-all"
                      >
                        {val}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateSet(rpeSelectorSetId, { rpe: undefined });
                        setRpeSelectorSetId(null);
                      }}
                      className="h-8 px-2 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10"
                    >
                      {t.clearBtn}
                    </button>
                  </div>
                )}

                {/* Card Bottom Actions */}
                <div className="p-2.5 border-t border-app flex items-center justify-between bg-app-surface-2/20">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddSet(ex.id)}
                      className="h-9 px-3 rounded-xl bg-app-surface-2 border border-app hover:bg-app-surface text-app-primary text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.addSet}</span>
                    </button>

                    {(ex.trackingType === 'rounds' || ex.category === 'martial_arts') && (
                      <button
                        type="button"
                        onClick={() => startRoundTimer({
                          roundSec: ex.roundConfig?.roundSec || 180,
                          restSec: ex.roundConfig?.restSec || 60,
                          rounds: ex.roundConfig?.rounds || 5,
                          exerciseName: ex.name,
                        })}
                        className="h-9 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-400 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t.roundTimerBtn}</span>
                      </button>
                    )}
                  </div>

                  {exSets.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSet(exSets[exSets.length - 1].id)}
                      className="h-9 px-3 rounded-xl text-app-muted hover:text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.removeLastSet}</span>
                    </button>
                  )}
                </div>
              </section>
            );
          })
        )}

        {/* Add Exercise Floating / Bottom Button */}
        <button
          type="button"
          onClick={() => setShowExercisePicker(true)}
          className="w-full h-13 rounded-2xl bg-app-surface border-2 border-dashed border-app hover:border-app-accent text-app-primary font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5 text-app-accent" />
          <span>{t.addExerciseToWorkout}</span>
        </button>

        {/* Discard Workout Danger Action */}
        <div className="pt-4 pb-8 flex justify-center">
          <button
            type="button"
            onClick={() => setShowDiscardConfirm(true)}
            className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 p-2 rounded-lg active:scale-95 transition-transform"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t.discardWorkoutSession}</span>
          </button>
        </div>
      </main>

      {/* Rest Timer Modal / Floating Pill */}
      {restTimer && (
        <RestTimerModal
          timer={restTimer}
          onAdjust={adjustRestTimer}
          onSkip={skipRestTimer}
          onToggleMinimize={toggleRestTimerMinimize}
        />
      )}

      {/* Round Interval Timer Modal / Floating Pill */}
      {roundTimer && (
        <RoundTimerModal
          timer={roundTimer}
          onPause={pauseRoundTimer}
          onResume={resumeRoundTimer}
          onSkipPhase={skipRoundTimerPhase}
          onStop={stopRoundTimer}
          onToggleMinimize={toggleRoundTimerMinimize}
        />
      )}

      {/* In-Workout PR Celebration Modal */}
      {celebrationPR && (
        <PRCelebrationModal
          pr={celebrationPR}
          exerciseName={exMap.get(celebrationPR.exerciseId)?.name}
          weightUnit={settings.weightUnit}
          onDismiss={dismissPRCelebration}
        />
      )}

      {/* Exercise Picker Modal */}
      <ExercisePickerModal
        isOpen={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onAddExercises={handleAddExercises}
        alreadySelectedIds={activeDraft.exercises.map(e => e.id)}
      />

      {/* Workout Notes and Location Dialog */}
      <Dialog
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        title={t.workoutDetails}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-app-muted mb-1.5">
              {t.trainingLocation}
            </label>
            <select
              value={selectedLocationId || ''}
              onChange={(e) => setSelectedLocationId(e.target.value || undefined)}
              className="w-full h-11 px-3 rounded-xl bg-app-surface-2 border border-app text-sm text-app-primary font-medium focus:border-app-accent focus:outline-none"
            >
              <option value="">{t.noLocationSpecified}</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-app-muted mb-1.5">
              {t.sessionNotes}
            </label>
            <textarea
              rows={3}
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              className="w-full p-3 rounded-xl bg-app-surface-2 border border-app text-sm text-app-primary placeholder:text-app-muted focus:border-app-accent focus:outline-none resize-none"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              updateDraft(d => ({
                ...d,
                notes: sessionNotes,
                locationId: selectedLocationId
              }));
              setShowNotesModal(false);
            }}
            className="w-full h-11 rounded-xl bg-app-accent text-on-accent font-bold text-xs uppercase tracking-wider"
          >
            {t.saveNotesBtn}
          </button>
        </div>
      </Dialog>

      {/* Discard Confirmation Dialog */}
      <Dialog
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        title={t.discardConfirmTitle}
      >
        <div className="space-y-4">
          <p className="text-xs text-app-muted">
            {t.discardActiveDesc}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDiscardConfirm(false)}
              className="flex-1 h-11 rounded-xl bg-app-surface-2 border border-app font-bold text-xs text-app-primary"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDiscardConfirm(false);
                discardWorkout();
              }}
              className="flex-1 h-11 rounded-xl bg-red-500 font-bold text-xs text-white"
            >
              {t.discard}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Finish With 0 Completed Sets Confirmation Dialog */}
      <Dialog
        isOpen={showFinishConfirm}
        onClose={() => setShowFinishConfirm(false)}
        title={t.noCompletedSets}
      >
        <div className="space-y-4">
          <p className="text-xs text-app-muted">
            {t.noCompletedSetsDesc}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFinishConfirm(false)}
              className="flex-1 h-11 rounded-xl bg-app-surface-2 border border-app font-bold text-xs text-app-primary"
            >
              {t.continueWorkout}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowFinishConfirm(false);
                finishWorkout({
                  notes: sessionNotes,
                  locationId: selectedLocationId
                });
              }}
              className="flex-1 h-11 rounded-xl bg-emerald-500 font-bold text-xs text-black"
            >
              {t.saveAnyway}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
