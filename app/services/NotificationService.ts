import * as Notifications from 'expo-notifications';
import { Platform, AppState, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior to show alerts even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('🔔 Notification handler called:', notification.request.identifier);
    console.log('   Content:', notification.request.content.title);
    console.log('   Type:', notification.request.content.data?.type);
    
    // For work reminders, check if it's actually time
    if (notification.request.content.data?.type === 'work_reminder') {
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
    
    // For other notifications (test, auto-timer), show normally
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

  private constructor() {
    this.initializeService();
    this.setupAppStateListener();
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
      
      const success = await this.requestPermissions();
      console.log('🔧 Initialization complete. Success:', success);
    } catch (error) {
      console.error('Error initializing notification service:', error);
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
      }
    });
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

      const { title, body } = this.getNotificationContent(type, jobName, extraData);
      const identifier = `${type}_${Date.now()}`;

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type,
            jobName,
            timestamp: new Date().toISOString(),
          },
        },
        trigger: null, // Send immediately
      });

      console.log(`📱 Notification sent: ${title} - ${body}`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Get notification content based on type
   */
  private getNotificationContent(
    type: NotificationType,
    jobName: string,
    extraData?: { minutes?: number }
  ): { title: string; body: string } {
    const minutes = extraData?.minutes || 2;

    switch (type) {
      case 'timer_started':
        return {
          title: '⏰ Timer Iniciado',
          body: `Timer automático iniciado para "${jobName}"`,
        };

      case 'timer_stopped':
        return {
          title: '⏹️ Timer Pausado',
          body: `Timer automático pausado para "${jobName}"`,
        };

      case 'timer_will_start':
        return {
          title: '🚀 Timer se Iniciará',
          body: `Timer se iniciará en ${minutes} minutos para "${jobName}"`,
        };

      case 'timer_will_stop':
        return {
          title: '⏸️ Timer se Pausará',
          body: `Timer se pausará en ${minutes} minutos para "${jobName}"`,
        };

      default:
        return {
          title: '📱 Notificación',
          body: `Evento para "${jobName}"`,
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
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
      });
      
      console.log('✅ Test notification sent');
      
      // Also try to present it manually for foreground
      await Notifications.presentNotificationAsync({
        title: '🧪 Foreground Test',
        body: 'This should show as alert in foreground',
        sound: true,
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
          sound: true,
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
      let title = '⏰ Recordatorio de Trabajo';
      let body = '';
      
      if (minutesBefore === 0) {
        body = `Es hora de empezar a trabajar en ${jobName} (${startTime})`;
      } else if (minutesBefore === 1) {
        body = `En 1 minuto empieza tu turno en ${jobName} (${startTime})`;
      } else if (minutesBefore < 60) {
        body = `En ${minutesBefore} minutos empieza tu turno en ${jobName} (${startTime})`;
      } else {
        const hours = Math.floor(minutesBefore / 60);
        const mins = minutesBefore % 60;
        const timeText = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        body = `En ${timeText} empieza tu turno en ${jobName} (${startTime})`;
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
          sound: true,
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

}

export default NotificationService;