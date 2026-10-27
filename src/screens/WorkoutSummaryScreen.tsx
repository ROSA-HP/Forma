import React, { useState } from 'react';
import { 
  Trophy, 
  Clock, 
  Flame, 
  Dumbbell, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles, 
  Star,
  MapPin,
  Share2,
  Home
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { Session, PRRecord, Region } from '../types/index.ts';
import { calculateSessionSummary, formatDuration } from '../domain/sessionCalculations.ts';
import { kgToLb } from '../domain/calculations.ts';
import { ShareService } from '../services/share.ts';

interface WorkoutSummaryScreenProps {
  session: Session;
  onDone: () => void;
}

export const WorkoutSummaryScreen: React.FC<WorkoutSummaryScreenProps> = ({
  session,
  onDone
}) => {
  const { exercises, sessions, settings, locations, saveSession, t } = useApp();

  const [sessionRpe, setSessionRpe] = useState<number>(session.effort || 8);
  const [notes, setNotes] = useState<string>(session.notes || '');
  const [locationId, setLocationId] = useState<string | undefined>(session.locationId);
  const [isCopied, setIsCopied] = useState(false);

  const isLb = settings.weightUnit === 'lb';

  // Calculate comprehensive metrics
  const summary = calculateSessionSummary(
    session,
    exercises,
    settings.userBodyweightKg,
    sessions
  );

  const tonnageDisplay = isLb 
    ? `${kgToLb(summary.tonnageKg).toLocaleString(undefined, { maximumFractionDigits: 0 })} lb`
    : `${summary.tonnageKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`;

  const handleSaveAndExit = async () => {
    const updated: Session = {
      ...session,
      effort: sessionRpe,
      notes,
      locationId
    };
    await saveSession(updated);
    onDone();
  };

  const handleShare = async () => {
    const shareText = `🏋️‍♂️ ${t.shareWorkoutCompleted}: ${session.collectionName || t.shareTrainingSession}\n⏱ ${t.duration}: ${summary.durationFormatted}\n🔥 ${t.volume}: ${tonnageDisplay}\n💪 ${t.sets}: ${summary.completedSets}/${summary.totalSets}\n⚡ ${t.shareXP}: +${summary.xpEarned} XP\n${t.shareTracked}`;
    const ok = await ShareService.shareText(t.shareTitle, shareText);
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const getRpeDescription = (val: number) => {
    if (val <= 6) return t.rpeLight;
    if (val <= 7.5) return t.rpeModerate;
    if (val <= 8.5) return t.rpeHard;
    if (val <= 9.5) return t.rpeVeryHard;
    return t.rpeMax;
  };

  // Region breakdown
  const regions: { id: Region; label: string; color: string }[] = [
    { id: 'chest', label: t.region_chest, color: 'bg-blue-500' },
    { id: 'back', label: t.region_back, color: 'bg-emerald-500' },
    { id: 'legs', label: t.region_legs, color: 'bg-amber-500' },
    { id: 'delts', label: t.region_delts, color: 'bg-purple-500' },
    { id: 'arms', label: t.region_arms, color: 'bg-cyan-500' },
    { id: 'core', label: t.region_core, color: 'bg-rose-500' }
  ];

  return (
    <div className="min-h-dvh bg-app-bg text-app-primary flex flex-col antialiased pb-24">
      {/* Celebration Header */}
      <div className="relative w-full bg-gradient-to-b from-emerald-500/15 via-app-surface to-app-bg border-b border-app p-6 flex flex-col items-center text-center overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-black flex items-center justify-center mb-3 animate-bounce">
          <Trophy className="w-8 h-8 fill-current" />
        </div>

        <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[11px] uppercase tracking-wider mb-1">
          {t.workoutFinished}
        </span>

        <h1 className="text-2xl font-black text-app-primary tracking-tight">
          {session.collectionName || t.trainingSessionComplete}
        </h1>

        <p className="text-xs text-app-muted mt-1">
          {new Date(session.startedAt).toLocaleDateString(undefined, { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
          })}
        </p>

        {/* XP Gained Banner */}
        <div className="mt-4 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center gap-1.5 text-amber-400 font-extrabold text-xs">
          <Star className="w-4 h-4 fill-current" />
          <span>{t.xpEarnedBanner.replace('{count}', String(summary.xpEarned))}</span>
        </div>
      </div>

      <main className="w-full max-w-2xl mx-auto p-3.5 space-y-4">
        {/* Core Metric Quad Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Duration */}
          <div className="p-3.5 rounded-xl bg-app-surface border border-app flex flex-col">
            <span className="text-[10px] font-bold text-app-muted uppercase flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{t.duration}</span>
            </span>
            <span className="text-xl font-black text-app-primary tabular-nums mt-1">
              {summary.durationFormatted}
            </span>
          </div>

          {/* Working Volume */}
          <div className="p-3.5 rounded-xl bg-app-surface border border-app flex flex-col">
            <span className="text-[10px] font-bold text-app-muted uppercase flex items-center gap-1">
              <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.volume}</span>
            </span>
            <span className="text-xl font-black text-app-primary tabular-nums mt-1 truncate">
              {tonnageDisplay}
            </span>
          </div>

          {/* Completed Sets */}
          <div className="p-3.5 rounded-xl bg-app-surface border border-app flex flex-col">
            <span className="text-[10px] font-bold text-app-muted uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.setsDone}</span>
            </span>
            <span className="text-xl font-black text-app-primary tabular-nums mt-1">
              {summary.completedSets}/{summary.totalSets}
            </span>
          </div>

          {/* Calories */}
          <div className="p-3.5 rounded-xl bg-app-surface border border-app flex flex-col">
            <span className="text-[10px] font-bold text-app-muted uppercase flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>{t.burned}</span>
            </span>
            <span className="text-xl font-black text-app-primary tabular-nums mt-1">
              ~{summary.estimatedCalories} kcal
            </span>
          </div>
        </div>

        {/* PR Milestones achieved section */}
        {summary.prsAchieved.length > 0 && (
          <section className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-black text-amber-400 uppercase tracking-wider">
                {t.prsShattered.replace('{count}', String(summary.prsAchieved.length))}
              </h2>
            </div>

            <div className="space-y-2">
              {summary.prsAchieved.map((pr, idx) => {
                const ex = exercises.find(e => e.id === pr.exerciseId);
                return (
                  <div 
                    key={idx}
                    className="p-3 rounded-xl bg-app-surface border border-amber-500/20 flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-app-primary">
                        {ex?.name || t.movementFallback}
                      </span>
                      <span className="text-[10px] text-app-muted uppercase font-semibold">
                        {pr.prType.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-sm tabular-nums">
                      <TrendingUp className="w-4 h-4" />
                      <span>{pr.newValue} {pr.prType === 'weight' || pr.prType === 'est_1rm' ? settings.weightUnit : ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Regional Muscle Load Distribution */}
        <section className="p-4 rounded-2xl bg-app-surface border border-app space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-muted">
            {t.targetMuscleDistribution}
          </h2>
          <div className="space-y-2">
            {regions.map(reg => {
              const pct = summary.regionDistribution[reg.id]?.pct || 0;
              return (
                <div key={reg.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-app-primary font-medium">{reg.label}</span>
                    <span className="text-app-muted tabular-nums">{pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-app-surface-2 overflow-hidden">
                    <div 
                      className={`h-full ${reg.color} transition-all duration-700 rounded-full`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Session RPE / Effort Selector */}
        <section className="p-4 rounded-2xl bg-app-surface border border-app space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-app-muted">
              {t.rateSessionExertion}
            </label>
            <span className="px-2 py-0.5 rounded font-black text-sm bg-app-surface-2 border border-app text-app-accent">
              {sessionRpe} / 10
            </span>
          </div>

          <p className="text-xs text-app-muted">
            {getRpeDescription(sessionRpe)}
          </p>

          <div className="flex items-center gap-1 justify-between pt-1">
            {[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setSessionRpe(val)}
                className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all ${
                  sessionRpe === val 
                    ? 'bg-app-accent text-on-accent font-black scale-105' 
                    : 'bg-app-surface-2 border border-app text-app-primary hover:border-app-accent/50'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </section>

        {/* Location & Notes */}
        <section className="p-4 rounded-2xl bg-app-surface border border-app space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-app-muted mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{t.location}</span>
            </label>
            <select
              value={locationId || ''}
              onChange={(e) => setLocationId(e.target.value || undefined)}
              className="w-full h-11 px-3 rounded-xl bg-app-surface-2 border border-app text-sm text-app-primary font-medium focus:border-app-accent focus:outline-none"
            >
              <option value="">{t.noLocationSpecified}</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-app-muted mb-1.5">
              {t.workoutReflections}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.summaryNotesPlaceholder}
              className="w-full p-3 rounded-xl bg-app-surface-2 border border-app text-sm text-app-primary placeholder:text-app-muted focus:border-app-accent focus:outline-none resize-none"
            />
          </div>
        </section>

        {/* Exit & Share Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleSaveAndExit}
            className="w-full h-13 rounded-2xl bg-app-accent hover:bg-app-accent/90 text-on-accent font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>{t.saveAndReturn}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="w-full h-11 rounded-xl bg-app-surface-2 border border-app hover:bg-app-surface text-app-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Share2 className="w-4 h-4" />
            <span>{isCopied ? t.copiedToClipboard : t.shareSummary}</span>
          </button>
        </div>
      </main>
    </div>
  );
};
