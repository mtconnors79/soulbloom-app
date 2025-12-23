/**
 * Push Notification Service
 *
 * Handles sending push notifications via Firebase Cloud Messaging (FCM).
 * Features:
 * - Device token management
 * - Quiet hours enforcement
 * - Daily notification limits
 * - Per-type frequency caps
 * - Notification logging
 */

const { messaging } = require('../config/firebase-admin');
const { sequelize } = require('../config/sequelize');
const { QueryTypes } = require('sequelize');

/**
 * Notification channel mapping
 */
const NOTIFICATION_CHANNELS = {
  pattern_intervention: 'wellness',
  goal_reminders: 'goals',
  streak_reminders: 'goals',
  care_circle_alerts: 'care_circle',
  check_in_reminders: 'check_in_reminders',
  re_engagement: 'default',
  default: 'default',
};

/**
 * Default notification preferences
 */
const DEFAULT_PREFERENCES = {
  pattern_intervention: true,
  goal_reminders: true,
  streak_reminders: true,
  care_circle_alerts: true,
  check_in_reminders: true,
  re_engagement: true,
  quiet_hours_enabled: true,
  quiet_hours_start: '21:00',
  quiet_hours_end: '08:00',
  daily_limit: 5,
  timezone: 'America/New_York',
};

class PushNotificationService {
  constructor() {
    this.messaging = messaging;
  }

  /**
   * Check if FCM is available
   */
  isAvailable() {
    return this.messaging !== null;
  }

  /**
   * Register a device token for a user
   */
  async registerDevice(userId, token, platform) {
    try {
      await sequelize.query(
        `INSERT INTO user_device_tokens (user_id, token, platform, is_active, last_used_at, updated_at)
         VALUES (:userId, :token, :platform, true, NOW(), NOW())
         ON CONFLICT (user_id, token)
         DO UPDATE SET is_active = true, last_used_at = NOW(), updated_at = NOW()`,
        {
          replacements: { userId, token, platform },
          type: QueryTypes.INSERT,
        }
      );
      console.log(`[PushNotification] Device registered for user ${userId} (${platform})`);
      return { success: true };
    } catch (error) {
      console.error('[PushNotification] Register device error:', error.message);
      throw error;
    }
  }

  /**
   * Unregister a device token
   */
  async unregisterDevice(userId, token) {
    try {
      await sequelize.query(
        `UPDATE user_device_tokens
         SET is_active = false, updated_at = NOW()
         WHERE user_id = :userId AND token = :token`,
        {
          replacements: { userId, token },
          type: QueryTypes.UPDATE,
        }
      );
      console.log(`[PushNotification] Device unregistered for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('[PushNotification] Unregister device error:', error.message);
      throw error;
    }
  }

  /**
   * Get all active device tokens for a user
   */
  async getActiveTokens(userId) {
    try {
      const tokens = await sequelize.query(
        `SELECT token, platform FROM user_device_tokens
         WHERE user_id = :userId AND is_active = true`,
        {
          replacements: { userId },
          type: QueryTypes.SELECT,
        }
      );
      return tokens;
    } catch (error) {
      console.error('[PushNotification] Get tokens error:', error.message);
      return [];
    }
  }

  /**
   * Get user's notification preferences
   */
  async getUserPreferences(userId) {
    try {
      const result = await sequelize.query(
        `SELECT notification_preferences FROM users WHERE id = :userId`,
        {
          replacements: { userId },
          type: QueryTypes.SELECT,
        }
      );
      return result[0]?.notification_preferences || DEFAULT_PREFERENCES;
    } catch (error) {
      console.error('[PushNotification] Get preferences error:', error.message);
      return DEFAULT_PREFERENCES;
    }
  }

  /**
   * Update user's notification preferences
   */
  async updateUserPreferences(userId, preferences) {
    try {
      // Merge with existing preferences
      const current = await this.getUserPreferences(userId);
      const updated = { ...current, ...preferences };

      await sequelize.query(
        `UPDATE users SET notification_preferences = :preferences WHERE id = :userId`,
        {
          replacements: { userId, preferences: JSON.stringify(updated) },
          type: QueryTypes.UPDATE,
        }
      );
      return updated;
    } catch (error) {
      console.error('[PushNotification] Update preferences error:', error.message);
      throw error;
    }
  }

  /**
   * Check if notification can be sent based on preferences and limits
   */
  async canSendNotification(userId, notificationType) {
    try {
      const prefs = await this.getUserPreferences(userId);

      // Check if notification type is enabled
      if (prefs[notificationType] === false) {
        return { allowed: false, reason: 'disabled' };
      }

      // Check quiet hours
      if (prefs.quiet_hours_enabled) {
        const isQuiet = this.isInQuietHours(
          prefs.timezone,
          prefs.quiet_hours_start,
          prefs.quiet_hours_end
        );
        if (isQuiet) {
          return { allowed: false, reason: 'quiet_hours' };
        }
      }

      // Check daily limit
      const dailyLimit = prefs.daily_limit || 5;
      const todayCount = await sequelize.query(
        `SELECT COUNT(*) as count FROM notification_log
         WHERE user_id = :userId AND sent_at > NOW() - INTERVAL '24 hours'
         AND status = 'sent'`,
        {
          replacements: { userId },
          type: QueryTypes.SELECT,
        }
      );

      if (parseInt(todayCount[0].count) >= dailyLimit) {
        return { allowed: false, reason: 'daily_limit' };
      }

      // Check per-type limit (max 1 of each type per 12 hours)
      const typeCount = await sequelize.query(
        `SELECT COUNT(*) as count FROM notification_log
         WHERE user_id = :userId AND notification_type = :notificationType
         AND sent_at > NOW() - INTERVAL '12 hours'
         AND status = 'sent'`,
        {
          replacements: { userId, notificationType },
          type: QueryTypes.SELECT,
        }
      );

      if (parseInt(typeCount[0].count) >= 1) {
        return { allowed: false, reason: 'type_limit' };
      }

      return { allowed: true };
    } catch (error) {
      console.error('[PushNotification] Can send check error:', error.message);
      // Default to allowing on error
      return { allowed: true };
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  isInQuietHours(timezone, startTime, endTime) {
    try {
      const now = new Date();
      const options = { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false };
      const userTime = now.toLocaleTimeString('en-US', options);

      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const [nowHour, nowMin] = userTime.split(':').map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const nowMinutes = nowHour * 60 + nowMin;

      // Handle overnight quiet hours (e.g., 21:00 - 08:00)
      if (startMinutes > endMinutes) {
        return nowMinutes >= startMinutes || nowMinutes < endMinutes;
      }

      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    } catch (error) {
      console.error('[PushNotification] Quiet hours check error:', error.message);
      return false;
    }
  }

  /**
   * Get Android channel ID for notification type
   */
  getChannelId(notificationType) {
    return NOTIFICATION_CHANNELS[notificationType] || NOTIFICATION_CHANNELS.default;
  }

  /**
   * Send notification to a specific user
   */
  async sendToUser(userId, notificationType, title, body, data = {}) {
    if (!this.isAvailable()) {
      console.warn('[PushNotification] FCM not available, skipping notification');
      return { success: false, reason: 'fcm_unavailable' };
    }

    try {
      // Check if notification is allowed
      const canSend = await this.canSendNotification(userId, notificationType);
      if (!canSend.allowed) {
        console.log(`[PushNotification] Blocked for user ${userId}: ${canSend.reason}`);
        await this.logNotification(userId, notificationType, title, body, data, 'blocked', {
          reason: canSend.reason,
        });
        return { success: false, reason: canSend.reason };
      }

      // Get active device tokens
      const tokens = await this.getActiveTokens(userId);
      if (tokens.length === 0) {
        console.log(`[PushNotification] No active tokens for user ${userId}`);
        return { success: false, reason: 'no_tokens' };
      }

      // Send to all devices
      const results = await Promise.all(
        tokens.map(async ({ token, platform }) => {
          return this.sendToDevice(userId, token, platform, notificationType, title, body, data);
        })
      );

      // Log the notification
      const successCount = results.filter((r) => r.success).length;
      await this.logNotification(
        userId,
        notificationType,
        title,
        body,
        data,
        successCount > 0 ? 'sent' : 'failed',
        { results }
      );

      return { success: successCount > 0, results };
    } catch (error) {
      console.error('[PushNotification] Send to user error:', error.message);
      return { success: false, reason: 'error', error: error.message };
    }
  }

  /**
   * Send notification to a specific device
   */
  async sendToDevice(userId, token, platform, notificationType, title, body, data = {}) {
    try {
      const channelId = this.getChannelId(notificationType);

      const message = {
        token,
        notification: {
          title,
          body,
        },
        data: {
          ...Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          ),
          type: notificationType,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          notification: {
            channelId,
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.messaging.send(message);
      console.log(`[PushNotification] Sent to ${platform}: ${response}`);
      return { success: true, token, response };
    } catch (error) {
      console.error(`[PushNotification] Send to device error:`, error.message);

      // Handle invalid/expired tokens
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        await this.unregisterDevice(userId, token);
        console.log(`[PushNotification] Invalid token removed for user ${userId}`);
      }

      return { success: false, token, error: error.message };
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(userIds, notificationType, title, body, data = {}) {
    const results = await Promise.all(
      userIds.map((userId) => this.sendToUser(userId, notificationType, title, body, data))
    );

    return {
      total: userIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Log notification to database
   */
  async logNotification(userId, notificationType, title, body, data, status, fcmResponse) {
    try {
      await sequelize.query(
        `INSERT INTO notification_log
         (user_id, notification_type, title, body, data, status, fcm_response, sent_at)
         VALUES (:userId, :notificationType, :title, :body, :data, :status, :fcmResponse, NOW())`,
        {
          replacements: {
            userId,
            notificationType,
            title,
            body,
            data: JSON.stringify(data),
            status,
            fcmResponse: JSON.stringify(fcmResponse),
          },
          type: QueryTypes.INSERT,
        }
      );
    } catch (error) {
      console.error('[PushNotification] Log notification error:', error.message);
    }
  }

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(userId, limit = 50) {
    try {
      const history = await sequelize.query(
        `SELECT id, notification_type, title, body, status, sent_at
         FROM notification_log
         WHERE user_id = :userId
         ORDER BY sent_at DESC
         LIMIT :limit`,
        {
          replacements: { userId, limit },
          type: QueryTypes.SELECT,
        }
      );
      return history;
    } catch (error) {
      console.error('[PushNotification] Get history error:', error.message);
      return [];
    }
  }

  /**
   * Send test notification to user
   */
  async sendTestNotification(userId) {
    return this.sendToUser(
      userId,
      'default',
      'Test Notification',
      'This is a test notification from SoulBloom.',
      { test: true }
    );
  }
}

module.exports = new PushNotificationService();
