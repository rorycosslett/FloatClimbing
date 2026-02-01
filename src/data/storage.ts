import AsyncStorage from '@react-native-async-storage/async-storage';
import { Climb, Session, SessionMetadata, AppSettings } from '../types';

const CLIMBS_KEY = 'climbs';
const SESSION_KEY = 'activeSession';
const SESSIONS_KEY = 'sessions';
const SETTINGS_KEY = 'appSettings';

const DEFAULT_SETTINGS: AppSettings = {
  grades: {
    boulderSystem: 'vscale',
    routeSystem: 'yds',
  },
};

export async function loadClimbs(): Promise<Climb[]> {
  try {
    const data = await AsyncStorage.getItem(CLIMBS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading climbs:', error);
    return [];
  }
}

export async function saveClimbs(climbs: Climb[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CLIMBS_KEY, JSON.stringify(climbs));
  } catch (error) {
    console.error('Error saving climbs:', error);
  }
}

export async function clearClimbs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CLIMBS_KEY);
  } catch (error) {
    console.error('Error clearing climbs:', error);
  }
}

export async function loadSession(): Promise<Session | null> {
  try {
    const data = await AsyncStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading session:', error);
    return null;
  }
}

export async function saveSession(session: Session | null): Promise<void> {
  try {
    if (session) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

export async function loadSessionMetadata(): Promise<Record<string, SessionMetadata>> {
  try {
    const data = await AsyncStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error loading session metadata:', error);
    return {};
  }
}

export async function saveSessionMetadata(
  metadata: Record<string, SessionMetadata>
): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('Error saving session metadata:', error);
  }
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}
