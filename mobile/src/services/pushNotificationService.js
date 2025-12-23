/**
 * Push Notification Service
 *
 * Handles Firebase Cloud Messaging (FCM) for push notifications.
 * Uses @notifee/react-native for local notification display.
 */

import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationAPI } from './api';

// Storage keys
const FCM_TOKEN_KEY = '@fcm_token';
const NOTIFICATION_PERMISSION_KEY = '@notification_permission_requested';

/**
 * Notification channel IDs for Android
 */
export const NOTIFICATION_CHANNELS = {
  DEFAULT: 'default',
  GOALS: 'goals',
  WELLNESS: 'wellness',
  CARE_CIRCLE: 'care_circle',
  CHECK_IN_REMINDERS: 'check_in_reminders',
};

class PushNotificationService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize the push notification service
   * Call this once on app startup
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create notification channels for Android
      await this.createNotificationChannels();

      // Set up background message handler
      this.setBackgroundHandler();

      this.isInitialized = true;
      console.log('[PushNotificationService] Initialized successfully');
    } catch (error) {
      console.error('[PushNotificationService] Initialization error:', error);
    }
  }

  /**
   * Create Android notification channels
   * Must be called before displaying any notifications
   */
  async createNotificationChannels() {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      await notifee.createChannel({
        id: NOTIFICATION_CHANNELS.DEFAULT,
        name: 'General Notifications',
        description: 'General app notifications',
        importance: AndroidImportance.DEFAULT,
        vibration: true,
      });

      await notifee.createChannel({
        id: NOTIFICATION_CHANNELS.GOALS,
        name: 'Goal Reminders',
        description: 'Reminders about your wellness goals',
        importance: AndroidImportance.HIGH,
        vibration: true,
      });

      await notifee.createChannel({
        id: NOTIFICATION_CHANNELS.WELLNESS,
        name: 'Wellness Insights',
        description: 'Pattern insights and wellness suggestions',
        importance: AndroidImportance.DEFAULT,
        vibration: true,
      });

      await notifee.createChannel({
        id: NOTIFICATION_CHANNELS.CARE_CIRCLE,
        name: 'Care Circle Alerts',
        description: 'Notifications from your Care Circle',
        importance: AndroidImportance.HIGH,
        vibration: true,
      });

      await notifee.createChannel({
        id: NOTIFICATION_CHANNELS.CHECK_IN_REMINDERS,
        name: 'Check-in Reminders',
        description: 'Daily mood check-in reminders',
        importance: AndroidImportance.HIGH,
        vibration: true,
      });

      console.log('[PushNotificationService] Notification channels created');
    } catch (error) {
      console.error('[PushNotificationService] Error creating channels:', error);
    }
  }

  /**
   * Request notification permissions from the user
   * @returns {Promise<boolean>} Whether permission was granted
   */
  async requestPermission() {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      // Store that we've requested permission
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');

      console.log('[PushNotificationService] Permission status:', authStatus, 'enabled:', enabled);
      return enabled;
    } catch (error) {
      console.error('[PushNotificationService] Permission request error:', error);
      return false;
    }
  }

  /**
   * Check if we've already requested notification permission
   * @returns {Promise<boolean>}
   */
  async hasRequestedPermission() {
    const requested = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_KEY);
    return requested === 'true';
  }

  /**
   * Check current permission status
   * @returns {Promise<boolean>}
   */
  async checkPermission() {
    try {
      const authStatus = await messaging().hasPermission();
      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    } catch (error) {
      console.error('[PushNotificationService] Check permission error:', error);
      return false;
    }
  }

  /**
   * Get the FCM device token and register with backend
   * @returns {Promise<string|null>} The FCM token
   */
  async registerDevice() {
    try {
      // Get FCM token
      const token = await messaging().getToken();

      if (!token) {
        console.warn('[PushNotificationService] No FCM token available');
        return null;
      }

      // Check if token changed
      const storedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      if (storedToken === token) {
        console.log('[PushNotificationService] Token unchanged, skipping registration');
        return token;
      }

      // Register with backend
      await notificationAPI.registerDevice(token, Platform.OS);

      // Store token locally
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);

      console.log('[PushNotificationService] Device registered successfully');
      return token;
    } catch (error) {
      console.error('[PushNotificationService] Device registration error:', error);
      return null;
    }
  }

  /**
   * Unregister device from push notifications
   * Call this on logout
   */
  async unregisterDevice() {
    try {
      const token = await AsyncStorage.getItem(FCM_TOKEN_KEY);

      if (token) {
        await notificationAPI.unregisterDevice(token);
        await AsyncStorage.removeItem(FCM_TOKEN_KEY);
        console.log('[PushNotificationService] Device unregistered');
      }
    } catch (error) {
      console.error('[PushNotificationService] Unregister error:', error);
    }
  }

  /**
   * Subscribe to FCM token refresh events
   * @param {Function} callback - Called when token refreshes
   * @returns {Function} Unsubscribe function
   */
  onTokenRefresh(callback) {
    return messaging().onTokenRefresh(async (token) => {
      try {
        // Register new token with backend
        await notificationAPI.registerDevice(token, Platform.OS);

        // Update stored token
        await AsyncStorage.setItem(FCM_TOKEN_KEY, token);

        console.log('[PushNotificationService] Token refreshed');
        callback?.(token);
      } catch (error) {
        console.error('[PushNotificationService] Token refresh error:', error);
      }
    });
  }

  /**
   * Handle foreground messages
   * Displays notifications using Notifee when app is in foreground
   * @param {Function} callback - Called with remote message data
   * @returns {Function} Unsubscribe function
   */
  onForegroundMessage(callback) {
    return messaging().onMessage(async (remoteMessage) => {
      console.log('[PushNotificationService] Foreground message:', remoteMessage);

      // Display notification using Notifee
      await this.displayNotification(remoteMessage);

      callback?.(remoteMessage);
    });
  }

  /**
   * Display a notification using Notifee
   * @param {Object} remoteMessage - FCM remote message
   */
  async displayNotification(remoteMessage) {
    try {
      const { notification, data } = remoteMessage;

      // Determine the appropriate channel based on notification type
      let channelId = NOTIFICATION_CHANNELS.DEFAULT;
      if (data?.type === 'goal') {
        channelId = NOTIFICATION_CHANNELS.GOALS;
      } else if (data?.type === 'wellness' || data?.type === 'pattern') {
        channelId = NOTIFICATION_CHANNELS.WELLNESS;
      } else if (data?.type === 'care_circle') {
        channelId = NOTIFICATION_CHANNELS.CARE_CIRCLE;
      } else if (data?.type === 'check_in') {
        channelId = NOTIFICATION_CHANNELS.CHECK_IN_REMINDERS;
      }

      await notifee.displayNotification({
        title: notification?.title || 'SoulBloom',
        body: notification?.body || '',
        data: data || {},
        android: {
          channelId,
          smallIcon: 'ic_notification', // Add this icon to android/app/src/main/res/
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
      });
    } catch (error) {
      console.error('[PushNotificationService] Display notification error:', error);
    }
  }

  /**
   * Set up background message handler
   * Must be called outside of React component lifecycle
   */
  setBackgroundHandler() {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('[PushNotificationService] Background message:', remoteMessage);

      // Background messages are automatically displayed by FCM
      // This handler is for any additional processing needed
    });
  }

  /**
   * Handle notification tap events
   * @param {Function} callback - Called with notification data
   * @returns {Function} Unsubscribe function
   */
  onNotificationTap(callback) {
    // Handle app opened from quit state via FCM
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('[PushNotificationService] Opened from quit state:', remoteMessage);
          callback?.(remoteMessage);
        }
      });

    // Handle app opened from background state via FCM
    const unsubscribeFCM = messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('[PushNotificationService] Opened from background:', remoteMessage);
      callback?.(remoteMessage);
    });

    // Handle Notifee notification events
    const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('[PushNotificationService] Notifee notification pressed:', detail);
        callback?.({ data: detail.notification?.data });
      }
    });

    // Return combined unsubscribe function
    return () => {
      unsubscribeFCM();
      unsubscribeNotifee();
    };
  }

  /**
   * Get the stored FCM token
   * @returns {Promise<string|null>}
   */
  async getStoredToken() {
    return AsyncStorage.getItem(FCM_TOKEN_KEY);
  }

  /**
   * Schedule a local notification
   * @param {Object} options - Notification options
   */
  async scheduleLocalNotification({ title, body, data, triggerTime, channelId = NOTIFICATION_CHANNELS.DEFAULT }) {
    try {
      await notifee.createTriggerNotification(
        {
          title,
          body,
          data,
          android: {
            channelId,
            smallIcon: 'ic_notification',
          },
        },
        {
          type: notifee.TriggerType.TIMESTAMP,
          timestamp: triggerTime,
        }
      );
      console.log('[PushNotificationService] Local notification scheduled');
    } catch (error) {
      console.error('[PushNotificationService] Schedule notification error:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllScheduledNotifications() {
    try {
      await notifee.cancelAllNotifications();
      console.log('[PushNotificationService] All notifications cancelled');
    } catch (error) {
      console.error('[PushNotificationService] Cancel notifications error:', error);
    }
  }
}

export default new PushNotificationService();
