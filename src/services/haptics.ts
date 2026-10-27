export interface IHapticsService {
  light(): void;
  medium(): void;
  success(): void;
  warning(): void;
}

class UniversalHapticsService implements IHapticsService {
  light(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignore in unsupported environments
      }
    }
  }

  medium(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(30);
      } catch {
        // Ignore
      }
    }
  }

  success(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([20, 60, 40]);
      } catch {
        // Ignore
      }
    }
  }

  warning(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 40, 80]);
      } catch {
        // Ignore
      }
    }
  }
}

export const HapticsService: IHapticsService = new UniversalHapticsService();
