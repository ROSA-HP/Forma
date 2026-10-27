import React, { useState } from 'react';
import { X, Clock, Bell } from 'lucide-react';
import { Schedule, Collection } from '../types/index.ts';
import { useApp } from '../context/AppContext.tsx';
import { NotificationService } from '../services/notification.ts';
import { HapticsService } from '../services/haptics.ts';

interface ScheduleModalProps {
  isOpen: boolean;
  collection: Collection;
  onClose: () => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  collection,
  onClose
}) => {
  const { schedules, saveSchedule, t } = useApp();

  // Find existing schedule for this collection or default
  const existing = schedules.find(s => s.collectionId === collection.id);

  const [mode, setMode] = useState<'weekly' | 'cycle'>(existing?.mode || 'weekly');
  const [selectedDays, setSelectedDays] = useState<number[]>(existing?.days || [0, 3]); // Mon & Thu
  const [time, setTime] = useState<string>(existing?.time || '17:30');
  const [reminderOn, setReminderOn] = useState<boolean>(existing ? existing.reminderOn : true);

  if (!isOpen) return null;

  const daysLabels = [
    { id: 0, label: t.dayMon },
    { id: 1, label: t.dayTue },
    { id: 2, label: t.dayWed },
    { id: 3, label: t.dayThu },
    { id: 4, label: t.dayFri },
    { id: 5, label: t.daySat },
    { id: 6, label: t.daySun }
  ];

  const toggleDay = (day: number) => {
    HapticsService.light();
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    HapticsService.medium();
    const updated: Schedule = {
      id: existing?.id || crypto.randomUUID(),
      mode,
      days: selectedDays,
      time,
      reminderOn,
      collectionId: collection.id
    };

    if (reminderOn) {
      await NotificationService.scheduleReminder(updated, collection.name);
    }
    await saveSchedule(updated);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={t.workoutScheduleOptions}
    >
      <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-app-surface border border-app flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-app">
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-app-primary">
              {t.scheduleWorkout}
            </h2>
            <span className="text-xs text-app-muted truncate max-w-[240px]">
              {collection.name}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.cancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-app-muted hover:text-app-primary hover:bg-app-surface-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-app-surface-2 border border-app rounded-xl">
            <button
              type="button"
              onClick={() => setMode('weekly')}
              className={`h-9 rounded-lg text-xs font-bold uppercase transition-all ${
                mode === 'weekly' ? 'bg-app-accent text-on-accent' : 'text-app-muted'
              }`}
            >
              {t.weeklySchedule}
            </button>
            <button
              type="button"
              onClick={() => setMode('cycle')}
              className={`h-9 rounded-lg text-xs font-bold uppercase transition-all ${
                mode === 'cycle' ? 'bg-app-accent text-on-accent' : 'text-app-muted'
              }`}
            >
              {t.rotatingCycle}
            </button>
          </div>

          {/* Days Grid */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
              {t.repeatDays}
            </span>
            <div className="grid grid-cols-7 gap-1">
              {daysLabels.map(d => {
                const isSelected = selectedDays.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDay(d.id)}
                    className={`h-11 rounded-lg text-xs font-bold border transition-colors flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-app-accent text-on-accent border-app-accent'
                        : 'bg-app-surface-2 border-app text-app-muted hover:text-app-primary'
                    }`}
                  >
                    <span>{d.label}</span>
                    {isSelected && <span className="w-1 h-1 rounded-full bg-on-accent mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Time */}
          <div className="space-y-1.5">
            <label htmlFor="sched-time" className="text-xs font-bold uppercase tracking-wider text-app-muted">
              {t.workoutReminderTime}
            </label>
            <div className="relative flex items-center">
              <Clock className="w-4 h-4 absolute start-3 text-app-muted pointer-events-none" />
              <input
                id="sched-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-12 ps-10 pe-4 rounded-xl bg-app-surface-2 border border-app text-sm font-semibold text-app-primary focus:outline-none focus:border-app-accent"
              />
            </div>
          </div>

          {/* Toggle Reminder Notification */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-app-surface-2 border border-app">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-app-accent" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-app-primary">
                  {t.localDeviceReminder}
                </span>
                <span className="text-[11px] text-app-muted">
                  {t.privateNotifDesc}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReminderOn(!reminderOn)}
              aria-label={t.localDeviceReminder}
              className={`w-12 h-7 rounded-full transition-colors relative p-1 ${
                reminderOn ? 'bg-app-accent' : 'bg-app-surface border border-app'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full transition-transform ${
                  reminderOn ? 'translate-x-5 rtl:-translate-x-5 bg-on-accent' : 'translate-x-0 bg-app-muted'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-app bg-app-surface">
          <button
            type="button"
            onClick={handleSave}
            className="w-full h-12 rounded-xl bg-app-accent text-on-accent font-bold text-sm flex items-center justify-center transition-opacity hover:opacity-90 active:scale-[0.99]"
          >
            {t.saveSchedule}
          </button>
        </div>
      </div>
    </div>
  );
};
