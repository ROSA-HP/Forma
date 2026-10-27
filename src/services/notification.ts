import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Schedule, Session } from '../types/index.ts';
import { getTranslations } from '../i18n/index.ts';
import { StorageService } from './storage.ts';

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
    const todayDateKey = now.toISOString().split('T')[0];
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
      ? sessions.some(s => s.startedAt.startsWith(todayDateKey) && s.sets.some(st => st.done))
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
}

export const NotificationService: INotificationService = new UniversalNotificationService();
