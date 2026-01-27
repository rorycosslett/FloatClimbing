import AsyncStorage from '@react-native-async-storage/async-storage';
import { Climb } from '../types';

const CLIMBS_KEY = 'climbs';

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
