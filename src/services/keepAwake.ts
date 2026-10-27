export interface IKeepAwakeService {
  keepAwake(): Promise<void>;
  allowSleep(): Promise<void>;
  isActive(): boolean;
  reacquireIfNeeded(): Promise<void>;
}

class UniversalKeepAwakeService implements IKeepAwakeService {
  private wakeLockSentinel: any = null;
  private active = false;
  private shouldStayAwake = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.shouldStayAwake) {
          this.reacquireIfNeeded();
        }
      });
    }
  }

  async keepAwake(): Promise<void> {
    this.shouldStayAwake = true;
    await this.requestLock();
  }

  async reacquireIfNeeded(): Promise<void> {
    if (!this.shouldStayAwake) return;
    await this.requestLock();
  }

  private async requestLock(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (this.wakeLockSentinel && !this.wakeLockSentinel.released) {
          return;
        }
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        this.active = true;
        this.wakeLockSentinel.addEventListener('release', () => {
          this.active = false;
          this.wakeLockSentinel = null;
        });
      } catch {
        // May fail if battery saver is on or tab is inactive
      }
    }
  }

  async allowSleep(): Promise<void> {
    this.shouldStayAwake = false;
    if (this.wakeLockSentinel) {
      try {
        await this.wakeLockSentinel.release();
      } catch {
        //
      }
      this.wakeLockSentinel = null;
    }
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }
}

export const KeepAwakeService: IKeepAwakeService = new UniversalKeepAwakeService();
