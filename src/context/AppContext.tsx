import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  Settings, 
  Exercise, 
  Collection, 
  Session, 
  Schedule, 
  Location, 
  ActiveSessionDraft, 
  AppLanguage,
  PRRecord,
  SetEntry 
} from '../types/index.ts';
import { StorageService } from '../services/storage.ts';
import { NotificationService } from '../services/notification.ts';
import { SoundService } from '../services/sound.ts';
import { HapticsService } from '../services/haptics.ts';
import { KeepAwakeService } from '../services/keepAwake.ts';
import { getTranslations, setDocumentDirection, Translations } from '../i18n/index.ts';
import { 
  SEED_EXERCISES, 
  SEED_COLLECTIONS, 
  SEED_LOCATIONS, 
  SEED_SCHEDULES, 
  generateSeedSessions 
} from '../data/seed.ts';
import { DEFAULT_SETTINGS } from '../domain/constants.ts';
import { 
  buildInitialDraftSets, 
  calculateSessionSummary 
} from '../domain/sessionCalculations.ts';

export type TabRoute = 'home' | 'library' | 'calendar' | 'progress' | 'more';

export interface RestTimerState {
  active: boolean;
  startedAtTimestamp: number;
  targetEndTimestamp: number;
  totalSec: number;
  remainingSec: number;
  exerciseName?: string;
  isMinimized: boolean;
}

export interface RoundTimerState {
  active: boolean;
  exerciseName?: string;
  currentRound: number;
  totalRounds: number;
  phase: 'work' | 'rest' | 'complete';
  roundSec: number;
  restSec: number;
  startedAtTimestamp: number;
  targetEndTimestamp: number;
  remainingSec: number;
  isPaused: boolean;
  pausedRemainingMs?: number;
  isMinimized: boolean;
}

interface AppContextValue {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  exercises: Exercise[];
  collections: Collection[];
  sessions: Session[];
  schedules: Schedule[];
  locations: Location[];
  activeDraft: ActiveSessionDraft | null;
  saveActiveDraft: (draft: ActiveSessionDraft | null) => Promise<void>;
  saveExercise: (exercise: Exercise) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  saveCollection: (collection: Collection) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  saveSession: (session: Session) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  saveSchedule: (schedule: Schedule) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  saveLocation: (loc: Location) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  resetAll: () => Promise<void>;
  activeTab: TabRoute;
  setActiveTab: (tab: TabRoute) => void;
  activeCollectionId: string | null;
  setActiveCollectionId: (id: string | null) => void;
  activeExerciseModal: { mode: 'create' | 'edit'; exerciseId?: string; returnToCollectionId?: string } | null;
  setActiveExerciseModal: (modal: { mode: 'create' | 'edit'; exerciseId?: string; returnToCollectionId?: string } | null) => void;
  togglePinExercise: (id: string) => Promise<void>;
  toggleArchiveExercise: (id: string) => Promise<void>;
  duplicateExercise: (id: string) => Promise<Exercise>;
  duplicateCollection: (id: string) => Promise<Collection>;
  pendingAlert: { title: string; body: string } | null;
  dismissAlert: () => void;
  // Active Workout Engine state & controls
  isWorkoutActive: boolean;
  setIsWorkoutActive: (active: boolean) => void;
  isWorkoutMinimized: boolean;
  setIsWorkoutMinimized: (minimized: boolean) => void;
  summarySession: Session | null;
  setSummarySession: (session: Session | null) => void;
  restTimer: RestTimerState | null;
  roundTimer: RoundTimerState | null;
  celebrationPR: PRRecord | null;
  dismissPRCelebration: () => void;
  triggerPRCelebration: (pr: PRRecord) => void;
  startWorkout: (collectionId?: string) => Promise<void>;
  repeatSession: (session: Session) => Promise<void>;
  updateDraft: (updater: (draft: ActiveSessionDraft) => ActiveSessionDraft) => Promise<void>;
  togglePauseWorkout: () => Promise<void>;
  finishWorkout: (details?: { effort?: number; notes?: string; locationId?: string }) => Promise<Session>;
  discardWorkout: () => Promise<void>;
  startRestTimer: (seconds: number, exerciseName?: string) => void;
  adjustRestTimer: (deltaSec: number) => void;
  skipRestTimer: () => void;
  toggleRestTimerMinimize: () => void;
  startRoundTimer: (config: { roundSec: number; restSec: number; rounds: number; exerciseName?: string }) => void;
  pauseRoundTimer: () => void;
  resumeRoundTimer: () => void;
  skipRoundTimerPhase: () => void;
  stopRoundTimer: () => void;
  toggleRoundTimerMinimize: () => void;
  t: Translations;
  isLoading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeDraft, setActiveDraftState] = useState<ActiveSessionDraft | null>(null);
  const [activeTab, setActiveTab] = useState<TabRoute>('home');
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [activeExerciseModal, setActiveExerciseModal] = useState<{ mode: 'create' | 'edit'; exerciseId?: string; returnToCollectionId?: string } | null>(null);
  const [pendingAlert, setPendingAlert] = useState<{ title: string; body: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active workout state
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useState(false);
  const [summarySession, setSummarySession] = useState<Session | null>(null);
  const [restTimer, setRestTimer] = useState<RestTimerState | null>(null);
  const [roundTimer, setRoundTimer] = useState<RoundTimerState | null>(null);
  const [celebrationPR, setCelebrationPR] = useState<PRRecord | null>(null);

  // Initialize data and run seed if clean
  const loadData = async () => {
    setIsLoading(true);
    await StorageService.init();

    let currentSettings = await StorageService.getSettings();
    let exList = await StorageService.getExercises();
    let colList = await StorageService.getCollections();
    let sessList = await StorageService.getSessions();
    let schList = await StorageService.getSchedules();
    let locList = await StorageService.getLocations();

    // Seed database if clean/empty
    if (exList.length === 0) {
      for (const e of SEED_EXERCISES) await StorageService.saveExercise(e);
      for (const c of SEED_COLLECTIONS) await StorageService.saveCollection(c);
      for (const l of SEED_LOCATIONS) await StorageService.saveLocation(l);
      for (const s of SEED_SCHEDULES) await StorageService.saveSchedule(s);
      const seedSessions = generateSeedSessions();
      for (const ss of seedSessions) await StorageService.saveSession(ss);

      exList = await StorageService.getExercises();
      colList = await StorageService.getCollections();
      sessList = await StorageService.getSessions();
      schList = await StorageService.getSchedules();
      locList = await StorageService.getLocations();
    }

    const draft = await StorageService.getActiveDraft();

    setSettings(currentSettings);
    setExercises(exList);
    setCollections(colList);
    setSessions(sessList);
    setSchedules(schList);
    setLocations(locList);
    setActiveDraftState(draft);
    if (draft) {
      setIsWorkoutActive(true);
      setIsWorkoutMinimized(true);
    }

    // Apply document styling & i18n
    applyTheme(currentSettings.theme);
    setDocumentDirection(currentSettings.language);

    // Reschedule notifications
    await NotificationService.rescheduleAll(schList, sessList);
    setPendingAlert(NotificationService.getPendingWorkoutAlert());

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const applyTheme = (theme: Settings['theme']) => {
    if (typeof document === 'undefined') return;
    const isDark = 
      theme === 'dark' || 
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', isDark ? '#0B0D10' : '#F6F7F9');
    }
  };

  const updateSettings = async (partial: Partial<Settings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await StorageService.saveSettings(updated);

    if (partial.theme) {
      applyTheme(partial.theme);
    }
    if (partial.language) {
      setDocumentDirection(partial.language);
    }
  };

  const saveActiveDraft = async (draft: ActiveSessionDraft | null) => {
    setActiveDraftState(draft);
    await StorageService.saveActiveDraft(draft);
  };

  const saveExercise = async (ex: Exercise) => {
    await StorageService.saveExercise(ex);
    const updated = await StorageService.getExercises();
    setExercises(updated);
  };

  const deleteExercise = async (id: string) => {
    await StorageService.deleteExercise(id);
    const updated = await StorageService.getExercises();
    setExercises(updated);
  };

  const saveCollection = async (c: Collection) => {
    await StorageService.saveCollection(c);
    const updated = await StorageService.getCollections();
    setCollections(updated);
  };

  const deleteCollection = async (id: string) => {
    await StorageService.deleteCollection(id);
    const updated = await StorageService.getCollections();
    setCollections(updated);
  };

  const saveSession = async (s: Session) => {
    await StorageService.saveSession(s);
    const updated = await StorageService.getSessions();
    setSessions(updated);
  };

  const deleteSession = async (id: string) => {
    await StorageService.deleteSession(id);
    const updated = await StorageService.getSessions();
    setSessions(updated);
  };

  const saveSchedule = async (sc: Schedule) => {
    await StorageService.saveSchedule(sc);
    const updated = await StorageService.getSchedules();
    setSchedules(updated);
    await NotificationService.rescheduleAll(updated, sessions);
    setPendingAlert(NotificationService.getPendingWorkoutAlert());
  };

  const deleteSchedule = async (id: string) => {
    await StorageService.deleteSchedule(id);
    const updated = await StorageService.getSchedules();
    setSchedules(updated);
    await NotificationService.rescheduleAll(updated, sessions);
    setPendingAlert(NotificationService.getPendingWorkoutAlert());
  };

  const saveLocation = async (loc: Location) => {
    await StorageService.saveLocation(loc);
    const updated = await StorageService.getLocations();
    setLocations(updated);
  };

  const deleteLocation = async (id: string) => {
    await StorageService.deleteLocation(id);
    const updated = await StorageService.getLocations();
    setLocations(updated);
  };

  const togglePinExercise = async (id: string) => {
    const ex = exercises.find(e => e.id === id);
    if (!ex) return;
    const updated: Exercise = { ...ex, isPinned: !ex.isPinned };
    await saveExercise(updated);
  };

  const toggleArchiveExercise = async (id: string) => {
    const ex = exercises.find(e => e.id === id);
    if (!ex) return;
    const updated: Exercise = { ...ex, isArchived: !ex.isArchived };
    await saveExercise(updated);
  };

  const duplicateExercise = async (id: string): Promise<Exercise> => {
    const ex = exercises.find(e => e.id === id);
    if (!ex) throw new Error('Exercise not found');
    const copy: Exercise = {
      ...ex,
      id: crypto.randomUUID(),
      name: `${ex.name} (Copy)`,
      source: 'custom',
      isPinned: false
    };
    await saveExercise(copy);
    return copy;
  };

  const duplicateCollection = async (id: string): Promise<Collection> => {
    const col = collections.find(c => c.id === id);
    if (!col) throw new Error('Collection not found');
    const copy: Collection = {
      ...col,
      id: crypto.randomUUID(),
      name: `${col.name} (Copy)`,
      items: col.items.map(it => ({ ...it }))
    };
    await saveCollection(copy);
    return copy;
  };

  const resetAll = async () => {
    await StorageService.resetAllData();
    await loadData();
  };

  const dismissAlert = () => {
    NotificationService.clearPendingWorkoutAlert();
    setPendingAlert(null);
  };

  // Re-acquire Screen Wake Lock on visibilitychange while workout is active
  useEffect(() => {
    const handleVisChange = async () => {
      if (document.visibilityState === 'visible' && isWorkoutActive) {
        await KeepAwakeService.reacquireIfNeeded();
      }
    };
    document.addEventListener('visibilitychange', handleVisChange);
    return () => document.removeEventListener('visibilitychange', handleVisChange);
  }, [isWorkoutActive]);

  // Schedule background notifications for rest-timer end and round-timer phase changes
  useEffect(() => {
    const handleTimerVisibility = async () => {
      if (document.visibilityState === 'hidden') {
        if (restTimer && restTimer.active) {
          await NotificationService.scheduleRestTimerEnd(
            restTimer.targetEndTimestamp,
            restTimer.exerciseName
          );
        }
        if (roundTimer && roundTimer.active && !roundTimer.isPaused) {
          await NotificationService.scheduleRoundTimerPhaseChange(
            roundTimer.targetEndTimestamp,
            roundTimer.currentRound,
            roundTimer.totalRounds,
            roundTimer.phase,
            roundTimer.exerciseName
          );
        }
      } else if (document.visibilityState === 'visible') {
        await NotificationService.cancelTimerNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleTimerVisibility);
    return () => document.removeEventListener('visibilitychange', handleTimerVisibility);
  }, [restTimer, roundTimer]);

  // Rest Timer ticker: ALWAYS computes remaining from Date.now(). Never decrements counter.
  useEffect(() => {
    if (!restTimer || !restTimer.active) return;

    const tick = () => {
      setRestTimer(prev => {
        if (!prev || !prev.active) return null;
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((prev.targetEndTimestamp - now) / 1000));
        if (remaining <= 0) {
          SoundService.playRestEndBeep();
          HapticsService.warning();
          return null;
        }
        if (remaining === 3 || remaining === 2 || remaining === 1) {
          SoundService.playCountdownWarningBeep();
        }
        return { ...prev, remainingSec: remaining };
      });
    };

    tick();
    const interval = setInterval(tick, 250);
    const handleVisibility = () => tick();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [restTimer?.active, restTimer?.targetEndTimestamp]);

  const startRestTimer = (seconds: number, exerciseName?: string) => {
    if (seconds <= 0) return;
    const now = Date.now();
    setRestTimer({
      active: true,
      startedAtTimestamp: now,
      targetEndTimestamp: now + seconds * 1000,
      totalSec: seconds,
      remainingSec: seconds,
      exerciseName,
      isMinimized: false
    });
  };

  const adjustRestTimer = (deltaSec: number) => {
    setRestTimer(prev => {
      if (!prev || !prev.active) return null;
      const now = Date.now();
      const updatedEnd = prev.targetEndTimestamp + deltaSec * 1000;
      const remainingSec = Math.max(0, Math.ceil((updatedEnd - now) / 1000));
      if (remainingSec <= 0) return null;
      const totalSec = Math.max(prev.totalSec, Math.ceil((updatedEnd - prev.startedAtTimestamp) / 1000));
      return {
        ...prev,
        targetEndTimestamp: updatedEnd,
        totalSec,
        remainingSec
      };
    });
  };

  const skipRestTimer = () => {
    setRestTimer(null);
  };

  const toggleRestTimerMinimize = () => {
    setRestTimer(prev => prev ? { ...prev, isMinimized: !prev.isMinimized } : null);
  };

  // Round Timer ticker: ALWAYS computes remaining time from Date.now(). Never decrements counter.
  useEffect(() => {
    if (!roundTimer || !roundTimer.active || roundTimer.isPaused) return;

    const tick = () => {
      setRoundTimer(prev => {
        if (!prev || !prev.active || prev.isPaused) return prev;
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((prev.targetEndTimestamp - now) / 1000));

        if (remaining > 0) {
          if (remaining === 3 || remaining === 2 || remaining === 1) {
            SoundService.playCountdownWarningBeep();
          }
          return { ...prev, remainingSec: remaining };
        }

        // Phase finished: transition
        if (prev.phase === 'work') {
          SoundService.playRoundBell();
          HapticsService.warning();
          if (prev.currentRound < prev.totalRounds) {
            const nextTarget = now + prev.restSec * 1000;
            return {
              ...prev,
              phase: 'rest',
              startedAtTimestamp: now,
              targetEndTimestamp: nextTarget,
              remainingSec: prev.restSec,
            };
          } else {
            SoundService.playPRCelebrationFanfare();
            HapticsService.success();
            return {
              ...prev,
              phase: 'complete',
              remainingSec: 0,
            };
          }
        } else if (prev.phase === 'rest') {
          SoundService.playRoundBell();
          HapticsService.success();
          const nextRound = prev.currentRound + 1;
          const nextTarget = now + prev.roundSec * 1000;
          return {
            ...prev,
            currentRound: nextRound,
            phase: 'work',
            startedAtTimestamp: now,
            targetEndTimestamp: nextTarget,
            remainingSec: prev.roundSec,
          };
        }

        return prev;
      });
    };

    tick();
    const interval = setInterval(tick, 250);
    const handleVisibility = () => tick();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [roundTimer?.active, roundTimer?.isPaused, roundTimer?.targetEndTimestamp, roundTimer?.phase]);

  const startRoundTimer = (config: { roundSec: number; restSec: number; rounds: number; exerciseName?: string }) => {
    const now = Date.now();
    setRoundTimer({
      active: true,
      exerciseName: config.exerciseName,
      currentRound: 1,
      totalRounds: Math.max(1, config.rounds),
      phase: 'work',
      roundSec: Math.max(1, config.roundSec),
      restSec: Math.max(0, config.restSec),
      startedAtTimestamp: now,
      targetEndTimestamp: now + config.roundSec * 1000,
      remainingSec: config.roundSec,
      isPaused: false,
      isMinimized: false,
    });
    SoundService.playRoundBell();
    HapticsService.success();
  };

  const pauseRoundTimer = () => {
    setRoundTimer(prev => {
      if (!prev || !prev.active || prev.isPaused) return prev;
      const now = Date.now();
      const remainingMs = Math.max(0, prev.targetEndTimestamp - now);
      return {
        ...prev,
        isPaused: true,
        pausedRemainingMs: remainingMs,
        remainingSec: Math.max(0, Math.ceil(remainingMs / 1000))
      };
    });
  };

  const resumeRoundTimer = () => {
    setRoundTimer(prev => {
      if (!prev || !prev.active || !prev.isPaused) return prev;
      const now = Date.now();
      const remainingMs = prev.pausedRemainingMs ?? (prev.remainingSec * 1000);
      return {
        ...prev,
        isPaused: false,
        startedAtTimestamp: now,
        targetEndTimestamp: now + remainingMs,
        remainingSec: Math.max(0, Math.ceil(remainingMs / 1000)),
        pausedRemainingMs: undefined
      };
    });
  };

  const skipRoundTimerPhase = () => {
    setRoundTimer(prev => {
      if (!prev || !prev.active) return null;
      const now = Date.now();
      if (prev.phase === 'work') {
        SoundService.playRoundBell();
        HapticsService.light();
        if (prev.currentRound < prev.totalRounds) {
          const nextTarget = now + prev.restSec * 1000;
          return {
            ...prev,
            phase: 'rest',
            startedAtTimestamp: now,
            targetEndTimestamp: nextTarget,
            remainingSec: prev.restSec,
            isPaused: false
          };
        } else {
          return { ...prev, phase: 'complete', remainingSec: 0 };
        }
      } else if (prev.phase === 'rest') {
        SoundService.playRoundBell();
        HapticsService.light();
        const nextRound = prev.currentRound + 1;
        const nextTarget = now + prev.roundSec * 1000;
        return {
          ...prev,
          currentRound: nextRound,
          phase: 'work',
          startedAtTimestamp: now,
          targetEndTimestamp: nextTarget,
          remainingSec: prev.roundSec,
          isPaused: false
        };
      }
      return prev;
    });
  };

  const stopRoundTimer = () => {
    setRoundTimer(null);
  };

  const toggleRoundTimerMinimize = () => {
    setRoundTimer(prev => prev ? { ...prev, isMinimized: !prev.isMinimized } : null);
  };

  const triggerPRCelebration = (pr: PRRecord) => {
    setCelebrationPR(pr);
    SoundService.playPRCelebrationFanfare();
    HapticsService.success();
  };

  const dismissPRCelebration = () => {
    setCelebrationPR(null);
  };

  const startWorkout = async (collectionId?: string) => {
    const col = collectionId ? collections.find(c => c.id === collectionId) : undefined;
    let initialSets: any[] = [];
    let draftEx: Exercise[] = [];

    if (col && col.items.length > 0) {
      const built = buildInitialDraftSets(col, exercises, sessions);
      initialSets = built.sets;
      draftEx = built.draftExercises;
    } else {
      draftEx = [];
      initialSets = [];
    }

    const draft: ActiveSessionDraft = {
      id: crypto.randomUUID(),
      collectionId: col?.id,
      collectionName: col?.name || t.freestyleWorkout,
      startedAt: new Date().toISOString(),
      pausedMs: 0,
      isPaused: false,
      currentExerciseIndex: 0,
      sets: initialSets,
      exercises: draftEx
    };

    setActiveDraftState(draft);
    await StorageService.saveActiveDraft(draft);
    setIsWorkoutActive(true);
    setIsWorkoutMinimized(false);
    await KeepAwakeService.keepAwake();
  };

  const repeatSession = async (session: Session) => {
    const exerciseIds = Array.from(new Set(session.sets.map(s => s.exerciseId)));
    const draftEx = exerciseIds
      .map(id => exercises.find(e => e.id === id))
      .filter((e): e is Exercise => Boolean(e));

    const freshSets: SetEntry[] = session.sets.map((s) => ({
      id: crypto.randomUUID(),
      exerciseId: s.exerciseId,
      loadKg: s.loadKg,
      reps: s.reps,
      durationSec: s.durationSec,
      distanceM: s.distanceM,
      rounds: s.rounds,
      rpe: undefined,
      tag: s.tag,
      done: false,
    }));

    const draft: ActiveSessionDraft = {
      id: crypto.randomUUID(),
      collectionId: session.collectionId,
      collectionName: session.collectionName ? `${session.collectionName}` : t.repeatedWorkout,
      startedAt: new Date().toISOString(),
      pausedMs: 0,
      isPaused: false,
      currentExerciseIndex: 0,
      sets: freshSets,
      exercises: draftEx,
      notes: session.notes,
    };

    setActiveDraftState(draft);
    await StorageService.saveActiveDraft(draft);
    setIsWorkoutActive(true);
    setIsWorkoutMinimized(false);
    await KeepAwakeService.keepAwake();
  };

  const updateDraft = async (updater: (draft: ActiveSessionDraft) => ActiveSessionDraft) => {
    if (!activeDraft) return;
    const updated = updater(activeDraft);
    setActiveDraftState(updated);
    await StorageService.saveActiveDraft(updated);
  };

  const togglePauseWorkout = async () => {
    if (!activeDraft) return;
    const now = Date.now();
    let updated: ActiveSessionDraft;
    if (activeDraft.isPaused) {
      const pausedDuration = activeDraft.lastPausedAt ? now - new Date(activeDraft.lastPausedAt).getTime() : 0;
      updated = {
        ...activeDraft,
        isPaused: false,
        pausedMs: (activeDraft.pausedMs || 0) + Math.max(0, pausedDuration),
        lastPausedAt: undefined
      };
    } else {
      updated = {
        ...activeDraft,
        isPaused: true,
        lastPausedAt: new Date(now).toISOString()
      };
    }
    setActiveDraftState(updated);
    await StorageService.saveActiveDraft(updated);
  };

  const finishWorkout = async (details?: { effort?: number; notes?: string; locationId?: string }): Promise<Session> => {
    if (!activeDraft) throw new Error('No active workout draft');

    const endedAt = new Date().toISOString();
    const sessionNum = sessions.length + 1;

    const rawSession: Session = {
      id: crypto.randomUUID(),
      number: sessionNum,
      startedAt: activeDraft.startedAt,
      endedAt,
      pausedMs: activeDraft.pausedMs || 0,
      collectionId: activeDraft.collectionId,
      collectionName: activeDraft.collectionName,
      locationId: details?.locationId || activeDraft.locationId,
      effort: details?.effort ?? 7.5,
      notes: details?.notes ?? activeDraft.notes,
      xpGained: 0,
      sets: activeDraft.sets
    };

    const summary = calculateSessionSummary(rawSession, exercises, settings.userBodyweightKg, sessions);
    rawSession.xpGained = summary.xpEarned;

    await saveSession(rawSession);
    await StorageService.saveActiveDraft(null);
    setActiveDraftState(null);
    setIsWorkoutActive(false);
    setIsWorkoutMinimized(false);
    setRestTimer(null);
    setRoundTimer(null);
    await KeepAwakeService.allowSleep();

    // Re-evaluate reminders since today's workout is now completed
    const updatedSessions = [rawSession, ...sessions];
    await NotificationService.rescheduleAll(schedules, updatedSessions);
    setPendingAlert(NotificationService.getPendingWorkoutAlert());

    setSummarySession(rawSession);
    return rawSession;
  };

  const discardWorkout = async () => {
    await StorageService.saveActiveDraft(null);
    setActiveDraftState(null);
    setIsWorkoutActive(false);
    setIsWorkoutMinimized(false);
    setRestTimer(null);
    setRoundTimer(null);
    await KeepAwakeService.allowSleep();
  };

  const t = useMemo(() => getTranslations(settings.language as AppLanguage), [settings.language]);

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        exercises,
        collections,
        sessions,
        schedules,
        locations,
        activeDraft,
        saveActiveDraft,
        saveExercise,
        deleteExercise,
        saveCollection,
        deleteCollection,
        saveSession,
        deleteSession,
        saveSchedule,
        deleteSchedule,
        saveLocation,
        deleteLocation,
        resetAll,
        activeTab,
        setActiveTab,
        activeCollectionId,
        setActiveCollectionId,
        activeExerciseModal,
        setActiveExerciseModal,
        togglePinExercise,
        toggleArchiveExercise,
        duplicateExercise,
        duplicateCollection,
        pendingAlert,
        dismissAlert,
        isWorkoutActive,
        setIsWorkoutActive,
        isWorkoutMinimized,
        setIsWorkoutMinimized,
        summarySession,
        setSummarySession,
        restTimer,
        roundTimer,
        celebrationPR,
        dismissPRCelebration,
        triggerPRCelebration,
        startWorkout,
        repeatSession,
        updateDraft,
        togglePauseWorkout,
        finishWorkout,
        discardWorkout,
        startRestTimer,
        adjustRestTimer,
        skipRestTimer,
        toggleRestTimerMinimize,
        startRoundTimer,
        pauseRoundTimer,
        resumeRoundTimer,
        skipRoundTimerPhase,
        stopRoundTimer,
        toggleRoundTimerMinimize,
        t,
        isLoading
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
};
