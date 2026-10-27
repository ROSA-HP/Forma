import 'fake-indexeddb/auto';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { StorageService } from './storage.ts';
import { DEFAULT_SETTINGS } from '../domain/constants.ts';
import type {
  Achievement,
  Collection,
  Exercise,
  Location,
  Schedule,
  Session,
} from '../types/index.ts';

/**
 * Minimal localStorage polyfill for Node. The persistence layer keeps settings
 * and the in-progress workout draft there (see WebStorageService), so the tests
 * need a working implementation of the Web Storage API.
 */
class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

const memoryStorage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: memoryStorage,
  configurable: true,
  writable: true,
});

const DB_NAME = 'trainlog_db';

// ---------------------------------------------------------------- fixtures

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'ex-1',
    name: 'Bench Press',
    category: 'gym',
    equipment: 'barbell',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps'],
    trackingType: 'weight_reps',
    defaultRestSec: 120,
    incrementKg: 2.5,
    source: 'custom',
    ...overrides,
  };
}

function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'col-1',
    name: 'Push Day',
    goal: 'hypertrophy',
    items: [
      { exerciseId: 'ex-1', role: 'compound', sets: 4, repsMin: 6, repsMax: 10, restSec: 120 },
    ],
    ...overrides,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'ses-1',
    number: 1,
    startedAt: '2026-01-10T18:00:00.000Z',
    endedAt: '2026-01-10T19:00:00.000Z',
    pausedMs: 0,
    xpGained: 120,
    sets: [
      { id: 'set-1', exerciseId: 'ex-1', loadKg: 80, reps: 8, tag: 'normal', done: true },
    ],
    ...overrides,
  };
}

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 'sch-1',
    mode: 'weekly',
    days: [0, 3],
    time: '18:30',
    reminderOn: true,
    collectionId: 'col-1',
    ...overrides,
  };
}

function makeLocation(overrides: Partial<Location> = {}): Location {
  return { id: 'loc-1', name: 'Home Gym', ...overrides };
}

function makeAchievement(overrides: Partial<Achievement> = {}): Achievement {
  return {
    id: 'ach-1',
    title: 'First workout',
    description: 'Complete your first session',
    icon: 'trophy',
    progress: 1,
    maxProgress: 1,
    ...overrides,
  };
}

function objectStoreNames(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = () => {
      const db = request.result;
      const names = Array.from(db.objectStoreNames);
      db.close();
      resolve(names);
    };
    request.onerror = () => reject(request.error);
  });
}

beforeEach(async () => {
  await StorageService.init();
  await StorageService.resetAllData();
  memoryStorage.clear();
});

// ------------------------------------------------------------------- tests

test('storage: init() creates all seven object stores', async () => {
  await StorageService.init();
  assert.deepEqual((await objectStoreNames()).sort(), [
    'achievements',
    'collections',
    'exercises',
    'locations',
    'measurements',
    'schedules',
    'sessions',
  ]);
});

test('storage: settings round-trip through localStorage and merge defaults', async () => {
  const custom = {
    ...DEFAULT_SETTINGS,
    profileName: 'Nour',
    weightUnit: 'lb' as const,
    weeklyGoalDays: 5,
  };

  await StorageService.saveSettings(custom);
  const restored = await StorageService.getSettings();

  assert.equal(restored.profileName, 'Nour');
  assert.equal(restored.weightUnit, 'lb');
  assert.equal(restored.weeklyGoalDays, 5);

  // A partial/legacy payload must be back-filled from DEFAULT_SETTINGS
  memoryStorage.setItem('trainlog_settings', JSON.stringify({ profileName: 'Legacy' }));
  const merged = await StorageService.getSettings();
  assert.equal(merged.profileName, 'Legacy');
  assert.equal(merged.weightUnit, DEFAULT_SETTINGS.weightUnit);
  assert.equal(merged.hasCompletedOnboarding, DEFAULT_SETTINGS.hasCompletedOnboarding);
});

test('storage: settings survive corrupt localStorage payloads', async () => {
  memoryStorage.setItem('trainlog_settings', '{not valid json');
  const settings = await StorageService.getSettings();
  assert.equal(settings.profileName, DEFAULT_SETTINGS.profileName);
});

test('storage: exercises are inserted, updated and deleted by id', async () => {
  await StorageService.saveExercise(makeExercise());
  assert.equal((await StorageService.getExercises()).length, 1);

  await StorageService.saveExercise(makeExercise({ name: 'Incline Bench Press' }));
  const updated = await StorageService.getExercises();
  assert.equal(updated.length, 1, 'put() on the same id must update, not duplicate');
  assert.equal(updated[0].name, 'Incline Bench Press');

  await StorageService.deleteExercise('ex-1');
  assert.deepEqual(await StorageService.getExercises(), []);
});

test('storage: collections and their items persist', async () => {
  await StorageService.saveCollection(makeCollection());
  const collections = await StorageService.getCollections();
  assert.equal(collections.length, 1);
  assert.equal(collections[0].name, 'Push Day');
  assert.equal(collections[0].items[0].exerciseId, 'ex-1');

  await StorageService.deleteCollection('col-1');
  assert.deepEqual(await StorageService.getCollections(), []);
});

test('storage: sessions come back newest first', async () => {
  await StorageService.saveSession(
    makeSession({ id: 'ses-old', number: 1, startedAt: '2026-01-01T10:00:00.000Z' })
  );
  await StorageService.saveSession(
    makeSession({ id: 'ses-new', number: 2, startedAt: '2026-02-01T10:00:00.000Z' })
  );

  const sessions = await StorageService.getSessions();
  assert.deepEqual(
    sessions.map((s) => s.id),
    ['ses-new', 'ses-old']
  );
});

test('storage: schedules, locations, measurements and achievements persist', async () => {
  await StorageService.saveSchedule(makeSchedule());
  await StorageService.saveLocation(makeLocation());
  await StorageService.saveMeasurement({ id: 'm-1', date: '2026-01-01', weightKg: 80 });
  await StorageService.saveMeasurement({ id: 'm-2', date: '2026-02-01', weightKg: 82 });
  await StorageService.saveAchievements([
    makeAchievement(),
    makeAchievement({ id: 'ach-2', title: 'Ten workouts' }),
  ]);

  const [schedules, locations, measurements, achievements] = await Promise.all([
    StorageService.getSchedules(),
    StorageService.getLocations(),
    StorageService.getMeasurements(),
    StorageService.getAchievements(),
  ]);

  assert.equal(schedules[0].days.length, 2);
  assert.equal(schedules[0].time, '18:30');
  assert.equal(locations[0].name, 'Home Gym');
  assert.deepEqual(
    measurements.map((m) => m.id),
    ['m-2', 'm-1'],
    'measurements must be returned newest first'
  );
  assert.equal(achievements.length, 2, 'bulk achievement write must store every record');
});

test('storage: the in-progress workout draft survives a reload and can be cleared', async () => {
  const draft = {
    id: 'draft-1',
    startedAt: '2026-01-10T18:00:00.000Z',
    pausedMs: 0,
    isPaused: false,
    currentExerciseIndex: 1,
    sets: [{ id: 'set-1', exerciseId: 'ex-1', tag: 'normal' as const, done: false }],
    exercises: [makeExercise()],
  };

  await StorageService.saveActiveDraft(draft);
  const restored = await StorageService.getActiveDraft();
  assert.equal(restored?.id, 'draft-1');
  assert.equal(restored?.exercises[0].name, 'Bench Press');

  await StorageService.saveActiveDraft(null);
  assert.equal(await StorageService.getActiveDraft(), null);
});

test('storage: exportData() contains a version, a timestamp and every store', async () => {
  await StorageService.saveSettings({ ...DEFAULT_SETTINGS, profileName: 'Nour' });
  await StorageService.saveExercise(makeExercise());
  await StorageService.saveCollection(makeCollection());
  await StorageService.saveSession(makeSession());
  await StorageService.saveSchedule(makeSchedule());
  await StorageService.saveLocation(makeLocation());
  await StorageService.saveMeasurement({ id: 'm-1', date: '2026-01-01' });
  await StorageService.saveAchievements([makeAchievement()]);

  const backup = await StorageService.exportData();

  assert.equal(backup.version, 1);
  assert.ok(!Number.isNaN(Date.parse(backup.exportedAt)));
  assert.equal(backup.settings.profileName, 'Nour');
  assert.equal(backup.exercises.length, 1);
  assert.equal(backup.collections.length, 1);
  assert.equal(backup.sessions.length, 1);
  assert.equal(backup.schedules.length, 1);
  assert.equal(backup.locations.length, 1);
  assert.equal(backup.measurements.length, 1);
  assert.equal(backup.achievements.length, 1);
});

test('storage: importData() replaces every store and restores settings', async () => {
  // Pre-existing data that must be gone after the import
  await StorageService.saveExercise(makeExercise({ id: 'old-ex', name: 'Old Exercise' }));
  await StorageService.saveSession(makeSession({ id: 'old-ses', number: 9 }));

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS, profileName: 'Imported' },
    exercises: [makeExercise({ id: 'new-ex', name: 'New Exercise' })],
    collections: [makeCollection({ id: 'new-col' })],
    sessions: [makeSession({ id: 'new-ses', number: 3 })],
    schedules: [makeSchedule({ id: 'new-sch' })],
    measurements: [{ id: 'new-m', date: '2026-03-01' }],
    locations: [makeLocation({ id: 'new-loc' })],
    achievements: [makeAchievement({ id: 'new-ach' })],
  };

  await StorageService.importData(backup);

  assert.deepEqual(
    (await StorageService.getExercises()).map((e) => e.id),
    ['new-ex']
  );
  assert.deepEqual(
    (await StorageService.getSessions()).map((s) => s.id),
    ['new-ses']
  );
  assert.deepEqual(
    (await StorageService.getCollections()).map((c) => c.id),
    ['new-col']
  );
  assert.deepEqual(
    (await StorageService.getSchedules()).map((s) => s.id),
    ['new-sch']
  );
  assert.deepEqual(
    (await StorageService.getLocations()).map((l) => l.id),
    ['new-loc']
  );
  assert.deepEqual(
    (await StorageService.getAchievements()).map((a) => a.id),
    ['new-ach']
  );
  assert.equal((await StorageService.getSettings()).profileName, 'Imported');
});

test('storage: a real export can be re-imported without loss (round-trip)', async () => {
  await StorageService.saveExercise(makeExercise());
  await StorageService.saveCollection(makeCollection());
  await StorageService.saveSession(makeSession());
  await StorageService.saveSchedule(makeSchedule());
  await StorageService.saveLocation(makeLocation());
  await StorageService.saveMeasurement({ id: 'm-1', date: '2026-01-01', weightKg: 80 });
  await StorageService.saveAchievements([makeAchievement()]);

  const backup = await StorageService.exportData();

  await StorageService.resetAllData();
  await StorageService.importData(backup);

  const after = await StorageService.exportData();
  assert.equal(after.exercises.length, backup.exercises.length);
  assert.equal(after.collections.length, backup.collections.length);
  assert.equal(after.sessions.length, backup.sessions.length);
  assert.equal(after.schedules.length, backup.schedules.length);
  assert.equal(after.locations.length, backup.locations.length);
  assert.equal(after.measurements.length, backup.measurements.length);
  assert.equal(after.achievements.length, backup.achievements.length);
});

test('storage: an invalid backup is rejected before any data is touched', async () => {
  await StorageService.saveExercise(makeExercise({ id: 'keep-me', name: 'Keep Me' }));
  const before = await StorageService.exportData();

  // Missing/invalid version
  await assert.rejects(
    () =>
      StorageService.importData({
        version: 0,
        exportedAt: before.exportedAt,
        settings: before.settings,
        exercises: [],
        collections: [],
        sessions: [],
        schedules: [],
        measurements: [],
        locations: [],
        achievements: [],
      } as never),
    /version/i
  );

  // Structurally corrupt session (no id, no sets)
  await assert.rejects(
    () =>
      StorageService.importData({
        ...before,
        sessions: [{ broken: true }],
      } as never),
    /session/i
  );

  const after = await StorageService.exportData();
  assert.deepEqual(
    after.exercises.map((e) => e.id),
    ['keep-me'],
    'rejected imports must never clear or partially write the stores'
  );
  assert.equal(after.sessions.length, 0);
});

test('storage: exportCSV() escapes quotes and neutralizes formula injection', async () => {
  await StorageService.saveExercise(makeExercise({ id: 'ex-quote', name: 'Farmer"s Walk' }));
  await StorageService.saveSession(
    makeSession({
      id: 'ses-csv',
      collectionName: '=SUM(A1:A2)',
      locationName: '+1 Danger',
      sets: [
        { id: 's1', exerciseId: 'ex-quote', loadKg: 40, reps: 10, tag: 'normal', done: true },
        { id: 's2', exerciseId: 'ex-unknown', tag: 'warmup', done: false },
      ],
    })
  );

  const csv = await StorageService.exportCSV();
  const lines = csv.split('\n');

  assert.match(lines[0], /^Session Number,Date,Collection,Location,Exercise/);
  assert.ok(csv.includes('"\'=SUM(A1:A2)"'), 'leading = must be prefixed with a single quote');
  assert.ok(csv.includes('"\'+1 Danger"'), 'leading + must be neutralized');
  assert.ok(csv.includes('"Farmer""s Walk"'), 'embedded quotes must be doubled');
  assert.ok(csv.includes('"ex-unknown"'), 'unknown exercise ids fall back to the raw id');
  assert.equal(lines.length, 3, 'header plus one row per set');
});

test('storage: resetAllData() clears stores, settings and the active draft', async () => {
  await StorageService.saveSettings({ ...DEFAULT_SETTINGS, profileName: 'Nour' });
  await StorageService.saveExercise(makeExercise());
  await StorageService.saveActiveDraft({
    id: 'draft',
    startedAt: '2026-01-10T18:00:00.000Z',
    pausedMs: 0,
    isPaused: false,
    currentExerciseIndex: 0,
    sets: [],
    exercises: [],
  });

  await StorageService.resetAllData();

  assert.deepEqual(await StorageService.getExercises(), []);
  assert.equal((await StorageService.getSettings()).profileName, DEFAULT_SETTINGS.profileName);
  assert.equal(await StorageService.getActiveDraft(), null);
});
