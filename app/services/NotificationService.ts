import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior to show alerts even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export interface NotificationSettings {
  enabled: boolean;          // Notificaciones generales
  autoTimer: boolean;        // Notificaciones de auto-timer
  workReminders: boolean;    // Recordatorios de trabajo
}

export type NotificationType = 
  | 'timer_started'      // Timer iniciado automáticamente
  | 'timer_stopped'      // Timer pausado automáticamente
  | 'timer_will_start'   // Timer se iniciará en X minutos
  | 'timer_will_stop';   // Timer se pausará en X minutos

class NotificationService {
  private static instance: NotificationService;
  private hasPermissions = false;
  private settings: NotificationSettings = {
    enabled: true,
    autoTimer: true,
    workReminders: true,
  };

  private constructor() {
    this.initializeService();
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
      const success = await this.requestPermissions();
      console.log('🔧 Initialization complete. Success:', success);
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
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
              allowAnnouncements: false,
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
          categoryIdentifier: 'auto_timer',
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
   * Update notification settings
   */
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
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
          seconds: delaySeconds,
        },
      });
      
      console.log(`✅ Delayed test notification scheduled successfully`);
    } catch (error) {
      console.error('❌ Error scheduling delayed test notification:', error);
    }
  }

}

export default NotificationService;