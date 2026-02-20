import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

class NotificationService {
  private userId: string | null = null;

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  /**
   * Request notification permissions and register the push token with Supabase.
   * Returns the Expo push token string, or null if permission denied or unavailable.
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!this.userId) return null;

    // Push notifications only work on physical devices
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = tokenData.data;

    // Upsert token to Supabase
    const { error } = await supabase.from('notification_tokens').upsert(
      {
        user_id: this.userId,
        expo_push_token: expoPushToken,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,expo_push_token' }
    );

    if (error) {
      console.error('Error registering push token:', error);
      return null;
    }

    return expoPushToken;
  }

  /**
   * Unregister the current device's push token (e.g., on sign out).
   */
  async unregisterPushToken(): Promise<void> {
    if (!this.userId) return;

    try {
      if (!Device.isDevice) return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const expoPushToken = tokenData.data;

      await supabase
        .from('notification_tokens')
        .delete()
        .eq('user_id', this.userId)
        .eq('expo_push_token', expoPushToken);
    } catch (error) {
      console.error('Error unregistering push token:', error);
    }
  }

  /**
   * Configure the Android notification channel (required for Android).
   */
  async configureNotificationChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  }
}

export const notificationService = new NotificationService();
