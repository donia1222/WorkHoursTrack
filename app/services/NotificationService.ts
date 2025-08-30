import * as Notifications from 'expo-notifications';
import { Platform, AppState, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations directly
import esTranslations from '../locales/es.json';
import enTranslations from '../locales/en.json';
import deTranslations from '../locales/de.json';
import frTranslations from '../locales/fr.json';
import itTranslations from '../locales/it.json';
import ptTranslations from '../locales/pt.json';
import nlTranslations from '../locales/nl.json';
import trTranslations from '../locales/tr.json';
import jaTranslations from '../locales/ja.json';
import ruTranslations from '../locales/ru.json';

// Configure notification behavior to show alerts even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('🔔 Notification handler called:', notification.request.identifier);
    console.log('   Content:', notification.request.content.title);
    console.log('   Type:', notification.request.content.data?.type);
    console.log('   App State:', AppState.currentState);
    
    const notificationType = notification.request.content.data?.type;
    
    // For auto-timer notifications, always show when triggered
    if (notificationType && notificationType.startsWith('timer_')) {
      console.log('🔔 Auto-timer notification - showing with high priority');
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };
    }
    
    // For work reminders, check if it's actually time
    if (notificationType === 'work_reminder') {
      console.log('⏰ Work reminder detected - checking timing...');
      
      const scheduledTime = notification.request.content.data?.timestamp;
      if (scheduledTime) {
        const scheduledDate = new Date(scheduledTime as string);
        const now = new Date();
        const timeDiff = Math.abs(scheduledDate.getTime() - now.getTime());
        
        console.log(`   Scheduled: ${scheduledDate.toLocaleString()}`);
        console.log(`   Now: ${now.toLocaleString()}`);  
        console.log(`   Difference: ${Math.round(timeDiff / 1000)} seconds`);
        
        // Show if within 30 seconds of scheduled time
        if (timeDiff <= 30000) {
          console.log('✅ Showing work reminder - timing is correct');
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          };
        } else {
          console.log('❌ NOT showing work reminder - timing is off');
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }
      }
      
      // Fallback - show if no timestamp data
      console.log('⚠️ No timestamp data, showing anyway');
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };
    }
    
    // For other notifications (test, etc.), show normally
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

export interface NotificationSettings {
  enabled: boolean;          // Notificaciones generales
  autoTimer: boolean;        // Notificaciones de auto-timer
  workReminders: boolean;    // Recordatorios de trabajo
  reminderMinutes: number;   // Minutos antes del horario de trabajo para recordatorio
}

export type NotificationType = 
  | 'timer_started'      // Timer iniciado automáticamente
  | 'timer_stopped'      // Timer pausado automáticamente
  | 'timer_will_start'   // Timer se iniciará en X minutos
  | 'timer_will_stop';   // Timer se pausará en X minutos


class NotificationService {
  private static instance: NotificationService;
  private hasPermissions = false;
  private pendingTimeouts = new Map<string, NodeJS.Timeout>();
  private pendingWorkReminders = new Map<string, { reminderDate: Date; jobName: string; startTime: string; minutesBefore: number }>();
  private settings: NotificationSettings = {
    enabled: true,
    autoTimer: true,
    workReminders: true,
    reminderMinutes: 15,
  };
  private pendingBackgroundNotifications: Map<string, any> = new Map();

  private constructor() {
    this.initializeService();
    this.setupAppStateListener();
  }


  // Helper method to get translation
  private async t(key: string, options?: any): Promise<string> {
    console.log('🔍 NotificationService t() called with key:', key);
    
    // Try to get current language from AsyncStorage
    let currentLanguage = 'en'; // default fallback
    try {
      const savedLanguage = await AsyncStorage.getItem('user_language');
      if (savedLanguage) {
        currentLanguage = savedLanguage;
      } else {
        // If no saved language, try to detect system language
        const systemLanguage = require('expo-localization').locale?.split('-')[0] || 'en';
        currentLanguage = ['es', 'en', 'de', 'fr', 'it', 'pt', 'nl', 'tr', 'ja', 'ru'].includes(systemLanguage) ? systemLanguage : 'en';
      }
    } catch (error) {
      console.log('🔍 Could not get language from storage, using default:', currentLanguage);
    }
    
    console.log('🔍 Using language:', currentLanguage);
    
    // Get translations for current language
    const getTranslations = (lang: string) => {
      switch (lang) {
        case 'es': return esTranslations;
        case 'en': return enTranslations;
        case 'de': return deTranslations;
        case 'fr': return frTranslations;
        case 'it': return itTranslations;
        case 'pt': return ptTranslations;
        case 'nl': return nlTranslations;
        case 'tr': return trTranslations;
        case 'ja': return jaTranslations;
        case 'ru': return ruTranslations;
        default: return enTranslations; // fallback to English
      }
    };
    
    const translations = getTranslations(currentLanguage);
    
    // Navigate through nested object using key path
    const keyParts = key.split('.');
    let result: any = translations;
    
    console.log('🔍 Looking for key parts:', keyParts, 'in language:', currentLanguage);
    console.log('🔍 Available translations structure:', Object.keys(translations));
    
    for (const part of keyParts) {
      if (result && typeof result === 'object' && part in result) {
        result = result[part];
        console.log(`🔍 Found part "${part}":`, typeof result === 'object' ? Object.keys(result) : result);
      } else {
        console.log(`🔍 Translation key not found: ${key} at part "${part}"`);
        console.log('🔍 Available keys at this level:', result && typeof result === 'object' ? Object.keys(result) : 'Not an object');
        return key; // Return key itself if not found
      }
    }
    
    // If result is string and has template variables, replace them
    if (typeof result === 'string' && options) {
      let finalResult = result;
      for (const [placeholder, value] of Object.entries(options)) {
        finalResult = finalResult.replace(new RegExp(`{{${placeholder}}}`, 'g'), String(value));
      }
      return finalResult;
    }
    return typeof result === 'string' ? result : key;
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  private async initializeService(): Promise<void> {
    try {
      console.log('🔧 Initializing NotificationService...');
      
      // Load saved settings
      await this.loadSettings();
      
      // Create notification channels for Android
      if (Platform.OS === 'android') {
        await this.createNotificationChannels();
      }
      
      const success = await this.requestPermissions();
      console.log('🔧 Initialization complete. Success:', success);
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  /**
   * Create notification channels for Android
   */
  private async createNotificationChannels(): Promise<void> {
    try {
      // Auto-timer channel with highest priority
      await Notifications.setNotificationChannelAsync('auto-timer', {
        name: 'Auto Timer',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        bypassDnd: true,
      });

      // Work reminders channel
      await Notifications.setNotificationChannelAsync('work-reminders', {
        name: 'Work Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      console.log('✅ Notification channels created');
    } catch (error) {
      console.error('Error creating notification channels:', error);
    }
  }

  /**
   * Setup AppState listener to handle background notifications
   */
  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState) => {
      console.log('📱 AppState changed to:', nextAppState);
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('📲 App going to background - scheduling pending work reminders');
        this.schedulePendingWorkReminders();
      } else if (nextAppState === 'active') {
        // Disabled to prevent duplicate notifications
        // console.log('📲 App became active - checking for missed auto-timer notifications');
        // this.checkMissedAutoTimerNotifications();
      }
    });
  }

  /**
   * Check for auto-timer notifications that might have been missed while in background
   */
  private async checkMissedAutoTimerNotifications(): Promise<void> {
    try {
      const now = Date.now();
      for (const [identifier, notificationData] of this.pendingBackgroundNotifications.entries()) {
        const timeSinceSent = now - notificationData.timestamp;
        
        // If notification is older than 30 seconds and might have been missed
        if (timeSinceSent > 30000 && timeSinceSent < 5 * 60 * 1000) {
          console.log('🔔 Potentially missed auto-timer notification, checking delivery...');
          
          // Check if the notification was actually delivered
          const deliveredNotifications = await Notifications.getPresentedNotificationsAsync();
          const wasDelivered = deliveredNotifications.some(n => n.request.identifier === identifier);
          
          if (!wasDelivered) {
            console.log('🔔 Re-sending missed auto-timer notification');
            // Re-send with immediate trigger
            await Notifications.scheduleNotificationAsync({
              ...notificationData.config,
              identifier: `${identifier}_resend`,
              trigger: { seconds: 1 },
            });
          }
          
          // Mark as processed
          this.pendingBackgroundNotifications.delete(identifier);
        }
      }
    } catch (error) {
      console.error('Error checking missed notifications:', error);
    }
  }

  /**
   * Schedule all pending work reminders when app goes to background
   */
  private async schedulePendingWorkReminders(): Promise<void> {
    if (this.pendingWorkReminders.size === 0) {
      console.log('📭 No pending work reminders to schedule');
      return;
    }

    console.log(`📬 Scheduling ${this.pendingWorkReminders.size} pending work reminders`);
    
    for (const [identifier, reminder] of this.pendingWorkReminders.entries()) {
      try {
        await this.scheduleWorkReminderInternal(
          reminder.reminderDate,
          reminder.jobName,
          reminder.startTime,
          reminder.minutesBefore,
          identifier
        );
      } catch (error) {
        console.error(`❌ Error scheduling pending reminder ${identifier}:`, error);
      }
    }
    
    // Clear pending reminders after scheduling
    this.pendingWorkReminders.clear();
    console.log('✅ All pending work reminders scheduled and cleared');
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('🔐 Requesting notification permissions...');
      
      if (Platform.OS === 'ios') {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        console.log('🔍 Existing permission status:', existingStatus);
        
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          console.log('📱 Requesting permissions...');
          const { status } = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
              allowDisplayInCarPlay: false,
              allowCriticalAlerts: false,
              provideAppNotificationSettings: false,
              allowProvisional: false,
              // allowAnnouncements: false, // May not exist in older SDK
            },
            android: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          });
          finalStatus = status;
          console.log('📱 Permission request result:', finalStatus);
        }

        this.hasPermissions = finalStatus === 'granted';
        
        if (!this.hasPermissions) {
          console.warn('❌ Notification permissions not granted. Status:', finalStatus);
          console.warn('📱 Go to Settings > Notifications > YourApp to enable notifications');
          return false;
        }
      } else {
        // Android permissions are handled automatically by expo-notifications
        this.hasPermissions = true;
      }

      console.log('✅ Notification permissions granted');
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      this.hasPermissions = false;
      return false;
    }
  }

  /**
   * Check if notifications are available and enabled
   */
  canSendNotifications(): boolean {
    return this.hasPermissions && this.settings.enabled;
  }

  /**
   * Get current notification permission status
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Error getting permission status:', error);
      return 'undetermined';
    }
  }

  /**
   * Open system settings for notifications
   */
  async openNotificationSettings(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Error opening notification settings:', error);
    }
  }

  /**
   * Schedule a notification for a specific time
   */
  async scheduleNotificationForTime(
    type: NotificationType,
    jobName: string,
    scheduledTime: Date,
    extraData?: { minutes?: number }
  ): Promise<void> {
    try {
      console.log('📅 scheduleNotificationForTime called with:', { 
        type, 
        jobName, 
        scheduledTime: scheduledTime.toLocaleString(), 
        extraData 
      });
      
      if (!this.canSendNotifications()) {
        console.log('📵 Notifications disabled or no permissions');
        return;
      }

      // Check if auto-timer notifications are enabled
      if (type.startsWith('timer_') && !this.settings.autoTimer) {
        console.log('📵 Auto-timer notifications disabled');
        return;
      }

      const { title, body } = await this.getNotificationContent(type, jobName, extraData);
      const identifier = `${type}_${Date.now()}_scheduled`;

      // Calculate time difference for logging
      const now = Date.now();
      const scheduledTimeMs = scheduledTime.getTime();
      const timeDiff = scheduledTimeMs - now;
      
      // If the scheduled time is in the past or too close (less than 1 second), schedule for 2 seconds from now
      if (timeDiff < 1000) {
        console.log(`⚠️ Scheduled time is too close or in the past, adjusting to 2 seconds from now`);
        scheduledTime = new Date(now + 2000);
      }
      
      const secondsUntilNotification = Math.floor((scheduledTime.getTime() - now) / 1000);

      console.log(`📅 Scheduling notification "${title}" for ${secondsUntilNotification} seconds from now`);
      console.log(`📅 Using date trigger: ${scheduledTime.toISOString()}`);

      // Para notificaciones de auto-timer, usar alta prioridad y configuración especial
      const notificationRequest: any = {
        identifier,
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          autoDismiss: false,
          vibrate: [0, 250, 250, 250],
          data: {
            type,
            jobName,
            timestamp: new Date().toISOString(),
            scheduledFor: scheduledTime.toISOString(),
          },
        },
        trigger: {
          type: 'date',
          date: scheduledTime,
        } as any,
      };

      // Add Android channel
      if (Platform.OS === 'android') {
        notificationRequest.content.channelId = 'auto-timer';
      }


      await Notifications.scheduleNotificationAsync(notificationRequest);

      console.log(`📅 Notification scheduled successfully: ${title} - ${body} (in ${secondsUntilNotification}s)`);
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  /**
   * Send a local notification
   */
  async sendNotification(
    type: NotificationType,
    jobName: string,
    extraData?: { minutes?: number }
  ): Promise<void> {
    try {
      console.log('🚀 sendNotification called with:', { type, jobName, extraData });
      console.log('🔍 hasPermissions:', this.hasPermissions);
      console.log('🔍 settings:', this.settings);
      console.log('🔍 canSendNotifications():', this.canSendNotifications());
      
      if (!this.canSendNotifications()) {
        console.log('📵 Notifications disabled or no permissions');
        console.log('📵 hasPermissions:', this.hasPermissions);
        console.log('📵 settings.enabled:', this.settings.enabled);
        return;
      }

      // Check if auto-timer notifications are enabled
      if (type.startsWith('timer_') && !this.settings.autoTimer) {
        console.log('📵 Auto-timer notifications disabled');
        return;
      }

      const { title, body } = await this.getNotificationContent(type, jobName, extraData);
      const identifier = `${type}_${Date.now()}`;

      // Special configuration for auto-timer notifications to ensure background delivery
      const isAutoTimer = type.startsWith('timer_');
      
      const notificationConfig: any = {
        identifier,
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          autoDismiss: false,
          vibrate: isAutoTimer ? [0, 250, 250, 250] : undefined,
          data: {
            type,
            jobName,
            timestamp: new Date().toISOString(),
          },
        },
        trigger: {
          seconds: isAutoTimer ? 2 : 1, // Slightly longer delay for auto-timer notifications
        },
      };

      // Add Android channel for auto-timer
      if (Platform.OS === 'android' && isAutoTimer) {
        notificationConfig.content.channelId = 'auto-timer';
      }

      await Notifications.scheduleNotificationAsync(notificationConfig);

      // Disabled to prevent duplicate notifications
      // For auto-timer notifications, store them for potential re-delivery
      // if (isAutoTimer) {
      //   this.pendingBackgroundNotifications.set(identifier, {
      //     config: notificationConfig,
      //     timestamp: Date.now(),
      //     delivered: false,
      //   });
      //   
      //   // Clean up old notifications after 5 minutes
      //   setTimeout(() => {
      //     this.pendingBackgroundNotifications.delete(identifier);
      //   }, 5 * 60 * 1000);
      // }

      console.log(`📱 Notification sent: ${title} - ${body}`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Get notification content based on type
   */
  private async getNotificationContent(
    type: NotificationType,
    jobName: string,
    extraData?: { minutes?: number }
  ): Promise<{ title: string; body: string }> {
    const minutes = extraData?.minutes || 2;

    switch (type) {
      case 'timer_started':
        return {
          title: await this.t('preferences.notifications.timer_started_title'),
          body: await this.t('preferences.notifications.timer_started_body', { jobName }),
        };

      case 'timer_stopped':
        return {
          title: await this.t('preferences.notifications.timer_stopped_title'),
          body: await this.t('preferences.notifications.timer_stopped_body', { jobName }),
        };

      case 'timer_will_start':
        return {
          title: await this.t('preferences.notifications.timer_will_start_title'),
          body: await this.t('preferences.notifications.timer_will_start_body', { minutes, jobName }),
        };

      case 'timer_will_stop':
        return {
          title: await this.t('preferences.notifications.timer_will_stop_title'),
          body: await this.t('preferences.notifications.timer_will_stop_body', { minutes, jobName }),
        };

      default:
        return {
          title: await this.t('preferences.notifications.default_notification_title') || '📱 Notification',
          body: await this.t('preferences.notifications.default_notification_body', { jobName }) || `Event for "${jobName}"`,
        };
    }
  }

  /**
   * Load settings from AsyncStorage
   */
  private async loadSettings(): Promise<void> {
    try {
      const settingsJson = await AsyncStorage.getItem('notification_settings');
      if (settingsJson) {
        this.settings = { ...this.settings, ...JSON.parse(settingsJson) };
        console.log('📱 Loaded notification settings:', this.settings);
      } else {
        // Save default settings
        await AsyncStorage.setItem('notification_settings', JSON.stringify(this.settings));
        console.log('📱 Saved default notification settings');
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }

  /**
   * Update notification settings
   */
  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    
    // Save settings to AsyncStorage for background access
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
    
    console.log('📱 Notification settings updated:', this.settings);
  }

  /**
   * Update notification translations
   */
  updateTranslations(translations: Partial<NotificationTranslations>): void {
    this.translations = { ...this.translations, ...translations };
    console.log('🌐 Notification translations updated');
  }

  /**
   * Get current settings
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Cancel all pending notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  /**
   * Cancel notifications by type
   */
  async cancelNotificationsByType(type: NotificationType): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const notificationsToCancel = scheduledNotifications.filter(
        notification => notification.content.data?.type === type
      );

      for (const notification of notificationsToCancel) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }

      console.log(`🗑️ Cancelled ${notificationsToCancel.length} notifications of type: ${type}`);
    } catch (error) {
      console.error('Error cancelling notifications by type:', error);
    }
  }

  /**
   * Test notification (for debugging)
   */
  async sendTestNotification(): Promise<void> {
    console.log('🧪 sendTestNotification called');
    try {
      const identifier = `test_${Date.now()}`;
      
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: '🧪 Test Notification',
          body: 'If you see this, notifications are working correctly',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1, // Delay 1 second to help with background delivery
        },
      });
      
      console.log('✅ Test notification sent');
      
      // Also try to present it manually for foreground
      await Notifications.presentNotificationAsync({
        title: '🧪 Foreground Test',
        body: 'This should show as alert in foreground',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      });
      
    } catch (error) {
      console.error('❌ Error in sendTestNotification:', error);
    }
  }

  /**
   * Schedule test notification with delay (for testing with app closed)
   */
  async scheduleDelayedTestNotification(delaySeconds: number = 20): Promise<void> {
    console.log(`⏰ Scheduling delayed test notification in ${delaySeconds} seconds`);
    try {
      const identifier = `delayed_test_${Date.now()}`;
      const scheduledTime = new Date(Date.now() + delaySeconds * 1000);
      
      console.log(`📅 Current time: ${new Date().toLocaleTimeString()}`);
      console.log(`📅 Will trigger at: ${scheduledTime.toLocaleTimeString()}`);
      
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: '🧪 Background Test',
          body: `This notification was scheduled ${delaySeconds} seconds ago. If you see this, background notifications work!`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: 'timeInterval',
          seconds: delaySeconds,
        } as any,
      });
      
      console.log(`✅ Delayed test notification scheduled successfully`);
    } catch (error) {
      console.error('❌ Error scheduling delayed test notification:', error);
    }
  }

  /**
   * Schedule work reminder notification (public method)
   */
  async scheduleWorkReminder(
    reminderDate: Date,
    jobName: string,
    startTime: string,
    minutesBefore: number
  ): Promise<void> {
    console.log('🔔 scheduleWorkReminder called with:');
    console.log('   reminderDate:', reminderDate.toLocaleString());
    console.log('   jobName:', jobName);
    console.log('   startTime:', startTime);
    console.log('   minutesBefore:', minutesBefore);

    if (!this.hasPermissions || !this.settings.workReminders) {
      console.log('❌ Cannot schedule: no permissions or setting disabled');
      return;
    }

    const identifier = `work_reminder_${jobName}_${reminderDate.getTime()}`;
    
    // Always schedule immediately - no need to wait for background
    console.log('📲 Scheduling work reminder immediately');
    await this.scheduleWorkReminderInternal(reminderDate, jobName, startTime, minutesBefore, identifier);
  }

  /**
   * Internal method to actually schedule the work reminder notification
   */
  private async scheduleWorkReminderInternal(
    reminderDate: Date,
    jobName: string,
    startTime: string,
    minutesBefore: number,
    identifier: string
  ): Promise<void> {
    try {
      const title = await this.t('preferences.notifications.work_reminder_title');
      let body = '';
      
      if (minutesBefore === 0) {
        body = await this.t('preferences.notifications.work_reminder_now_body', { jobName, startTime });
      } else if (minutesBefore === 1) {
        body = await this.t('preferences.notifications.work_reminder_1min_body', { jobName, startTime });
      } else if (minutesBefore < 60) {
        body = await this.t('preferences.notifications.work_reminder_minutes_body', { jobName, startTime, minutes: minutesBefore });
      } else {
        const hours = Math.floor(minutesBefore / 60);
        const mins = minutesBefore % 60;
        const timeText = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        body = await this.t('preferences.notifications.work_reminder_hours_body', { jobName, startTime, timeText });
      }

      console.log('📝 Scheduling notification:');
      console.log('   title:', title);
      console.log('   body:', body);
      console.log('   identifier:', identifier);
      console.log('   scheduled for:', reminderDate.toLocaleString());

      const now = new Date();
      const timeUntilTrigger = reminderDate.getTime() - now.getTime();

      console.log(`⏱️ Time until trigger: ${timeUntilTrigger}ms (${Math.round(timeUntilTrigger/1000)}s)`);
      
      if (timeUntilTrigger <= 0) {
        console.log('⏭️ SKIPPING: Notification time has already passed');
        return;
      }
      
      const notificationRequest = await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type: 'work_reminder',
            jobName,
            startTime,
            minutesBefore,
            timestamp: reminderDate.toISOString(),
          },
        },
        trigger: {
          type: 'date',
          date: reminderDate,
        } as any,
      });

      console.log(`✅ Work reminder scheduled successfully!`);
      console.log(`   Notification ID: ${notificationRequest}`);
      console.log(`   For: ${reminderDate.toLocaleString()}`);
      
      // Verify the notification was scheduled
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const ourNotification = scheduledNotifications.find(n => n.identifier === identifier);
      if (ourNotification) {
        console.log(`📋 Verified: Notification found in scheduled list`);
        console.log(`   Trigger: ${ourNotification.trigger ? 'Date-based' : 'Immediate'}`);
      } else {
        console.log(`❌ ERROR: Notification not found in scheduled list!`);
      }
      
    } catch (error) {
      console.error('❌ Error scheduling work reminder:', error);
    }
  }

  /**
   * Cancel all work reminder notifications
   */
  async cancelWorkReminders(): Promise<void> {
    try {
      // Cancel scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const workReminderIds = scheduledNotifications
        .filter(notification => 
          notification.identifier.startsWith('work_reminder_') ||
          notification.content.data?.type === 'work_reminder'
        )
        .map(notification => notification.identifier);

      if (workReminderIds.length > 0) {
        for (const id of workReminderIds) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }
        console.log(`🗑️ Cancelled ${workReminderIds.length} scheduled work reminder notifications`);
      }

      // Cancel pending timeouts
      let timeoutCount = 0;
      for (const [identifier, timeoutId] of this.pendingTimeouts.entries()) {
        if (identifier.startsWith('work_reminder_')) {
          clearTimeout(timeoutId);
          this.pendingTimeouts.delete(identifier);
          timeoutCount++;
        }
      }
      
      if (timeoutCount > 0) {
        console.log(`🗑️ Cancelled ${timeoutCount} pending timeout work reminders`);
      }

      // Clear pending work reminders
      const pendingCount = this.pendingWorkReminders.size;
      this.pendingWorkReminders.clear();
      
      if (pendingCount > 0) {
        console.log(`🗑️ Cleared ${pendingCount} pending work reminders`);
      }
      
    } catch (error) {
      console.error('Error cancelling work reminders:', error);
    }
  }

  /**
   * Cancel scheduled notifications by job and type
   */
  async cancelScheduledNotifications(jobName: string, types?: NotificationType[]): Promise<void> {
    try {
      console.log(`🗑️ Cancelling scheduled notifications for ${jobName}`, types ? `of types: ${types.join(', ')}` : 'of all types');
      
      // Get all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Filter notifications to cancel
      const notificationsToCancel = scheduledNotifications.filter(notification => {
        const data = notification.content.data;
        const matchesJob = data?.jobName === jobName;
        const matchesType = !types || types.includes(data?.type as NotificationType);
        return matchesJob && matchesType;
      });
      
      console.log(`🗑️ Found ${notificationsToCancel.length} notifications to cancel`);
      
      // Cancel each notification
      for (const notification of notificationsToCancel) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`🗑️ Cancelled notification: ${notification.identifier}`);
      }
      
    } catch (error) {
      console.error('Error cancelling scheduled notifications:', error);
    }
  }

}

export default NotificationService;