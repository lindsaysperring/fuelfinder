import type { RouteSettings, UserSettings } from '@/types';

const STORAGE_KEY = 'petrol-finder-settings';
const ROUTE_STORAGE_KEY = 'petrol-finder-route-settings';

// Check if localStorage is available and functional
function isLocalStorageAvailable(): boolean {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) {
      return false;
    }
    // Check if localStorage has the required methods
    if (
      typeof localStorage.getItem !== 'function' ||
      typeof localStorage.setItem !== 'function' ||
      typeof localStorage.removeItem !== 'function'
    ) {
      return false;
    }
    // Test if we can actually use it
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function saveSettings(settings: UserSettings): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Silent fail - localStorage might not be available
  }
}

export function loadSettings(): UserSettings | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as UserSettings;
  } catch {
    // Silent fail - localStorage might not be available or data corrupted
    return null;
  }
}

export function clearSettings(): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silent fail - localStorage might not be available
  }
}

export function getSetting<T>(key: keyof UserSettings, defaultValue: T): T {
  if (!isLocalStorageAvailable()) return defaultValue;
  try {
    const settings = loadSettings();
    if (!settings) return defaultValue;
    return (settings[key] as unknown as T) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

const DEFAULT_ROUTE_SETTINGS: RouteSettings = {
  start: { type: 'current' },
  end: { type: 'home' },
  detourToleranceKm: 5,
  arriveFullEnabled: false,
};

export function saveRouteSettings(settings: RouteSettings): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Silent fail
  }
}

export function loadRouteSettings(): RouteSettings {
  if (!isLocalStorageAvailable()) return DEFAULT_ROUTE_SETTINGS;
  try {
    const saved = localStorage.getItem(ROUTE_STORAGE_KEY);
    if (!saved) return DEFAULT_ROUTE_SETTINGS;
    return { ...DEFAULT_ROUTE_SETTINGS, ...JSON.parse(saved) } as RouteSettings;
  } catch {
    return DEFAULT_ROUTE_SETTINGS;
  }
}
