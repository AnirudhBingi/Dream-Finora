import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationToken {
  token: string;
  deviceId: string;
}

/**
 * Request push notification permissions
 * Returns true if permission granted, false otherwise
 */
export async function requestPushNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting push notification permissions:', error);
    return false;
  }
}

/**
 * Get push notification token
 * Returns token string or null if not available
 */
export async function getPushNotificationToken(): Promise<string | null> {
  try {
    const hasPermission = await requestPushNotificationPermissions();
    if (!hasPermission) {
      console.log('[PushNotifications] Permission not granted, skipping token request');
      return null;
    }

    // Get project ID from Constants or environment
    // For Expo Go, this is usually available in Constants.expoConfig
    // For standalone builds, it should be in app.json or environment variable
    const projectId = 
      Constants.expoConfig?.extra?.eas?.projectId ||
      process.env.EXPO_PROJECT_ID ||
      Constants.expoConfig?.extra?.projectId;

    // Try to get token - Expo Go may not have projectId, which is fine for development
    let tokenData;
    try {
      if (projectId) {
        tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      } else {
        // Try without projectId first (for Expo Go)
        tokenData = await Notifications.getExpoPushTokenAsync();
      }
      return tokenData.data;
    } catch (tokenError: any) {
      // If projectId is missing and that's the error, log and return null
      // This is expected in Expo Go development mode
      if (tokenError?.message?.includes('projectId')) {
        console.log('[PushNotifications] projectId not available (Expo Go mode) - push notifications disabled for development');
        return null;
      }
      // Re-throw other errors
      throw tokenError;
    }
  } catch (error) {
    console.error('[PushNotifications] Error getting push notification token:', error);
    return null;
  }
}

/**
 * Register device for push notifications
 * Should be called after user logs in
 */
export async function registerDeviceForPushNotifications(): Promise<PushNotificationToken | null> {
  try {
    const token = await getPushNotificationToken();
    if (!token) {
      return null;
    }

    return {
      token,
      deviceId: '', // Device ID not needed for Expo push notifications
    };
  } catch (error) {
    console.error('Error registering device for push notifications:', error);
    return null;
  }
}

/**
 * Set up notification listeners
 * Call this when app starts to handle notification taps
 */
export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationTapped: (notification: Notifications.NotificationResponse) => void,
) {
  // Listener for notifications received while app is in foreground
  const receivedListener = Notifications.addNotificationReceivedListener(onNotificationReceived);

  // Listener for when user taps on a notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationTapped);

  return () => {
    receivedListener.remove();
    responseListener.remove();
  };
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Show immediately
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

