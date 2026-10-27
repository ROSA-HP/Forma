import { openDB, IDBPDatabase } from 'idb';
import { 
  Exercise, 
  Collection, 
  Session, 
  Schedule, 
  BodyMeasurement, 
  Location, 
  Achievement, 
  Settings, 
  ActiveSessionDraft 
} from '../types/index.ts';
import { DEFAULT_SETTINGS } from '../domain/constants.ts';
import { validateImportPayload, escapeCSVCell } from '../domain/dataTransfer.ts';

const DB_NAME = 'trainlog_db';
const DB_VERSION = 1;

export interface StorageExportData {
  version: number;
  exportedAt: string;
  settings: Settings;
  exercises: Exercise[];
  collections: Collection[];
  sessions: Session[];
  schedules: Schedule[];
  measurements: BodyMeasurement[];
  locations: Location[];
  achievements: Achievement[];
}

export interface IStorageService {
  init(): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  
  getExercises(): Promise<Exercise[]>;
  saveExercise(exercise: Exercise): Promise<void>;
  deleteExercise(id: string): Promise<void>;
  
  getCollections(): Promise<Collection[]>;
  saveCollection(collection: Collection): Promise<void>;
  deleteCollection(id: string): Promise<void>;
  
  getSessions(): Promise<Session[]>;
  saveSession(session: Session): Promise<void>;
  deleteSession(id: string): Promise<void>;
  
  getSchedules(): Promise<Schedule[]>;
  saveSchedule(schedule: Schedule): Promise<void>;
  deleteSchedule(id: string): Promise<void>;
  
  getMeasurements(): Promise<BodyMeasurement[]>;
  saveMeasurement(measurement: BodyMeasurement): Promise<void>;
  deleteMeasurement(id: string): Promise<void>;
  
  getLocations(): Promise<Location[]>;
  saveLocation(location: Location): Promise<void>;
  deleteLocation(id: string): Promise<void>;
  
  getAchievements(): Promise<Achievement[]>;
  saveAchievements(achievements: Achievement[]): Promise<void>;
  
  getActiveDraft(): Promise<ActiveSessionDraft | null>;
  saveActiveDraft(draft: ActiveSessionDraft | null): Promise<void>;
  
  exportData(): Promise<StorageExportData>;
  importData(data: StorageExportData): Promise<void>;
  exportCSV(): Promise<string>;
  resetAllData(): Promise<void>;
}

class WebStorageService implements IStorageService {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  async init(): Promise<void> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('exercises')) {
            db.createObjectStore('exercises', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('collections')) {
            db.createObjectStore('collections', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('sessions')) {
            db.createObjectStore('sessions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('schedules')) {
            db.createObjectStore('schedules', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('measurements')) {
            db.createObjectStore('measurements', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('locations')) {
            db.createObjectStore('locations', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('achievements')) {
            db.createObjectStore('achievements', { keyPath: 'id' });
          }
        }
      });
    }
    await this.dbPromise;
  }

  private async getDB(): Promise<IDBPDatabase> {
    await this.init();
    return this.dbPromise!;
  }

  async getSettings(): Promise<Settings> {
    try {
      const raw = localStorage.getItem('trainlog_settings');
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  }

  async saveSettings(settings: Settings): Promise<void> {
    localStorage.setItem('trainlog_settings', JSON.stringify(settings));
  }

  async getExercises(): Promise<Exercise[]> {
    const db = await this.getDB();
    return db.getAll('exercises');
  }

  async saveExercise(exercise: Exercise): Promise<void> {
    const db = await this.getDB();
    await db.put('exercises', exercise);
  }

  async deleteExercise(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('exercises', id);
  }

  async getCollections(): Promise<Collection[]> {
    const db = await this.getDB();
    return db.getAll('collections');
  }

  async saveCollection(collection: Collection): Promise<void> {
    const db = await this.getDB();
    await db.put('collections', collection);
  }

  async deleteCollection(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('collections', id);
  }

  async getSessions(): Promise<Session[]> {
    const db = await this.getDB();
    const sessions: Session[] = await db.getAll('sessions');
    return sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async saveSession(session: Session): Promise<void> {
    const db = await this.getDB();
    await db.put('sessions', session);
  }

  async deleteSession(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('sessions', id);
  }

  async getSchedules(): Promise<Schedule[]> {
    const db = await this.getDB();
    return db.getAll('schedules');
  }

  async saveSchedule(schedule: Schedule): Promise<void> {
    const db = await this.getDB();
    await db.put('schedules', schedule);
  }

  async deleteSchedule(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('schedules', id);
  }

  async getMeasurements(): Promise<BodyMeasurement[]> {
    const db = await this.getDB();
    const list: BodyMeasurement[] = await db.getAll('measurements');
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async saveMeasurement(measurement: BodyMeasurement): Promise<void> {
    const db = await this.getDB();
    await db.put('measurements', measurement);
  }

  async deleteMeasurement(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('measurements', id);
  }

  async getLocations(): Promise<Location[]> {
    const db = await this.getDB();
    return db.getAll('locations');
  }

  async saveLocation(location: Location): Promise<void> {
    const db = await this.getDB();
    await db.put('locations', location);
  }

  async deleteLocation(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('locations', id);
  }

  async getAchievements(): Promise<Achievement[]> {
    const db = await this.getDB();
    return db.getAll('achievements');
  }

  async saveAchievements(achievements: Achievement[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('achievements', 'readwrite');
    for (const a of achievements) {
      await tx.store.put(a);
    }
    await tx.done;
  }

  async getActiveDraft(): Promise<ActiveSessionDraft | null> {
    try {
      const raw = localStorage.getItem('trainlog_active_draft');
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return null;
  }

  async saveActiveDraft(draft: ActiveSessionDraft | null): Promise<void> {
    if (draft) {
      localStorage.setItem('trainlog_active_draft', JSON.stringify(draft));
    } else {
      localStorage.removeItem('trainlog_active_draft');
    }
  }

  async exportData(): Promise<StorageExportData> {
    const settings = await this.getSettings();
    const exercises = await this.getExercises();
    const collections = await this.getCollections();
    const sessions = await this.getSessions();
    const schedules = await this.getSchedules();
    const measurements = await this.getMeasurements();
    const locations = await this.getLocations();
    const achievements = await this.getAchievements();

    return {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      settings,
      exercises,
      collections,
      sessions,
      schedules,
      measurements,
      locations,
      achievements
    };
  }

  async importData(data: StorageExportData): Promise<void> {
    // 1. Fully validate version and every record's types/fields BEFORE touching any data
    const validation = validateImportPayload(data);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid backup file format');
    }

    const db = await this.getDB();
    
    // 2. Write all object stores within ONE atomic transaction
    const stores = [
      'exercises', 'collections', 'sessions', 'schedules', 'measurements', 'locations', 'achievements'
    ] as const;

    const tx = db.transaction(stores, 'readwrite');

    for (const storeName of stores) {
      const store = tx.objectStore(storeName);
      await store.clear();
      const records = (data as any)[storeName];
      if (Array.isArray(records)) {
        for (const item of records) {
          await store.put(item);
        }
      }
    }

    await tx.done;

    // 3. Save settings after database transaction succeeds
    if (data.settings) {
      await this.saveSettings(data.settings);
    }
  }

  async exportCSV(): Promise<string> {
    const sessions = await this.getSessions();
    const exercises = await this.getExercises();
    const exMap = new Map(exercises.map(e => [e.id, e.name]));

    const rows: string[] = [
      'Session Number,Date,Collection,Location,Exercise,Set,Load Kg,Reps,Duration Sec,Distance M,RPE,Tag,Done'
    ];

    for (const s of sessions) {
      const date = s.startedAt.split('T')[0];
      const coll = s.collectionName || 'Custom Workout';
      const loc = s.locationName || '';

      s.sets.forEach((set, idx) => {
        const exName = exMap.get(set.exerciseId) || set.exerciseId;
        rows.push([
          s.number,
          escapeCSVCell(date),
          escapeCSVCell(coll),
          escapeCSVCell(loc),
          escapeCSVCell(exName),
          idx + 1,
          set.loadKg !== undefined ? escapeCSVCell(set.loadKg) : '""',
          set.reps !== undefined ? escapeCSVCell(set.reps) : '""',
          set.durationSec !== undefined ? escapeCSVCell(set.durationSec) : '""',
          set.distanceM !== undefined ? escapeCSVCell(set.distanceM) : '""',
          set.rpe !== undefined ? escapeCSVCell(set.rpe) : '""',
          escapeCSVCell(set.tag),
          escapeCSVCell(set.done ? 'true' : 'false')
        ].join(','));
      });
    }

    return rows.join('\n');
  }

  async resetAllData(): Promise<void> {
    const db = await this.getDB();
    const stores = ['exercises', 'collections', 'sessions', 'schedules', 'measurements', 'locations', 'achievements'];
    for (const s of stores) {
      const tx = db.transaction(s as any, 'readwrite');
      await tx.store.clear();
      await tx.done;
    }
    localStorage.removeItem('trainlog_settings');
    localStorage.removeItem('trainlog_active_draft');
  }
}

export const StorageService: IStorageService = new WebStorageService();
