import React, { useState } from 'react';
import { Zap, Calendar, Bell, ArrowRight, Check } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { NotificationService } from '../services/notification.ts';
import { HapticsService } from '../services/haptics.ts';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { settings, updateSettings, t } = useApp();
  const [slide, setSlide] = useState<number>(0);
  const [name, setName] = useState<string>(settings.profileName || '');
  const [goalDays, setGoalDays] = useState<number>(settings.weeklyGoalDays || 4);
  const [notifGranted, setNotifGranted] = useState<boolean>(false);

  const finishOnboarding = async () => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        await navigator.storage.persist();
      } catch {
        // Storage persistence may not be supported or prompt user
      }
    }
    await updateSettings({ hasCompletedOnboarding: true });
    onComplete();
  };

  const handleNext = async () => {
    HapticsService.light();
    if (slide === 0) {
      await updateSettings({ profileName: name.trim() });
      setSlide(1);
    } else if (slide === 1) {
      await updateSettings({ weeklyGoalDays: goalDays });
      setSlide(2);
    } else {
      await finishOnboarding();
    }
  };

  const handleRequestNotifications = async () => {
    HapticsService.medium();
    const granted = await NotificationService.requestPermissionWithExplainer();
    setNotifGranted(granted);
    await updateSettings({ notificationsEnabled: granted });
  };

  return (
    <div className="fixed inset-0 z-50 bg-app-bg text-app-primary flex flex-col justify-between p-6 pb-safe pt-safe select-none">
      {/* Top Progress Indicator */}
      <div className="w-full flex items-center justify-between gap-2 max-w-sm mx-auto pt-2">
        <div className="flex items-center gap-1.5 flex-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= slide ? 'bg-app-accent' : 'bg-app-surface-2'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={finishOnboarding}
          className="text-xs font-semibold uppercase tracking-wider text-app-muted hover:text-app-primary px-2 py-1"
        >
          {t.skip}
        </button>
      </div>

      {/* Main Slide Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full my-auto text-center py-6">
        {slide === 0 && (
          <div className="flex flex-col items-center w-full">
            <div className="w-16 h-16 rounded-2xl bg-app-surface border border-app flex items-center justify-center text-app-accent mb-6">
              <Zap className="w-8 h-8 fill-current text-app-accent" />
            </div>
            <h1 className="font-bold text-2xl text-app-primary tracking-tight">
              {t.onboardingTitle1}
            </h1>
            <p className="text-sm text-app-muted mt-2 leading-relaxed">
              {t.onboardingDesc1}
            </p>

            <div className="w-full mt-8 text-start">
              <label 
                htmlFor="onboarding-name" 
                className="block text-xs font-bold uppercase tracking-wider text-app-muted mb-2"
              >
                {t.profileName} <span className="opacity-60">{t.optional}</span>
              </label>
              <input
                id="onboarding-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.onboardingNamePlaceholder}
                className="w-full h-12 rounded-xl bg-app-surface border border-app px-4 text-base text-app-primary placeholder:text-app-muted/60 focus:outline-none focus:border-app-accent transition-colors"
              />
            </div>
          </div>
        )}

        {slide === 1 && (
          <div className="flex flex-col items-center w-full">
            <div className="w-16 h-16 rounded-2xl bg-app-surface border border-app flex items-center justify-center text-app-accent mb-6">
              <Calendar className="w-8 h-8 text-app-accent" />
            </div>
            <h1 className="font-bold text-2xl text-app-primary tracking-tight">
              {t.onboardingTitle2}
            </h1>
            <p className="text-sm text-app-muted mt-2 leading-relaxed">
              {t.onboardingDesc2}
            </p>

            {/* Target Days Selector */}
            <div className="w-full mt-8 flex flex-col items-center">
              <div className="text-4xl font-extrabold text-app-accent tabular-nums mb-4">
                {goalDays} <span className="text-lg font-normal text-app-muted">{t.days} {t.perWeek}</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 w-full">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      HapticsService.light();
                      setGoalDays(num);
                    }}
                    className={`h-12 rounded-xl font-bold text-sm border flex items-center justify-center transition-all ${
                      goalDays === num
                        ? 'bg-app-accent text-on-accent border-app-accent'
                        : 'bg-app-surface border-app text-app-primary hover:border-app-accent/50'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {slide === 2 && (
          <div className="flex flex-col items-center w-full">
            <div className="w-16 h-16 rounded-2xl bg-app-surface border border-app flex items-center justify-center text-app-accent mb-6">
              <Bell className="w-8 h-8 text-app-accent" />
            </div>
            <h1 className="font-bold text-2xl text-app-primary tracking-tight">
              {t.onboardingTitle3}
            </h1>
            <p className="text-sm text-app-muted mt-2 leading-relaxed">
              {t.onboardingDesc3}
            </p>

            <div className="w-full mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleRequestNotifications}
                className={`w-full h-12 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  notifGranted
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                    : 'bg-app-surface-2 border-app text-app-primary hover:border-app-accent'
                }`}
              >
                {notifGranted ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{t.permissionEnabled}</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 text-app-accent" />
                    <span>{t.enableLocalReminders}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action */}
      <div className="w-full max-w-sm mx-auto">
        <button
          type="button"
          onClick={handleNext}
          className="w-full h-12 rounded-xl bg-app-accent text-on-accent font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <span>{slide === 2 ? t.getStarted : t.next}</span>
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
};
