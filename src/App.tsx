/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { AppHeader } from './components/AppHeader.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { LibraryScreen } from './screens/LibraryScreen.tsx';
import { OnboardingScreen } from './screens/OnboardingScreen.tsx';

const CalendarScreen = React.lazy(() => import('./screens/CalendarScreen.tsx').then(m => ({ default: m.CalendarScreen })));
const ProgressScreen = React.lazy(() => import('./screens/ProgressScreen.tsx').then(m => ({ default: m.ProgressScreen })));
const SettingsScreen = React.lazy(() => import('./screens/SettingsScreen.tsx').then(m => ({ default: m.SettingsScreen })));


import { CollectionDetailScreen } from './screens/CollectionDetailScreen.tsx';
import { AddEditExerciseScreen } from './screens/AddEditExerciseScreen.tsx';
import { ActiveWorkoutScreen } from './screens/ActiveWorkoutScreen.tsx';
import { WorkoutSummaryScreen } from './screens/WorkoutSummaryScreen.tsx';
import { ActiveWorkoutDock } from './components/ActiveWorkoutDock.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { useBackNavigation } from './hooks/useBackNavigation.ts';

function MainAppShell() {
  const { 
    settings, 
    t,
    activeTab, 
    activeCollectionId, 
    setActiveCollectionId, 
    activeExerciseModal, 
    setActiveExerciseModal, 
    updateSettings, 
    isLoading,
    isWorkoutActive,
    isWorkoutMinimized,
    setIsWorkoutMinimized,
    activeDraft,
    summarySession,
    setSummarySession,
    startWorkout
  } = useApp();

  // Handle ?autostart=1 test query param to skip straight into the app
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' && !settings.hasCompletedOnboarding) {
        updateSettings({ hasCompletedOnboarding: true });
      }
    }
  }, [settings.hasCompletedOnboarding, updateSettings]);

  // Page stack depth: how many full-screen pages are open above the tab root
  const pageDepth =
    (activeCollectionId ? 1 : 0) +
    (activeExerciseModal ? 1 : 0) +
    (isWorkoutActive && !isWorkoutMinimized && activeDraft ? 1 : 0) +
    (summarySession ? 1 : 0);

  // Closes the current topmost page when the user presses back
  const closeTopLayer = () => {
    if (summarySession) {
      setSummarySession(null);
    } else if (isWorkoutActive && !isWorkoutMinimized && activeDraft) {
      // Never kill a running session — just dock it
      setIsWorkoutMinimized(true);
    } else if (activeExerciseModal) {
      setActiveExerciseModal(null);
    } else if (activeCollectionId) {
      setActiveCollectionId(null);
    }
  };

  useBackNavigation(!isLoading && settings.hasCompletedOnboarding, pageDepth, closeTopLayer);

  if (isLoading) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-app-bg text-app-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-app-accent border-t-transparent animate-spin" />
          <span className="text-xs font-semibold uppercase tracking-wider text-app-muted">
            {t.loading}
          </span>
        </div>
      </div>
    );
  }

  // If onboarding not completed, render Onboarding Screen
  if (!settings.hasCompletedOnboarding) {
    return (
      <OnboardingScreen 
        onComplete={() => updateSettings({ hasCompletedOnboarding: true })} 
      />
    );
  }

  // Post-Workout Summary Screen
  if (summarySession) {
    return (
      <WorkoutSummaryScreen
        session={summarySession}
        onDone={() => setSummarySession(null)}
      />
    );
  }

  // Full Active Workout Screen
  if (isWorkoutActive && !isWorkoutMinimized && activeDraft) {
    return <ActiveWorkoutScreen />;
  }

  // Flow Screen 1: Add or Edit Exercise Modal
  if (activeExerciseModal) {
    return (
      <AddEditExerciseScreen
        exerciseId={activeExerciseModal.exerciseId}
        returnToCollectionId={activeExerciseModal.returnToCollectionId}
        onClose={() => setActiveExerciseModal(null)}
      />
    );
  }

  // Flow Screen 2: Collection Detail
  if (activeCollectionId) {
    return (
      <CollectionDetailScreen
        collectionId={activeCollectionId}
        onBack={() => setActiveCollectionId(null)}
        onStartWorkout={(col) => {
          startWorkout(col.id);
          setActiveCollectionId(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-app-bg text-app-primary flex flex-col antialiased selection:bg-app-accent selection:text-on-accent">
      {/* Universal Athletic AppHeader */}
      <AppHeader hideStreak={activeTab === 'progress'} />

      {/* Screen Views */}
      <main className="flex-1 w-full overflow-x-hidden">
        <React.Suspense fallback={
          <div className="flex h-64 items-center justify-center text-app-muted">
            <div className="w-6 h-6 rounded-full border-2 border-app-accent border-t-transparent animate-spin" />
          </div>
        }>
          {activeTab === 'home' && <HomeScreen />}
          {activeTab === 'library' && <LibraryScreen />}
          {activeTab === 'calendar' && <CalendarScreen />}
          {activeTab === 'progress' && <ProgressScreen />}
          {activeTab === 'more' && <SettingsScreen />}
        </React.Suspense>
      </main>

      {/* Persistent Floating Mini Active Workout Dock */}
      <ActiveWorkoutDock />

      {/* Offline Mode Indicator */}
      <OfflineIndicator />

      {/* Persistent Bottom Navigation Shell (96px safe clearance reserved in screens) */}
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppShell />
    </AppProvider>
  );
}
