import React, { useState, useMemo, useEffect } from 'react';
import { 
  User, 
  Scale, 
  SunMoon, 
  Languages, 
  Bell, 
  Target, 
  Trophy, 
  Flame, 
  Dumbbell, 
  MapPin, 
  Sparkles, 
  Download, 
  FileSpreadsheet, 
  Upload, 
  Trash2, 
  Plus, 
  Check, 
  Clock,
  Volume2,
  Vibrate,
  Smartphone,
  Database,
  Layers,
  HelpCircle,
  Play,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { StorageService, StorageExportData } from '../services/storage.ts';
import { ShareService } from '../services/share.ts';
import { SoundService } from '../services/sound.ts';
import { HapticsService } from '../services/haptics.ts';
import { NotificationService } from '../services/notification.ts';
import { Dialog } from '../components/Dialog.tsx';
import { PWAInstallButton } from '../components/PWAInstallButton.tsx';
import { 
  calculatePlateBreakdown, 
  validateImportPayload, 
  calculateStorageStats 
} from '../domain/dataTransfer.ts';
import { AppTheme, AppLanguage, WeightUnit, PRCelebrationTiming } from '../types/index.ts';

export const SettingsScreen: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    sessions,
    exercises,
    collections,
    locations, 
    saveLocation, 
    deleteLocation, 
    resetAll, 
    t 
  } = useApp();

  const [nameInput, setNameInput] = useState(settings.profileName);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isPlaceDialogOpen, setIsPlaceDialogOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Storage persistence state
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null);

  // Notification permission state
  const [notifPermissionGranted, setNotifPermissionGranted] = useState(false);

  // Import confirmation state
  const [pendingImportData, setPendingImportData] = useState<StorageExportData | null>(null);
  const [importSummary, setImportSummary] = useState<{ sessionsCount: number; exercisesCount: number; collectionsCount: number } | null>(null);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);

  useEffect(() => {
    NotificationService.hasPermission().then(setNotifPermissionGranted);
  }, []);

  useEffect(() => {
    const checkPersistence = async () => {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
        try {
          const isPersisted = await navigator.storage.persisted();
          setStoragePersisted(isPersisted);
        } catch {
          setStoragePersisted(false);
        }
      }
    };
    checkPersistence();
  }, []);

  const handleRequestPersistence = async () => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const persisted = await navigator.storage.persist();
        setStoragePersisted(persisted);
        showToast(persisted ? t.toastPersistGranted : t.toastPersistDenied);
      } catch {
        showToast(t.toastPersistFailed);
      }
    }
  };

  const handleRequestNotifications = async () => {
    HapticsService.light();
    const granted = await NotificationService.requestPermissionWithExplainer();
    setNotifPermissionGranted(granted);
    await updateSettings({ notificationsEnabled: granted });
    showToast(granted ? t.toastNotifGranted : t.toastNotifDenied);
  };

  // Barbell plate calculator playground state
  const [barbellWeightKg, setBarbellWeightKg] = useState<number>(20);
  const [testWeightInput, setTestWeightInput] = useState<number>(100);

  const storageStats = useMemo(() => {
    return calculateStorageStats(sessions, exercises, collections);
  }, [sessions, exercises, collections]);

  const plateBreakdown = useMemo(() => {
    return calculatePlateBreakdown(testWeightInput, barbellWeightKg, settings.plateSetKg || [25, 20, 15, 10, 5, 2.5, 1.25]);
  }, [testWeightInput, barbellWeightKg, settings.plateSetKg]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleNameBlur = async () => {
    if (nameInput !== settings.profileName) {
      await updateSettings({ profileName: nameInput.trim() });
      showToast(t.toastProfileUpdated);
    }
  };

  const handleUnitToggle = async (unit: WeightUnit) => {
    HapticsService.light();
    await updateSettings({ weightUnit: unit });
  };

  const handleThemeChange = async (theme: AppTheme) => {
    HapticsService.light();
    await updateSettings({ theme });
  };

  const handleLanguageChange = async (language: AppLanguage) => {
    HapticsService.light();
    await updateSettings({ language });
  };

  const handleExportJSON = async () => {
    HapticsService.medium();
    const data = await StorageService.exportData();
    const jsonStr = JSON.stringify(data, null, 2);
    ShareService.downloadFile(
      `forma_backup_${new Date().toISOString().split('T')[0]}.json`,
      jsonStr,
      'application/json'
    );
    showToast(t.toastBackupDownloaded);
  };

  const handleExportCSV = async () => {
    HapticsService.medium();
    const csv = await StorageService.exportCSV();
    ShareService.downloadFile(
      `forma_workouts_${new Date().toISOString().split('T')[0]}.csv`,
      csv,
      'text/csv'
    );
    showToast(t.toastCsvDownloaded);
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      // 1. Fully validate schema and types BEFORE touching any data
      const validation = validateImportPayload(parsed);
      if (!validation.valid) {
        showToast(validation.error || t.toastInvalidBackup);
        e.target.value = '';
        return;
      }

      // 2. Download a safety backup of current data first
      HapticsService.medium();
      const currentBackup = await StorageService.exportData();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      ShareService.downloadFile(
        `forma_pre_import_backup_${timestamp}.json`,
        JSON.stringify(currentBackup, null, 2),
        'application/json'
      );

      // 3. Store pending data and open confirmation dialog
      setPendingImportData(parsed);
      setImportSummary(validation.summary || null);
      setIsImportConfirmOpen(true);
      showToast(t.toastSafetyBackup);
    } catch {
      showToast(t.toastReadError);
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImportData) return;
    try {
      HapticsService.warning();
      await StorageService.importData(pendingImportData);
      setIsImportConfirmOpen(false);
      showToast(t.toastRestoredSessions.replace('{count}', String(importSummary?.sessionsCount || 0)));
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      showToast(err?.message || t.toastImportFailed);
    }
  };

  const handleAddPlace = async () => {
    if (!newPlaceName.trim()) return;
    HapticsService.light();
    await saveLocation({
      id: crypto.randomUUID(),
      name: newPlaceName.trim()
    });
    setNewPlaceName('');
    setIsPlaceDialogOpen(false);
    showToast(t.toastLocationSaved);
  };

  const handleResetData = async () => {
    HapticsService.warning();
    await resetAll();
    setIsResetDialogOpen(false);
    showToast(t.toastRecordsReset);
  };

  const togglePlateInInventory = async (plate: number) => {
    const current = settings.plateSetKg || [25, 20, 15, 10, 5, 2.5, 1.25];
    let updated: number[];
    if (current.includes(plate)) {
      if (current.length <= 1) return;
      updated = current.filter(p => p !== plate);
    } else {
      updated = [...current, plate].sort((a, b) => b - a);
    }
    await updateSettings({ plateSetKg: updated });
  };

  const handleTestAudio = () => {
    SoundService.playCountdownWarningBeep();
    setTimeout(() => SoundService.playPRCelebrationFanfare(), 300);
    HapticsService.success();
    showToast(t.toastCueTest);
  };

  return (
    <div className="flex flex-col w-full px-4 pt-20 pb-28 max-w-xl mx-auto space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-app-surface-2 border border-app text-app-accent font-semibold text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-app-accent" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex flex-col">
          <h1 className="font-bold text-2xl text-app-primary tracking-tight">
            {t.settings}
          </h1>
          <span className="text-xs text-app-muted">
            {t.settingsSubtitle}
          </span>
        </div>
      </div>

      {/* 0. PWA Installation Card */}
      <section className="p-4 rounded-xl bg-gradient-to-br from-app-surface to-app-surface-2 border border-app space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-app-accent" />
              <h2 className="text-sm font-bold text-app-primary">
                {t.installPWA}
              </h2>
            </div>
            <p className="text-xs text-app-muted mt-1 leading-relaxed">
              {t.installPWADesc}
            </p>
          </div>
        </div>

        <div className="pt-1">
          <PWAInstallButton />
        </div>
      </section>

      {/* 1. Profile Card */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-3">
        <div className="flex items-center gap-2 text-app-accent text-xs font-bold uppercase tracking-wider">
          <User className="w-4 h-4" />
          <span>{t.profile}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="settings-name" className="text-xs font-semibold text-app-muted">
            {t.profileName}
          </label>
          <input
            id="settings-name"
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleNameBlur}
            placeholder={t.athleteNamePlaceholder}
            className="w-full h-12 rounded-xl bg-app-surface-2 border border-app px-4 text-sm text-app-primary placeholder:text-app-muted/50 focus:outline-none focus:border-app-accent transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5 pt-1">
          <label htmlFor="settings-bw" className="text-xs font-semibold text-app-muted">
            {t.userBodyweight}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="settings-bw"
              type="number"
              value={settings.userBodyweightKg}
              onChange={(e) => updateSettings({ userBodyweightKg: Number(e.target.value) || 75 })}
              className="w-32 h-12 rounded-xl bg-app-surface-2 border border-app px-4 text-sm text-app-primary tabular-nums focus:outline-none focus:border-app-accent transition-colors"
            />
            <span className="text-sm font-semibold text-app-muted">kg</span>
          </div>
        </div>
      </section>

      {/* 2. Units & Themes */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-4">
        {/* Weight Unit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-app-muted" />
            <span className="text-sm font-semibold text-app-primary">{t.weightUnit}</span>
          </div>
          <div className="grid grid-cols-2 p-1 bg-app-surface-2 border border-app rounded-lg w-32">
            <button
              type="button"
              onClick={() => handleUnitToggle('kg')}
              className={`h-8 rounded text-xs font-bold transition-all ${
                settings.weightUnit === 'kg'
                  ? 'bg-app-accent text-on-accent'
                  : 'text-app-muted hover:text-app-primary'
              }`}
            >
              KG
            </button>
            <button
              type="button"
              onClick={() => handleUnitToggle('lb')}
              className={`h-8 rounded text-xs font-bold transition-all ${
                settings.weightUnit === 'lb'
                  ? 'bg-app-accent text-on-accent'
                  : 'text-app-muted hover:text-app-primary'
              }`}
            >
              LB
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between pt-2 border-t border-app">
          <div className="flex items-center gap-2">
            <SunMoon className="w-4 h-4 text-app-muted" />
            <span className="text-sm font-semibold text-app-primary">{t.theme}</span>
          </div>
          <div className="grid grid-cols-3 p-1 bg-app-surface-2 border border-app rounded-lg">
            {(['system', 'dark', 'light'] as AppTheme[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleThemeChange(m)}
                className={`h-8 px-2.5 rounded text-xs font-bold capitalize transition-all ${
                  settings.theme === m
                    ? 'bg-app-accent text-on-accent'
                    : 'text-app-muted hover:text-app-primary'
                }`}
              >
                {m === 'system' ? t.themeSystem : m === 'dark' ? t.themeDark : t.themeLight}
              </button>
            ))}
          </div>
        </div>

        {/* Language (EN / AR) */}
        <div className="flex items-center justify-between pt-2 border-t border-app">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-app-muted" />
            <span className="text-sm font-semibold text-app-primary">{t.language}</span>
          </div>
          <div className="grid grid-cols-2 p-1 bg-app-surface-2 border border-app rounded-lg w-36">
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={`h-8 rounded text-xs font-bold transition-all ${
                settings.language === 'en'
                  ? 'bg-app-accent text-on-accent'
                  : 'text-app-muted hover:text-app-primary'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('ar')}
              className={`h-8 rounded text-xs font-bold transition-all ${
                settings.language === 'ar'
                  ? 'bg-app-accent text-on-accent'
                  : 'text-app-muted hover:text-app-primary'
              }`}
            >
              العربية
            </button>
          </div>
        </div>
      </section>

      {/* 3. Barbell Plate Calculator & Loading Inventory */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-app-accent text-xs font-bold uppercase tracking-wider">
              <Dumbbell className="w-4 h-4" />
              <span>{t.plateCalculator}</span>
            </div>
            <span className="text-xs text-app-muted mt-0.5">
              {t.calibratePlates}
            </span>
          </div>
        </div>

        {/* Bar Weight Selector */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-semibold text-app-primary">{t.barbellWeight}</span>
          <div className="flex items-center gap-1.5">
            {[20, 15, 10].map((bw) => (
              <button
                key={bw}
                type="button"
                onClick={() => setBarbellWeightKg(bw)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  barbellWeightKg === bw
                    ? 'bg-app-accent text-on-accent border-app-accent'
                    : 'bg-app-surface-2 border-app text-app-muted hover:text-app-primary'
                }`}
              >
                {bw}kg
              </button>
            ))}
          </div>
        </div>

        {/* Available Plates Inventory Toggles */}
        <div className="space-y-1.5 pt-2 border-t border-app">
          <span className="text-xs font-semibold text-app-muted">{t.availablePlates}</span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[25, 20, 15, 10, 5, 2.5, 1.25].map((p) => {
              const active = (settings.plateSetKg || [25, 20, 15, 10, 5, 2.5, 1.25]).includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlateInInventory(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                    active
                      ? 'bg-app-accent/20 border-app-accent text-app-accent'
                      : 'bg-app-surface-2 border-app text-app-muted/50'
                  }`}
                >
                  {p}kg
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Loading Visualizer */}
        <div className="p-3.5 rounded-xl bg-app-surface-2 border border-app space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
              {t.loadTestCalculator}
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={testWeightInput}
                step={2.5}
                onChange={(e) => setTestWeightInput(Math.max(barbellWeightKg, Number(e.target.value) || barbellWeightKg))}
                className="w-20 h-8 rounded-lg bg-app-surface border border-app px-2 text-center text-xs font-bold text-app-primary tabular-nums focus:outline-none focus:border-app-accent"
              />
              <span className="text-xs font-semibold text-app-muted">kg</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1 border-t border-app">
            <div className="flex items-center justify-between text-xs">
              <span className="text-app-muted">{t.platesPerSide}</span>
              <span className="font-bold text-app-primary tabular-nums">
                {plateBreakdown.platesPerSide.length > 0
                  ? plateBreakdown.platesPerSide.map(p => `${p}kg`).join(' + ')
                  : t.barOnly}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-app-muted">{t.totalLoaded}</span>
              <span className="font-bold text-app-accent tabular-nums">
                {plateBreakdown.totalLoadedKg}kg ({plateBreakdown.weightPerSideKg}kg {t.perSide})
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Audio, Haptics & Feedback */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-app-accent text-xs font-bold uppercase tracking-wider">
            <Volume2 className="w-4 h-4" />
            <span>{t.audioCues}</span>
          </div>

          <button
            type="button"
            onClick={handleTestAudio}
            className="px-2.5 py-1 rounded-lg bg-app-surface-2 border border-app text-xs font-semibold text-app-accent hover:border-app-accent/60 flex items-center gap-1.5 transition-all"
          >
            <Play className="w-3 h-3 fill-current" />
            {t.testCues}
          </button>
        </div>

        {/* PR celebration timing */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-app-accent" />
            <span className="text-sm font-semibold text-app-primary">{t.prTiming}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 p-1 bg-app-surface-2 border border-app rounded-lg">
            {(
              [
                { id: 'instantly', label: t.prShortInstantly },
                { id: 'after_exercise', label: t.prShortAfterEx },
                { id: 'at_finish', label: t.prShortAtFinish }
              ] as { id: PRCelebrationTiming; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => updateSettings({ prCelebrationTiming: item.id })}
                className={`h-9 rounded text-xs font-bold transition-all ${
                  settings.prCelebrationTiming === item.id
                    ? 'bg-app-accent text-on-accent'
                    : 'text-app-muted hover:text-app-primary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reduce animations */}
        <div className="flex items-center justify-between pt-2 border-t border-app">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-app-muted" />
            <span className="text-sm font-semibold text-app-primary">{t.reduceMotion}</span>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ reduceAnimations: !settings.reduceAnimations })}
            className={`w-12 h-7 rounded-full transition-colors relative p-1 ${
              settings.reduceAnimations ? 'bg-app-accent' : 'bg-app-surface-2 border border-app'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full transition-transform ${
                settings.reduceAnimations
                  ? 'translate-x-5 bg-on-accent'
                  : 'translate-x-0 bg-app-muted'
              }`}
            />
          </button>
        </div>
      </section>

      {/* 5. Training Frequency & Target Benchmarks */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-4">
        {/* Weekly frequency goal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-app-accent" />
            <span className="text-sm font-semibold text-app-primary">{t.weeklyGoal}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[2, 3, 4, 5, 6].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => updateSettings({ weeklyGoalDays: days })}
                className={`w-9 h-9 rounded-lg font-bold text-xs border transition-all ${
                  settings.weeklyGoalDays === days
                    ? 'bg-app-accent text-on-accent border-app-accent'
                    : 'bg-app-surface-2 border-app text-app-muted hover:text-app-primary'
                }`}
              >
                {days}
              </button>
            ))}
          </div>
        </div>

        {/* Target sets per muscle per week */}
        <div className="flex items-center justify-between pt-2 border-t border-app">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-app-primary">{t.weeklySetsTarget}</span>
            <span className="text-xs text-app-muted">{t.baselineBenchmark}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateSettings({ weeklySetsTargetPerMuscle: Math.max(8, settings.weeklySetsTargetPerMuscle - 1) })}
              className="w-9 h-9 rounded-lg bg-app-surface-2 border border-app text-app-primary font-bold hover:bg-app-surface"
            >
              -
            </button>
            <span className="text-base font-bold text-app-primary tabular-nums w-8 text-center">
              {settings.weeklySetsTargetPerMuscle}
            </span>
            <button
              type="button"
              onClick={() => updateSettings({ weeklySetsTargetPerMuscle: Math.min(26, settings.weeklySetsTargetPerMuscle + 1) })}
              className="w-9 h-9 rounded-lg bg-app-surface-2 border border-app text-app-primary font-bold hover:bg-app-surface"
            >
              +
            </button>
          </div>
        </div>
      </section>

      {/* 5B. Workout Reminders & Notifications */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-app-accent text-xs font-bold uppercase tracking-wider">
            <Bell className="w-4 h-4" />
            <span>{t.remindersNotifications}</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
            notifPermissionGranted
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-app-surface-2 text-app-muted border-app'
          }`}>
            {notifPermissionGranted ? t.permissionGranted : t.permissionRequired}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-app-primary">{t.trainingReminders}</span>
            <span className="text-xs text-app-muted">{t.trainingRemindersDesc}</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!notifPermissionGranted) {
                await handleRequestNotifications();
              } else {
                await updateSettings({ notificationsEnabled: !settings.notificationsEnabled });
              }
            }}
            className={`w-12 h-7 rounded-full transition-colors relative p-1 ${
              settings.notificationsEnabled && notifPermissionGranted ? 'bg-app-accent' : 'bg-app-surface-2 border border-app'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full transition-transform ${
                settings.notificationsEnabled && notifPermissionGranted
                  ? 'translate-x-5 bg-on-accent'
                  : 'translate-x-0 bg-app-muted'
              }`}
            />
          </button>
        </div>

        {/* Web Platform Behavior Notice */}
        <div className="p-3 rounded-xl bg-app-surface-2 border border-app text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t.webPlatformReminders}</span>
          </div>
          <p className="text-[11px] text-app-muted leading-relaxed">
            {t.webRemindersNotice}
          </p>
        </div>
      </section>

      {/* 6. Saved Training Locations */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-app-accent text-xs font-bold uppercase tracking-wider">
            <MapPin className="w-4 h-4" />
            <span>{t.savedPlaces}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsPlaceDialogOpen(true)}
            className="h-8 px-2.5 rounded-lg bg-app-surface-2 border border-app text-xs font-semibold text-app-primary hover:border-app-accent flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addPlace}</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-app-surface-2 border border-app text-sm text-app-primary"
            >
              <span>{loc.name}</span>
              <button
                type="button"
                onClick={() => deleteLocation(loc.id)}
                aria-label={t.removeLocationAria.replace('{name}', loc.name)}
                className="text-app-muted hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {locations.length === 0 && (
            <span className="text-xs text-app-muted">{t.noCustomPlaces}</span>
          )}
        </div>
      </section>

      {/* 7. Data Storage & Backup Engine */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-app-accent text-xs font-bold uppercase tracking-wider">
            <Database className="w-4 h-4" />
            <span>{t.localDatabaseBackup}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 uppercase">
            {t.indexedDBActive}
          </span>
        </div>

        {/* Storage Persistence Status */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-app-surface-2 border border-app text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-app-muted uppercase font-bold">{t.durabilityStatus}</span>
            <span className="font-semibold text-app-primary mt-0.5">
              {storagePersisted === true
                ? t.persistStatusPersistent
                : storagePersisted === false
                ? t.persistStatusBestEffort
                : t.persistStatusDetecting}
            </span>
          </div>
          {storagePersisted === false && (
            <button
              type="button"
              onClick={handleRequestPersistence}
              className="px-2.5 py-1 rounded-lg bg-app-accent text-on-accent text-xs font-bold active:scale-95 transition-transform"
            >
              {t.requestPersist}
            </button>
          )}
          {storagePersisted === true && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 uppercase">
              {t.persisted}
            </span>
          )}
        </div>

        {/* Database Metric Summary */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-app-surface-2 border border-app text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-app-muted uppercase">{t.sessionPlural}</span>
            <span className="font-bold text-app-primary tabular-nums mt-0.5">
              {storageStats.sessionsCount} {t.logsSuffix}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-app-muted uppercase">{t.exercises}</span>
            <span className="font-bold text-app-primary tabular-nums mt-0.5">
              {storageStats.exercisesCount} {t.itemsSuffix}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-app-muted uppercase">{t.totalSets}</span>
            <span className="font-bold text-app-accent tabular-nums mt-0.5">
              {storageStats.totalSets}
            </span>
          </div>
        </div>

        {/* Backup Actions */}
        <div className="grid grid-cols-1 gap-2 pt-1">
          <button
            type="button"
            onClick={handleExportJSON}
            className="w-full h-12 rounded-xl bg-app-surface-2 border border-app px-4 text-sm font-semibold text-app-primary flex items-center justify-between hover:bg-app-surface hover:border-app-accent transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-app-accent" />
              <span>{t.exportJSON}</span>
            </div>
            <span className="text-xs text-app-muted">.json</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="w-full h-12 rounded-xl bg-app-surface-2 border border-app px-4 text-sm font-semibold text-app-primary flex items-center justify-between hover:bg-app-surface hover:border-app-accent transition-all"
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>{t.exportCSV}</span>
            </div>
            <span className="text-xs text-app-muted">.csv</span>
          </button>

          <label className="w-full h-12 rounded-xl bg-app-surface-2 border border-app px-4 text-sm font-semibold text-app-primary flex items-center justify-between hover:bg-app-surface hover:border-app-accent transition-all cursor-pointer">
            <div className="flex items-center gap-2.5">
              <Upload className="w-4 h-4 text-sky-400" />
              <span>{t.importJSON}</span>
            </div>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>
        </div>

        {/* Reset All Data Action */}
        <div className="pt-2 border-t border-app">
          <button
            type="button"
            onClick={() => setIsResetDialogOpen(true)}
            className="w-full h-12 rounded-xl bg-red-950/30 border border-red-500/40 text-red-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-950/50 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>{t.resetData}</span>
          </button>
        </div>
      </section>

      {/* 5B. Training Reminders & Mobile Notifications */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-app-accent text-xs font-bold uppercase tracking-wider">
            <Bell className="w-4 h-4" />
            <span>{t.remindersNotifications}</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
            notifPermissionGranted
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-app-surface-2 text-app-muted border-app'
          }`}>
            {notifPermissionGranted ? t.permissionGranted : t.permissionRequired}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-app-primary">{t.trainingReminders}</span>
            <span className="text-xs text-app-muted">{t.trainingRemindersDesc}</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!notifPermissionGranted) {
                await handleRequestNotifications();
              } else {
                await updateSettings({ notificationsEnabled: !settings.notificationsEnabled });
              }
            }}
            className={`w-12 h-7 rounded-full transition-colors relative p-1 ${
              settings.notificationsEnabled && notifPermissionGranted ? 'bg-app-accent' : 'bg-app-surface-2 border border-app'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full transition-transform ${
                settings.notificationsEnabled && notifPermissionGranted
                  ? 'translate-x-5 bg-on-accent'
                  : 'translate-x-0 bg-app-muted'
              }`}
            />
          </button>
        </div>

        {/* Web Platform Behavior Notice */}
        <div className="p-3 rounded-xl bg-app-surface-2 border border-app text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t.webPlatformReminders}</span>
          </div>
          <p className="text-[11px] text-app-muted leading-relaxed">
            {t.webRemindersNotice}
          </p>
        </div>

        {/* Mobile Notification Preview */}
        <div className="p-3 rounded-xl bg-app-surface-2 border border-app text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-app-accent">
            <Smartphone className="w-3.5 h-3.5" />
            <span>{t.mobileNotificationsPreview}</span>
          </div>
          <p className="text-[11px] text-app-muted leading-relaxed">
            {t.mobileNotificationsPreviewDesc}
          </p>
          <div className="mt-2 space-y-1 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-app-accent/15 font-mono">{t.notifWorkoutTitle}</span>
              <span className="text-app-muted">{t.notifWorkoutBody}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-app-accent/15 font-mono">{t.notifIdleTitle}</span>
              <span className="text-app-muted">{t.notifIdleBody}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-app-accent/15 font-mono">{t.notifOverdueTitle}</span>
              <span className="text-app-muted">{t.notifOverdueBody}</span>
            </div>
          </div>
        </div>
      </section>

      {/* App Version / Local First Badge */}
      <footer className="text-center py-2 text-xs text-app-muted space-y-1">
        <p className="font-bold text-app-primary">{t.aboutVersion}</p>
        <p className="text-[11px] opacity-75">
          {t.aboutDesc}
        </p>
      </footer>

      {/* Add Place Dialog */}
      <Dialog
        isOpen={isPlaceDialogOpen}
        title={t.addPlace}
        onClose={() => setIsPlaceDialogOpen(false)}
        onConfirm={handleAddPlace}
        confirmLabel={t.save}
      >
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={newPlaceName}
            onChange={(e) => setNewPlaceName(e.target.value)}
            placeholder={t.placeNamePlaceholder}
            className="w-full h-12 rounded-xl bg-app-surface-2 border border-app px-4 text-sm text-app-primary focus:outline-none focus:border-app-accent"
          />
        </div>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog
        isOpen={isResetDialogOpen}
        title={t.resetConfirmTitle}
        description={t.resetConfirmDesc}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleResetData}
        confirmLabel={t.delete}
        isDestructive={true}
      />

      {/* Import Confirmation Dialog */}
      <Dialog
        isOpen={isImportConfirmOpen}
        title={t.restoreTitle}
        description={t.restoreDesc
          .replace('{sessions}', String(importSummary?.sessionsCount || 0))
          .replace('{exercises}', String(importSummary?.exercisesCount || 0))
          .replace('{collections}', String(importSummary?.collectionsCount || 0))}
        onClose={() => {
          setIsImportConfirmOpen(false);
          setPendingImportData(null);
        }}
        onConfirm={handleConfirmImport}
        confirmLabel={t.confirmRestore}
        isDestructive={false}
      />
    </div>
  );
};
