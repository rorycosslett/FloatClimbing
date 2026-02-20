import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import * as Notifications from 'expo-notifications';
import { type EventSubscription } from 'expo-modules-core';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';

// Show notifications when app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface NotificationContextType {
  expoPushToken: string | null;
  requestPermissions: () => Promise<string | null>;
  disableNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isGuest } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  // Register token when authenticated (non-guest) user is present
  useEffect(() => {
    notificationService.setUserId(user?.id || null);

    if (user && !isGuest) {
      notificationService.configureNotificationChannel();
      notificationService.registerForPushNotifications().then((token) => {
        setExpoPushToken(token);
      });
    } else {
      setExpoPushToken(null);
    }
  }, [user?.id, isGuest]);

  // Set up notification listeners
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response.notification.request.content.data);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const requestPermissions = useCallback(async () => {
    const token = await notificationService.registerForPushNotifications();
    setExpoPushToken(token);
    return token;
  }, []);

  const disableNotifications = useCallback(async () => {
    await notificationService.unregisterPushToken();
    setExpoPushToken(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ expoPushToken, requestPermissions, disableNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
