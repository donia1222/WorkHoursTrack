import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService, { NotificationSettings, NotificationType } from '../services/NotificationService';

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>;
  sendNotification: (type: NotificationType, jobName: string, extraData?: { minutes?: number }) => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  canSendNotifications: () => boolean;
  getPermissionStatus: () => Promise<'granted' | 'denied' | 'undetermined'>;
  openNotificationSettings: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = '@notification_settings';
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  autoTimer: false,
  workReminders: false,
  reminderMinutes: 15,
};

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const notificationService = NotificationService.getInstance();

  // Load settings from storage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  /**
   * Load notification settings from AsyncStorage
   */
  const loadSettings = async (): Promise<void> => {
    try {
      const storedSettings = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings) as NotificationSettings;
        setSettings(parsedSettings);
        notificationService.updateSettings(parsedSettings);
        console.log('📱 Loaded notification settings:', parsedSettings);
      } else {
        // First time setup - request permissions
        await requestPermissions();
        console.log('📱 Using default notification settings');
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Save settings to AsyncStorage and update service
   */
  const saveSettings = async (newSettings: NotificationSettings): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      console.log('💾 Saved notification settings:', newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  /**
   * Update notification settings
   */
  const updateSettings = async (newSettings: Partial<NotificationSettings>): Promise<void> => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    notificationService.updateSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  /**
   * Send a notification through the service
   */
  const sendNotification = async (
    type: NotificationType,
    jobName: string,
    extraData?: { minutes?: number }
  ): Promise<void> => {
    await notificationService.sendNotification(type, jobName, extraData);
  };

  /**
   * Request notification permissions
   */
  const requestPermissions = async (): Promise<boolean> => {
    return await notificationService.requestPermissions();
  };

  /**
   * Check if notifications can be sent
   */
  const canSendNotifications = (): boolean => {
    return notificationService.canSendNotifications();
  };

  /**
   * Get current notification permission status
   */
  const getPermissionStatus = async (): Promise<'granted' | 'denied' | 'undetermined'> => {
    return await notificationService.getPermissionStatus();
  };

  /**
   * Open system settings for notifications
   */
  const openNotificationSettings = async (): Promise<void> => {
    return await notificationService.openNotificationSettings();
  };

  const contextValue: NotificationContextType = {
    settings,
    updateSettings,
    sendNotification,
    requestPermissions,
    canSendNotifications,
    getPermissionStatus,
    openNotificationSettings,
    isLoading,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to use notification context
 */
export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;