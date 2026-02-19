import AsyncStorage from '@react-native-async-storage/async-storage';
import { Climb, Session, SessionMetadata, AppSettings } from '../types';

// Legacy key (single blob — used for migration)
const LEGACY_CLIMBS_KEY = 'climbs';

// Sharded climb storage keys
const CLIMB_SESSION_PREFIX = 'climbs_s_';
const CLIMB_INDEX_KEY = 'climbSessionIndex';

const SESSION_KEY = 'activeSession';
const SESSIONS_KEY = 'sessions';
const SETTINGS_KEY = 'appSettings';

const DEFAULT_SETTINGS: AppSettings = {
  grades: {
    boulderSystem: 'vscale',
    routeSystem: 'yds',
  },
};

// ============================================
// SHARDED CLIMB STORAGE
// ============================================

export async function loadClimbIndex(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(CLIMB_INDEX_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading climb index:', error);
    return [];
  }
}

export async function saveClimbIndex(sessionIds: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CLIMB_INDEX_KEY, JSON.stringify(sessionIds));
  } catch (error) {
    console.error('Error saving climb index:', error);
  }
}

export async function saveClimbsForSession(sessionId: string, climbs: Climb[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CLIMB_SESSION_PREFIX + sessionId, JSON.stringify(climbs));
  } catch (error) {
    console.error('Error saving climbs for session:', error);
  }
}

export async function loadClimbsForSession(sessionId: string): Promise<Climb[]> {
  try {
    const data = await AsyncStorage.getItem(CLIMB_SESSION_PREFIX + sessionId);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading climbs for session:', error);
    return [];
  }
}

export async function deleteClimbsForSession(sessionId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CLIMB_SESSION_PREFIX + sessionId);
  } catch (error) {
    console.error('Error deleting climbs for session:', error);
  }
}

/**
 * Load all climbs from sharded storage. If legacy single-blob format exists,
 * migrates to sharded format automatically.
 */
export async function loadAllClimbs(): Promise<Climb[]> {
  try {
    // Check for legacy format and migrate if needed
    const legacyData = await AsyncStorage.getItem(LEGACY_CLIMBS_KEY);
    if (legacyData) {
      const legacyClimbs: Climb[] = JSON.parse(legacyData);
      if (legacyClimbs.length > 0) {
        await migrateToShardedStorage(legacyClimbs);
      }
      await AsyncStorage.removeItem(LEGACY_CLIMBS_KEY);

      return legacyClimbs;
    }

    // Load from sharded format
    const sessionIds = await loadClimbIndex();
    if (sessionIds.length === 0) return [];

    const chunks = await Promise.all(sessionIds.map(loadClimbsForSession));
    return chunks.flat();
  } catch (error) {
    console.error('Error loading all climbs:', error);
    return [];
  }
}

async function migrateToShardedStorage(climbs: Climb[]): Promise<void> {
  // Group climbs by sessionId
  const bySession = new Map<string, Climb[]>();
  for (const climb of climbs) {
    const existing = bySession.get(climb.sessionId) || [];
    existing.push(climb);
    bySession.set(climb.sessionId, existing);
  }

  // Save each session's climbs
  const sessionIds = [...bySession.keys()];
  await Promise.all(
    sessionIds.map((sid) => saveClimbsForSession(sid, bySession.get(sid)!))
  );
  await saveClimbIndex(sessionIds);
}

/**
 * Save all climbs by sharding into per-session keys.
 * Used after sync when the full dataset is replaced.
 */
export async function saveAllClimbs(climbs: Climb[]): Promise<void> {
  try {
    // Remove old sharded keys first
    const oldSessionIds = await loadClimbIndex();
    if (oldSessionIds.length > 0) {
      await AsyncStorage.multiRemove(oldSessionIds.map((id) => CLIMB_SESSION_PREFIX + id));
    }

    // Group and save
    const bySession = new Map<string, Climb[]>();
    for (const climb of climbs) {
      const existing = bySession.get(climb.sessionId) || [];
      existing.push(climb);
      bySession.set(climb.sessionId, existing);
    }

    const sessionIds = [...bySession.keys()];
    await Promise.all(
      sessionIds.map((sid) => saveClimbsForSession(sid, bySession.get(sid)!))
    );
    await saveClimbIndex(sessionIds);
  } catch (error) {
    console.error('Error saving all climbs:', error);
  }
}

export async function clearAllClimbs(): Promise<void> {
  try {
    // Clear legacy key if it exists
    await AsyncStorage.removeItem(LEGACY_CLIMBS_KEY);

    // Clear sharded keys
    const sessionIds = await loadClimbIndex();
    if (sessionIds.length > 0) {
      await AsyncStorage.multiRemove(sessionIds.map((id) => CLIMB_SESSION_PREFIX + id));
    }
    await AsyncStorage.removeItem(CLIMB_INDEX_KEY);
  } catch (error) {
    console.error('Error clearing all climbs:', error);
  }
}

// ============================================
// ACTIVE SESSION
// ============================================

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

// ============================================
// SESSION METADATA
// ============================================

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

// ============================================
// SETTINGS
// ============================================

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
