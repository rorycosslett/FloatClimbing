import AsyncStorage from '@react-native-async-storage/async-storage';
import { Climb, Session } from '../types';

const CLIMBS_KEY = 'climbs';
const SESSION_KEY = 'activeSession';

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
