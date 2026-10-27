import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Schedule, Session } from '../types/index.ts';
import { getTranslations } from '../i18n/index.ts';
import { StorageService } from './storage.ts';
import { localDayKey } from '../domain/calculations.ts';

// Reserved ids sit above the range produced by getStableNotificationId (max 999_997),
// so a rest/round timer notification can never overwrite a weekly reminder.
export const REST_TIMER_NOTIFICATION_ID = 2147483000;
export const ROUND_TIMER_NOTIFICATION_ID = 2147483001;


/**
 * Deterministic stable 31-bit numeric ID for Capacitor LocalNotifications.
 * Combines schedule ID hash with weekday offset (0-6).
 */
export function getStableNotificationId(scheduleId: string, dayOfWeek: number): number {
  let hash = 0;
  for (let i = 0; i < scheduleId.length; i++) {
    hash = ((hash << 5) - hash) + scheduleId.charCodeAt(i);
    hash |= 0;
  }
  const base = (Math.abs(hash) % 100000);
  return base * 10 + (dayOfWeek % 7) + 1;
}

export interface INotificationService {
  requestPermissionWithExplainer(): Promise<boolean>;
  hasPermission(): Promise<boolean>;
  scheduleReminder(schedule: Schedule, workoutTitle: string): Promise<void>;
  cancelReminder(scheduleId: string): Promise<void>;
  rescheduleAll(schedules: Schedule[], sessions?: Session[]): Promise<void>;
  sendImmediateNotification(title: string, body: string): Promise<void>;
  scheduleRestTimerEnd(targetEndTimestamp: number, exerciseName?: string): Promise<void>;
  scheduleRoundTimerPhaseChange(
    targetEndTimestamp: number,
    round: number,
    totalRounds: number,
    phase: 'work' | 'rest' | 'complete',
    exerciseName?: string
  ): Promise<void>;
  cancelTimerNotifications(): Promise<void>;
  getPendingWorkoutAlert(): { title: string; body: string } | null;
  clearPendingWorkoutAlert(): void;
  scheduleUpcomingWorkoutReminder(schedule: Schedule): Promise<void>;
  scheduleOverdueWorkoutNudge(): Promise<void>;
  scheduleIdleEncouragement(): Promise<void>;
  cancelAllAppNotifications(): Promise<void>;
  getNextScheduledWorkoutTime(schedules: Schedule[]): { schedule: Schedule; minutesUntil: number } | null;
}

class UniversalNotificationService implements INotificationService {
  private inAppAlert: { title: string; body: string } | null = null;
  private timerTimeoutId: number | null = null;

  async hasPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const check = await LocalNotifications.checkPermissions();
        return check.display === 'granted';
      } catch {
        return false;
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  }

  async requestPermissionWithExplainer(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const check = await LocalNotifications.checkPermissions();
        if (check.display === 'granted') return true;
        const res = await LocalNotifications.requestPermissions();
        return res.display === 'granted';
      } catch {
        return false;
      }
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const res = await Notification.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }

  private async getT() {
    try {
      const s = await StorageService.getSettings();
      return getTranslations(s?.language || 'en');
    } catch {
      return getTranslations('en');
    }
  }

  async scheduleReminder(schedule: Schedule, _workoutTitle: string): Promise<void> {
    if (!schedule.reminderOn) return;
    const t = await this.getT();

    if (Capacitor.isNativePlatform()) {
      const [hStr, mStr] = schedule.time.split(':');
      const hour = parseInt(hStr, 10) || 8;
      const minute = parseInt(mStr, 10) || 0;

      for (const day of schedule.days) {
        // App: 0=Mon, 6=Sun -> Capacitor: 1=Sun, 2=Mon... 7=Sat
        const capWeekday = ((day + 1) % 7) + 1;
        const id = getStableNotificationId(schedule.id, day);

        try {
          await LocalNotifications.schedule({
            notifications: [
              {
                id,
                title: t.notifWorkoutTitle,
                body: t.notifWorkoutBody,
                schedule: {
                  on: {
                    weekday: capWeekday,
                    hour,
                    minute,
                  },
                  repeats: true,
                  allowWhileIdle: true,
                },
              },
            ],
          });
        } catch {
          // Native local notification error handling

        }
      }
    }
  }

  async cancelReminder(scheduleId: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const idsToCancel = [0, 1, 2, 3, 4, 5, 6].map(d => ({
        id: getStableNotificationId(scheduleId, d),
      }));
      try {
        await LocalNotifications.cancel({ notifications: idsToCancel });
      } catch {
        //
      }
    }
  }

  async rescheduleAll(schedules: Schedule[], sessions?: Session[]): Promise<void> {
    const t = await this.getT();
    const now = new Date();
    const todayDateKey = localDayKey(now);
    const todayDayOfWeek = (now.getDay() + 6) % 7; // 0=Mon, 6=Sun
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Native platform handling: cancel all pending and reschedule with stable numeric IDs
    if (Capacitor.isNativePlatform()) {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications });
        }
      } catch {
        //
      }

      for (const sc of schedules) {
        if (sc.reminderOn) {
          const [hStr, mStr] = sc.time.split(':');
          const hour = parseInt(hStr, 10) || 8;
          const minute = parseInt(mStr, 10) || 0;

          for (const day of sc.days) {
            const capWeekday = ((day + 1) % 7) + 1;
            const id = getStableNotificationId(sc.id, day);

            try {
              await LocalNotifications.schedule({
                notifications: [
                  {
                    id,
                    title: t.notifWorkoutTitle,
                    body: t.notifWorkoutBody,
                    schedule: {
                      on: {
                        weekday: capWeekday,
                        hour,
                        minute,
                      },
                      repeats: true,
                      allowWhileIdle: true,
                    },
                  },
                ],
              });
            } catch {
              //
            }
          }
        }
      }
    }

    // 2. Web In-app banner:
    // Only show if today's workout isn't done AND scheduled time hasn't passed yet
    const todayWorkoutDone = sessions
      ? sessions.some(s => localDayKey(new Date(s.startedAt)) === todayDateKey && s.sets.some(st => st.done))
      : false;

    if (todayWorkoutDone) {
      this.inAppAlert = null;
      return;
    }

    const todaySchedule = schedules.find(sc => sc.reminderOn && sc.days.includes(todayDayOfWeek));
    if (todaySchedule) {
      const [hStr, mStr] = todaySchedule.time.split(':');
      const targetMinutes = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0);

      // Only show banner if time hasn't passed yet
      if (currentMinutes <= targetMinutes) {
        this.inAppAlert = {
          title: t.notifWorkoutTitle,
          body: `${t.notifWorkoutBody} (${todaySchedule.time})`,
        };
      } else {
        this.inAppAlert = null;
      }
    } else {
      this.inAppAlert = null;
    }
  }

  async sendImmediateNotification(title: string, body: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Date.now() % 1000000),
              title,
              body,
              schedule: { at: new Date(Date.now() + 100) },
            },
          ],
        });
      } catch {
        //
      }
      return;
    }

    // On Web: ALWAYS use service worker's showNotification (never new Notification)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              body,
              icon: './pwa-192x192.png',
              badge: './pwa-192x192.png',
            });
            return;
          }
        } catch {
          //
        }
      }
    }
  }

  async scheduleRestTimerEnd(targetEndTimestamp: number, exerciseName?: string): Promise<void> {
    await this.cancelTimerNotifications();
    const t = await this.getT();

    const title = t.notifRestCompleteTitle;
    const body = t.notifRestCompleteBody.replace('{exercise}', exerciseName || t.home);

    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: REST_TIMER_NOTIFICATION_ID,
              title,
              body,
              schedule: { at: new Date(targetEndTimestamp), allowWhileIdle: true },
            },
          ],
        });
      } catch {
        //
      }
      return;
    }

    const delay = targetEndTimestamp - Date.now();
    if (delay > 0) {
      this.timerTimeoutId = window.setTimeout(async () => {
        await this.sendImmediateNotification(title, body);
        this.timerTimeoutId = null;
      }, delay);
    }
  }

  async scheduleRoundTimerPhaseChange(
    targetEndTimestamp: number,
    round: number,
    _totalRounds: number,
    phase: 'work' | 'rest' | 'complete',
    exerciseName?: string
  ): Promise<void> {
    await this.cancelTimerNotifications();
    const t = await this.getT();

    const title = phase === 'work' 
      ? t.notifRoundCompleteTitle.replace('{round}', String(round))
      : t.notifRoundStartTitle.replace('{round}', String(round + 1));
    const body = phase === 'work'
      ? t.notifRoundCompleteBody.replace('{exercise}', exerciseName || t.round)
      : t.notifRoundStartBody;

    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: ROUND_TIMER_NOTIFICATION_ID,
              title,
              body,
              schedule: { at: new Date(targetEndTimestamp), allowWhileIdle: true },
            },
          ],
        });
      } catch {
        //
      }
      return;
    }

    const delay = targetEndTimestamp - Date.now();
    if (delay > 0) {
      this.timerTimeoutId = window.setTimeout(async () => {
        await this.sendImmediateNotification(title, body);
        this.timerTimeoutId = null;
      }, delay);
    }
  }

  async cancelTimerNotifications(): Promise<void> {
    if (this.timerTimeoutId !== null) {
      clearTimeout(this.timerTimeoutId);
      this.timerTimeoutId = null;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.cancel({
          notifications: [
            { id: REST_TIMER_NOTIFICATION_ID },
            { id: ROUND_TIMER_NOTIFICATION_ID },
          ],
        });
      } catch {
        //
      }
    }
  }

  getPendingWorkoutAlert(): { title: string; body: string } | null {
    return this.inAppAlert;
  }

  clearPendingWorkoutAlert(): void {
    this.inAppAlert = null;
  }

  /**
   * Schedule a native reminder notification for the next upcoming workout
   * (the soonest scheduled workout that hasn't passed yet today).
   */
  async scheduleUpcomingWorkoutReminder(schedule: Schedule): Promise<void> {
    if (!schedule.reminderOn) return;
    const t = await this.getT();
    if (!Capacitor.isNativePlatform()) return;

    const [hStr, mStr] = schedule.time.split(':');
    const hour = parseInt(hStr, 10) || 8;
    const minute = parseInt(mStr, 10) || 0;
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
    if (target.getTime() <= now.getTime()) return; // already passed today

    const capWeekday = ((now.getDay() + 6) % 7); // 0=Mon..6=Sun -> same as schedule.days
    const dayIndex = schedule.days.indexOf(capWeekday);
    if (dayIndex === -1) return; // not scheduled today

    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: getStableNotificationId(schedule.id, capWeekday) + 1000000,
          title: t.notifWorkoutTitle,
          body: `${t.notifWorkoutBody} — ${schedule.time} `,
          schedule: { at: target, allowWhileIdle: true },
        }],
      });
    } catch {
      //
    }
  }

  /**
   * Fire an immediate overdue nudge: the user hasn't trained today
   * and the scheduled time already passed.
   */
  async scheduleOverdueWorkoutNudge(): Promise<void> {
    const t = await this.getT();
    const now = new Date();
    const todayDateKey = localDayKey(now);
    const todayDayOfWeek = (now.getDay() + 6) % 7;

    const todaySchedule = await this.getTodaySchedule(todayDayOfWeek);
    if (!todaySchedule) return;

    // Check if user already trained today
    const hasTrained = await this.hasTrainedToday(todayDateKey);
    if (hasTrained) return;

    const [hStr, mStr] = todaySchedule.time.split(':');
    const targetMinutes = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (currentMinutes <= targetMinutes) return; // not overdue yet

    const body = `${t.notifWorkoutBody} — ${todaySchedule.time} `;
    await this.sendImmediateNotification(t.notifWorkoutTitle, body);
  }

  /**
   * Send an encouraging notification if the user hasn't trained for a while
   * (e.g., 2+ days since last session) and no workout is scheduled within the next 24h.
   */
  async scheduleIdleEncouragement(): Promise<void> {
    const t = await this.getT();
    const sessions = await StorageService.getSessions();
    if (sessions.length === 0) return;

    const now = new Date();
    const todayDateKey = localDayKey(now);

    // Last session date
    const sorted = [...sessions].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    const lastSessionDate = localDayKey(new Date(sorted[0].startedAt));
    const lastSessionDt = new Date(sorted[0].startedAt);
    const daysSinceLast = Math.floor((now.getTime() - lastSessionDt.getTime()) / (1000 * 60 * 60 * 24));

    // Already trained today?
    if (todayDateKey === lastSessionDate) return;

    // Only fire if idle 2+ days and no workout scheduled soon
    if (daysSinceLast < 2) return;

    const schedules = await StorageService.getSchedules();
    const nextWorkout = this.getNextScheduledWorkoutTime(schedules);
    if (nextWorkout && nextWorkout.minutesUntil < 24 * 60) return; // workout coming soon

    const body = daysSinceLast >= 7
      ? `${t.notifWorkoutBody} — you haven't trained in ${daysSinceLast} days. Let's get back on track!`
      : `${t.notifWorkoutBody} — it's been ${daysSinceLast} days. Time to move!`;

    await this.sendImmediateNotification(t.notifWorkoutTitle, body);
  }

  /**
   * Cancel all app-related notifications (reminders + timer alerts).
   */
  async cancelAllAppNotifications(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications });
        }
      } catch {
        //
      }
    }
    await this.cancelTimerNotifications();
    this.inAppAlert = null;
  }

  /**
   * Get the soonest upcoming workout from schedules, and minutes until it.
   */
  getNextScheduledWorkoutTime(schedules: Schedule[]): { schedule: Schedule; minutesUntil: number } | null {
    const now = new Date();
    const todayDayOfWeek = (now.getDay() + 6) % 7;
    let soonest: { schedule: Schedule; minutesUntil: number } | null = null;

    for (const sc of schedules) {
      if (!sc.reminderOn) continue;
      for (const day of sc.days) {
        const daysUntil = ((day - todayDayOfWeek) + 7) % 7;
        const [hStr, mStr] = sc.time.split(':');
        const hour = parseInt(hStr, 10) || 8;
        const minute = parseInt(mStr, 10) || 0;
        const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntil, hour, minute, 0);
        const diffMs = target.getTime() - now.getTime();
        if (diffMs > 0) {
          const minutes = Math.floor(diffMs / 60000);
          if (!soonest || minutes < soonest.minutesUntil) {
            soonest = { schedule: sc, minutesUntil: minutes };
          }
        }
      }
    }
    return soonest;
  }

  /**
   * Helper: find today's schedule for a given day-of-week.
   */
  private async getTodaySchedule(dayOfWeek: number): Promise<Schedule | null> {
    try {
      const schedules = await this.getSchedules();
      return schedules.find(sc => sc.reminderOn && sc.days.includes(dayOfWeek)) || null;
    } catch {
      return null;
    }
  }

  /**
   * Helper: check if user trained today (has a session with done sets).
   */
  private async hasTrainedToday(dateKey: string): Promise<boolean> {
    const sessions = await StorageService.getSessions();
    return sessions.some(s => {
      if (!s.startedAt) return false;
      const sDateKey = localDayKey(new Date(s.startedAt));
      return sDateKey === dateKey && s.sets.some(st => st.done);
    });
  }

  /**
   * Helper: get schedules from storage.
   */
  private async getSchedules(): Promise<Schedule[]> {
    try {
      return await StorageService.getSchedules();
    } catch {
      return [];
    }
  }
}

export const NotificationService: INotificationService = new UniversalNotificationService();
