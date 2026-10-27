import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Dumbbell, 
  Flame, 
  Layers, 
  Repeat, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trophy, 
  CheckCircle2,
  Activity,
  Zap,
  Target
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { Session, ExerciseCategory, Exercise } from '../types/index.ts';
import { 
  getCalendarMonthMatrix, 
  groupSessionsByDate, 
  formatDateKey, 
  getSessionDominantCategory, 
  getDayDisciplines,
  filterSessionsByDiscipline 
} from '../domain/analyticsCalculations.ts';
import { calculateStreak, calculateXP } from '../domain/calculations.ts';

const DISCIPLINE_CONFIG: Record<ExerciseCategory, { color: string; bg: string; border: string }> = {
  gym: { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' },
  calisthenics: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' },
  martial_arts: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' },
  cardio: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' },
  custom: { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)' }
};

export const CalendarScreen: React.FC = () => {
  const { sessions, schedules, collections, exercises, deleteSession, repeatSession, startWorkout, settings, t } = useApp();

  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(new Date()));
  const [disciplineFilter, setDisciplineFilter] = useState<ExerciseCategory | 'all'>('all');
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(new Set());
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);

  const exercisesMap = useMemo(() => {
    return new Map(exercises.map(e => [e.id, e]));
  }, [exercises]);

  const DISCIPLINE_LABELS: Record<ExerciseCategory, string> = {
    gym: t.discWeightlifting,
    calisthenics: t.calisthenics,
    martial_arts: t.martial_arts,
    cardio: t.cardio,
    custom: t.custom
  };

  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  const monthName = useMemo(() => {
    return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  const streak = useMemo(() => {
    return calculateStreak(sessions, schedules);
  }, [sessions, schedules]);

  const xp = useMemo(() => {
    return calculateXP(sessions, 5);
  }, [sessions]);

  // Calendar matrix days for current viewed month
  const calendarDays = useMemo(() => {
    return getCalendarMonthMatrix(viewYear, viewMonth, today);
  }, [viewYear, viewMonth, today]);

  // Filter sessions by discipline if selected
  const filteredSessions = useMemo(() => {
    return filterSessionsByDiscipline(sessions, disciplineFilter, exercisesMap);
  }, [sessions, disciplineFilter, exercisesMap]);

  // Group filtered sessions by date key
  const sessionsByDate = useMemo(() => {
    return groupSessionsByDate(filteredSessions);
  }, [filteredSessions]);

  // All sessions mapped by date for calendar indicators
  const allSessionsByDate = useMemo(() => {
    return groupSessionsByDate(sessions);
  }, [sessions]);

  // Selected date's sessions
  const selectedDaySessions = useMemo(() => {
    return sessionsByDate.get(selectedDateKey) || [];
  }, [sessionsByDate, selectedDateKey]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateKey(formatDateKey(now));
  };

  const toggleExpand = (sessionId: string) => {
    setExpandedSessionIds(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    await deleteSession(sessionToDelete.id);
    setSessionToDelete(null);
  };

  const formatSelectedDateHeading = useMemo(() => {
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('default', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [selectedDateKey]);

  return (
    <div className="flex flex-col w-full px-4 pt-20 pb-28 max-w-xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex flex-col">
          <h1 className="font-bold text-2xl text-app-primary tracking-tight">
            {t.calendar}
          </h1>
          <span className="text-xs text-app-muted">
            Workouts, log history &amp; schedule
          </span>
        </div>
        <button
          type="button"
          onClick={handleJumpToToday}
          className="px-3 py-1.5 rounded-lg bg-app-surface border border-app text-xs font-bold text-app-accent hover:border-app-accent/60 transition-all flex items-center gap-1.5"
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          Today
        </button>
      </div>

      {/* Streak & XP Metric Card */}
      <section className="p-3.5 rounded-xl bg-app-surface border border-app flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-surface-2 border border-app flex items-center justify-center text-app-accent">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted">
              Active Streak
            </span>
            <span className="text-base font-bold text-app-primary tabular-nums">
              {streak.currentStreak} {t.days} {streak.onFire && '🔥'}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted">
            Tier: {xp.rankTitle}
          </span>
          <span className="text-sm font-bold text-app-accent tabular-nums">
            Level {xp.level} · {xp.totalXP} XP
          </span>
        </div>
      </section>

      {/* Discipline Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setDisciplineFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
            disciplineFilter === 'all'
              ? 'bg-app-accent text-on-accent border-app-accent'
              : 'bg-app-surface border-app text-app-muted hover:text-app-primary'
          }`}
        >
          {t.all} ({sessions.length})
        </button>
        {(['gym', 'calisthenics', 'martial_arts', 'cardio'] as ExerciseCategory[]).map(cat => {
          const cfg = DISCIPLINE_CONFIG[cat];
          const count = sessions.filter(s => getSessionDominantCategory(s, exercisesMap) === cat).length;
          const isActive = disciplineFilter === cat;

          return (
            <button
              key={cat}
              type="button"
              onClick={() => setDisciplineFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                isActive
                  ? 'border-transparent'
                  : 'bg-app-surface border-app text-app-muted hover:text-app-primary'
              }`}
              style={
                isActive
                  ? { backgroundColor: cfg.color, color: '#090d16' }
                  : undefined
              }
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cfg.color }}
              />
              {DISCIPLINE_LABELS[cat]} ({count})
            </button>
          );
        })}
      </div>

      {/* Month Calendar Grid Card */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-3">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-app-accent" />
            <h2 className="text-base font-bold text-app-primary">{monthName}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-app-surface-2 border border-app text-app-muted hover:text-app-primary transition-colors"
              aria-label={t.prevMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-app-surface-2 border border-app text-app-muted hover:text-app-primary transition-colors"
              aria-label={t.nextMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-app-muted uppercase py-1">
          {([t.dayMon, t.dayTue, t.dayWed, t.dayThu, t.dayFri, t.daySat, t.daySun]).map(d => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {/* Calendar Grid Cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((cell) => {
            const isSelected = cell.dateKey === selectedDateKey;
            const daySessions = allSessionsByDate.get(cell.dateKey) || [];
            const hasSessions = daySessions.length > 0;
            const disciplines = hasSessions ? getDayDisciplines(daySessions, exercisesMap) : [];

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDateKey(cell.dateKey)}
                className={`min-h-12 rounded-xl flex flex-col items-center justify-between p-1.5 text-xs font-semibold border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-app-accent bg-app-accent/15 text-app-accent font-bold ring-2 ring-app-accent/50'
                    : cell.isToday
                    ? 'border-app-accent/60 bg-app-surface-2 text-app-primary font-bold'
                    : hasSessions
                    ? 'bg-app-surface-2 border-app text-app-primary hover:border-app-muted/60'
                    : cell.isCurrentMonth
                    ? 'bg-app-surface-2/60 border-app/60 text-app-muted/80 hover:bg-app-surface-2'
                    : 'bg-app-surface-2/20 border-transparent text-app-muted/30'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[11px] tabular-nums ${cell.isToday ? 'text-app-accent font-extrabold' : ''}`}>
                    {cell.dayNumber}
                  </span>
                  {cell.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-app-accent" />
                  )}
                </div>

                {/* Heat Dots for Completed Disciplines */}
                <div className="flex items-center gap-0.5 justify-center mt-auto">
                  {disciplines.slice(0, 3).map(cat => (
                    <span
                      key={cat}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: DISCIPLINE_CONFIG[cat]?.color || '#38bdf8' }}
                    />
                  ))}
                  {disciplines.length > 3 && (
                    <span className="w-1 h-1 rounded-full bg-app-muted" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between pt-2 border-t border-app text-[11px] text-app-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
              Gym
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              Calisthenics
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              Martial Arts
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              Cardio
            </span>
          </div>
        </div>
      </section>

      {/* Selected Day's Logged Workouts Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-app-muted">
              {t.workoutsFor}
            </span>
            <h3 className="text-base font-bold text-app-primary">
              {formatSelectedDateHeading}
            </h3>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-app-surface border border-app text-xs font-bold text-app-muted">
            {selectedDaySessions.length} {selectedDaySessions.length === 1 ? t.sessionSingular : t.sessionPlural}
          </span>
        </div>

        {selectedDaySessions.length === 0 ? (
          <div className="p-8 rounded-xl bg-app-surface border border-app flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-app-surface-2 border border-app flex items-center justify-center text-app-muted">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-app-primary">{t.noWorkoutsOnDate}</span>
              <span className="text-xs text-app-muted max-w-xs mt-0.5">
                {t.restDayDesc}
              </span>
            </div>
            <button
              type="button"
              onClick={() => startWorkout()}
              className="mt-2 px-4 py-2 rounded-xl bg-app-accent text-on-accent text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity border border-app-accent"
            >
              <Plus className="w-4 h-4" />
              {t.startNewWorkout}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {selectedDaySessions.map(session => {
              const isExpanded = expandedSessionIds.has(session.id);
              const dominantCat = getSessionDominantCategory(session, exercisesMap);
              const badgeCfg = DISCIPLINE_CONFIG[dominantCat];

              // Calculate session statistics
              let totalVolumeKg = 0;
              let completedSetsCount = 0;
              const exerciseSetMap = new Map<string, { exercise: Exercise; sets: typeof session.sets }>();

              for (const set of session.sets) {
                if (set.done) {
                  completedSetsCount++;
                  const load = set.loadKg || 0;
                  const reps = set.reps || 0;
                  if (load > 0 && reps > 0) totalVolumeKg += load * reps;
                }
                const ex = exercisesMap.get(set.exerciseId);
                if (ex) {
                  const entry = exerciseSetMap.get(ex.id) || { exercise: ex, sets: [] };
                  entry.sets.push(set);
                  exerciseSetMap.set(ex.id, entry);
                }
              }

              // Calculate session duration
              let durationMin = 0;
              if (session.startedAt && session.endedAt) {
                const start = new Date(session.startedAt).getTime();
                const end = new Date(session.endedAt).getTime();
                durationMin = Math.round(Math.max(0, end - start - (session.pausedMs || 0)) / 60000);
              }

              const timeStr = session.startedAt
                ? new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={session.id}
                  className="rounded-xl bg-app-surface border border-app overflow-hidden transition-all"
                >
                  {/* Card Header */}
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                            style={{
                              backgroundColor: badgeCfg.bg,
                              color: badgeCfg.color,
                              borderColor: badgeCfg.border
                            }}
                          >
                            {DISCIPLINE_LABELS[dominantCat]}
                          </span>
                          {session.effort && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-app-surface-2 border border-app text-app-muted">
                              {t.setRPE} {session.effort}
                            </span>
                          )}
                          <span className="text-[11px] text-app-muted tabular-nums">
                            {timeStr}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-app-primary mt-1">
                          {session.collectionName || t.customLiveWorkout}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => repeatSession(session)}
                          title={t.repeatSession}
                          className="px-2.5 py-1.5 rounded-lg bg-app-surface-2 border border-app text-xs font-bold text-app-accent hover:border-app-accent/60 flex items-center gap-1 transition-all"
                        >
                          <Repeat className="w-3.5 h-3.5" />
                          <span>{t.repeatSession}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSessionToDelete(session)}
                          title={t.deleteSession}
                          className="p-1.5 rounded-lg bg-app-surface-2 border border-app text-app-muted hover:text-red-400 hover:border-red-500/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stats Tiles */}
                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-app">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted">{t.duration}</span>
                        <span className="text-xs font-bold text-app-primary tabular-nums mt-0.5">
                          {durationMin}m
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted">{t.volume}</span>
                        <span className="text-xs font-bold text-app-primary tabular-nums mt-0.5">
                          {totalVolumeKg > 0 ? `${totalVolumeKg.toLocaleString()}kg` : '—'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted">{t.completed}</span>
                        <span className="text-xs font-bold text-app-primary tabular-nums mt-0.5">
                          {completedSetsCount} {t.sets}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted">XP</span>
                        <span className="text-xs font-bold text-app-accent tabular-nums mt-0.5">
                          +{session.xpGained || 50}
                        </span>
                      </div>
                    </div>

                    {/* Optional Notes */}
                    {session.notes && (
                      <p className="text-xs text-app-muted italic bg-app-surface-2 p-2 rounded-lg border border-app">
                        &quot;{session.notes}&quot;
                      </p>
                    )}

                    {/* Expand/Collapse Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(session.id)}
                      className="flex items-center justify-between text-xs font-bold text-app-accent hover:text-app-accent/80 pt-1"
                    >
                      <span>
                        {isExpanded ? t.hideExerciseDetails : t.showExercises.replace('{count}', String(exerciseSetMap.size))}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-app bg-app-surface-2/40 space-y-3">
                      {Array.from(exerciseSetMap.values()).map(({ exercise, sets }) => (
                        <div key={exercise.id} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-app-primary">
                              {exercise.name}
                            </span>
                            <span className="text-[10px] text-app-muted tabular-nums">
                              {sets.filter(s => s.done).length}/{sets.length} {t.done.toLowerCase()}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {sets.map((set, setIdx) => {
                              let label = '';
                              if (set.loadKg !== undefined && set.reps !== undefined) {
                                label = `${set.loadKg}kg × ${set.reps}`;
                              } else if (set.reps !== undefined) {
                                label = `${set.reps} reps`;
                              } else if (set.durationSec !== undefined) {
                                label = `${set.durationSec}s`;
                              } else if (set.rounds !== undefined) {
                                label = `${set.rounds} rnd`;
                              }

                              return (
                                <span
                                  key={set.id || setIdx}
                                  className={`px-2 py-0.5 rounded text-[11px] tabular-nums border ${
                                    set.done
                                      ? 'bg-app-surface border-app text-app-primary'
                                      : 'bg-app-surface/40 border-transparent text-app-muted/60 line-through'
                                  }`}
                                >
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Schedules Summary */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
            {t.scheduledRoutines}
          </span>
          <span className="text-xs font-semibold text-app-accent tabular-nums">
            {schedules.length} {t.active.toLowerCase()}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {schedules.map((sc) => {
            const col = collections.find(c => c.id === sc.collectionId);
            const dayNames = [t.dayMon, t.dayTue, t.dayWed, t.dayThu, t.dayFri, t.daySat, t.daySun];
            const activeDays = sc.days.map(d => dayNames[d]).join(', ');

            return (
              <div
                key={sc.id}
                className="p-3 rounded-lg bg-app-surface-2 border border-app flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-app-accent" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-app-primary">
                      {col ? col.name : t.customLiveWorkout}
                    </span>
                    <span className="text-xs text-app-muted">
                      {activeDays} · {sc.time}
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded bg-app-surface border border-app text-[11px] font-bold text-app-accent">
                  {t.active}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-sm rounded-2xl bg-app-surface border border-app p-5 space-y-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-app-primary">{t.deleteSessionTitle}</h3>
              <p className="text-xs text-app-muted leading-relaxed">
                {t.deleteSessionDesc}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 rounded-xl bg-app-surface-2 border border-app text-xs font-bold text-app-muted hover:text-app-primary transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors border border-red-500"
              >
                {t.deleteSession}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
