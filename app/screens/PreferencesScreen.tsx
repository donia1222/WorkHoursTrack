import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  AppState,
  Platform,
  Modal,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { BlurView } from 'expo-blur';
import Header from '../components/Header';
import LoadingOverlay from '../components/LoadingOverlay';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage, languageConfig, SupportedLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useSubscription } from '../hooks/useSubscription';
import NotificationService from '../services/NotificationService';

interface PreferencesScreenProps {
  onClose?: () => void;
  scrollToNotifications?: boolean;
  onNavigateToSubscription?: () => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {

    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
  },
  closeButton: {
    padding: Theme.spacing.sm,
    marginRight: -Theme.spacing.sm,
  },
  headerText: {
    flex: 1,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  headerTitle: {
    ...Theme.typography.headline,
    color: colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
  },
  sectionCard: {
    marginVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.medium,
  },
  sectionTitle: {
    ...Theme.typography.headline,
    color: colors.text,
    marginBottom: 4,
    fontWeight: '600',
  },
  sectionDescription: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    marginBottom: Theme.spacing.md,
    lineHeight: 18,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  themeOption: {
    flex: 1,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,

    alignItems: 'center',
    position: 'relative',
  },
  themeOptionActive: {
    backgroundColor: colors.primary,
  },
  themeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  themeText: {
    ...Theme.typography.footnote,
    color: colors.text,
    fontWeight: '600',
  },
  themeTextActive: {
    color: '#FFFFFF',
  },
  selectedIndicator: {
    position: 'absolute',
    top: Theme.spacing.xs,
    right: Theme.spacing.xs,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
    marginLeft:10
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...Theme.typography.callout,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
  },
  checkmark: {
    marginLeft: Theme.spacing.sm,
  },
  flagEmoji: {
    fontSize: 24,
  },
  autoIconBg: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
  },
  lightIconBg: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  darkIconBg: {
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
  },
  languageIconBg: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  notificationIconBg: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  reminderIconBg: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
  },
  locationIconBg: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  reminderOptions: {
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  reminderPresetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  reminderPreset: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reminderPresetActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reminderPresetText: {
    ...Theme.typography.footnote,
    color: colors.primary,
    fontWeight: '600',
  },
  reminderPresetTextActive: {
    color: '#FFFFFF',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.separator,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    color: colors.text,
    backgroundColor: colors.background,
    ...Theme.typography.body,
  },
  customInputLabel: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
  },
  permissionsDeniedContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderWidth: 1,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  permissionsDeniedTitle: {
    ...Theme.typography.callout,
    color: '#FF3B30',
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  permissionsDeniedMessage: {
    ...Theme.typography.footnote,
    color: colors.text,
    marginBottom: Theme.spacing.md,
    lineHeight: 18,
  },
  openSettingsButton: {
    backgroundColor: '#FF3B30',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  openSettingsButtonText: {
    ...Theme.typography.footnote,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Premium Modal Styles
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  premiumModalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  premiumModalHeader: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  premiumIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  premiumModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  premiumModalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  premiumModalContent: {
    padding: 24,
  },
  premiumFeaturesList: {
    marginBottom: 24,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumFeatureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  premiumFeatureText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    fontWeight: '500',
  },
  premiumModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  premiumCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  premiumCancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  premiumSubscribeButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    elevation: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  premiumSubscribeButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  screenTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitleText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});

export default function PreferencesScreen({ onClose, scrollToNotifications, onNavigateToSubscription }: PreferencesScreenProps) {
  const { themeMode, setThemeMode, colors, isDark } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { hapticEnabled, updateHapticEnabled } = useHapticFeedback();
  const { isSubscribed } = useSubscription();
  const { 
    settings: notificationSettings, 
    updateSettings: updateNotificationSettings, 
    sendNotification,
    getPermissionStatus,
    openNotificationSettings
  } = useNotifications();
  const [countdown, setCountdown] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const notificationsRef = useRef<View>(null);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(notificationSettings.reminderMinutes?.toString() || '15');
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleThemeChange = (mode: 'auto' | 'light' | 'dark') => {
    setThemeMode(mode);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose?.();
    }, 100);
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
  };

  const handleReminderMinutesChange = async (minutes: number) => {
    await updateNotificationSettings({ reminderMinutes: minutes });
    setCustomMinutes(minutes.toString());
  };

  const handleWorkRemindersToggle = async (value: boolean) => {
    console.log('🔧 PreferencesScreen: Toggling workReminders to:', value);
    await updateNotificationSettings({ workReminders: value });
    console.log('🔧 PreferencesScreen: workReminders updated, new settings should be:', { ...notificationSettings, workReminders: value });
    if (value) {
      setShowReminderOptions(true);
    } else {
      setShowReminderOptions(false);
    }
  };

  const predefinedMinutes = [
    { label: 'En la hora', value: 0 },
    { label: '15 min antes', value: 15 },
    { label: '30 min antes', value: 30 },
    { label: '1 hora antes', value: 60 },
  ];

  // Initialize reminder options visibility based on workReminders setting
  useEffect(() => {
    setShowReminderOptions(notificationSettings.workReminders);
  }, [notificationSettings.workReminders]);

  // Check permission status on mount and when component becomes visible
  useEffect(() => {
    const checkPermissions = async () => {
      const status = await getPermissionStatus();
      setPermissionStatus(status);
    };
    
    checkPermissions();
  }, [getPermissionStatus]);

  // Listen for app state changes to re-check permissions when user returns from settings
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Re-check permissions when app becomes active (user might have changed settings)
        const status = await getPermissionStatus();
        setPermissionStatus(status);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [getPermissionStatus]);

  // Cleanup countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [countdownInterval]);

  // Auto-scroll to notifications section if requested
  useEffect(() => {
    const shouldScroll = scrollToNotifications || (global as any).scrollToNotifications;
    
    console.log('🔍 PreferencesScreen Auto-scroll check:', {
      scrollToNotifications,
      globalFlag: (global as any).scrollToNotifications,
      shouldScroll,
      hasNotificationsRef: !!notificationsRef.current,
      hasScrollViewRef: !!scrollViewRef.current
    });
    
    if (shouldScroll) {
      // Clear the global flag
      (global as any).scrollToNotifications = false;
      
      console.log('📍 Starting auto-scroll process...');
      
      setTimeout(() => {
        console.log('📍 After timeout - checking refs again:', {
          hasNotificationsRef: !!notificationsRef.current,
          hasScrollViewRef: !!scrollViewRef.current
        });
        
        if (notificationsRef.current && scrollViewRef.current) {
          console.log('📍 Attempting measureLayout...');
          notificationsRef.current?.measureLayout(
            scrollViewRef.current as any,
            (x, y) => {
              console.log('📍 measureLayout success - scrolling to:', { x, y, targetY: y - 100 });
              scrollViewRef.current?.scrollTo({
                y: y - 100, // Offset para mostrar un poco del contexto superior
                animated: true,
              });
            },
            () => {
              console.log('📍 measureLayout failed, using fallback scrollToEnd');
              // Fallback si measureLayout falla - scroll to end
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }
          );
        } else {
          console.log('📍 Refs not available, trying simple scrollToEnd...');
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      }, 1000); // Increased delay to ensure component is fully rendered
    }
  }, [scrollToNotifications]);

  // Additional effect to check for scroll flag on component mount
  useEffect(() => {
    console.log('🔍 PreferencesScreen mounted, checking for scroll flag...');
    
    // Check again after a longer delay in case the component needs more time to render
    const checkScrollFlag = () => {
      const shouldScroll = (global as any).scrollToNotifications;
      console.log('🔍 Delayed scroll check:', { shouldScroll });
      
      if (shouldScroll) {
        (global as any).scrollToNotifications = false;
        console.log('📍 Late scroll attempt...');
        
        // Try simple scrollToEnd first
        setTimeout(() => {
          if (scrollViewRef.current) {
            console.log('📍 Executing scrollToEnd...');
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 1500);
      }
    };
    
    // Check immediately and after delays
    checkScrollFlag();
    const timeoutId = setTimeout(checkScrollFlag, 2000);
    
    return () => clearTimeout(timeoutId);
  }, []); // Empty dependency array means this runs only once on mount


  const styles = getStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title={
          <View style={styles.screenTitle}>
            <IconSymbol size={20} name="gear" color="#8E8E93" />
            <Text style={[styles.screenTitleText, { color: colors.text }]}>{t('preferences.title')}</Text>
          </View>
        }
        onProfilePress={() => {}}
        showCloseButton={true}
        onClosePress={handleClose}
      />

      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Section */}
        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('preferences.appearance.title')}</Text>
          <Text style={styles.sectionDescription}>
            {t('preferences.appearance.description')}
          </Text>
          
          <View style={styles.themeOptions}>
            <TouchableOpacity 
              style={[styles.themeOption, themeMode === 'auto' && styles.themeOptionActive]}
              onPress={() => handleThemeChange('auto')}
            >
   <View style={[styles.themeIcon, styles.lightIconBg]}>
                 <IconSymbol size={20} name="checkmark" color={colors.warning} />
              </View>
              <Text style={[styles.themeText, themeMode === 'auto' && styles.themeTextActive]}>
                {t('preferences.appearance.auto')}
              </Text>
     
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.themeOption, themeMode === 'light' && styles.themeOptionActive]}
              onPress={() => handleThemeChange('light')}
            >
              <View style={[styles.themeIcon, styles.lightIconBg]}>
                 <IconSymbol size={20} name="sun.max.fill" color={colors.warning} />
              </View>
              <Text style={[styles.themeText, themeMode === 'light' && styles.themeTextActive]}>
                {t('preferences.appearance.light')}
              </Text>
       
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.themeOption, themeMode === 'dark' && styles.themeOptionActive]}
              onPress={() => handleThemeChange('dark')}
            >
              <View style={[styles.themeIcon, styles.darkIconBg]}>
                <IconSymbol size={20} name="moon.fill" color={colors.textSecondary} />
              </View>
              <Text style={[styles.themeText, themeMode === 'dark' && styles.themeTextActive]}>
                {t('preferences.appearance.dark')}
              </Text>
      
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* Language Section */}
        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('preferences.language.title')}</Text>
          <Text style={styles.sectionDescription}>
            {t('preferences.language.description')}
          </Text>
          
          {Object.entries(languageConfig).map(([langCode, config]) => (
            <TouchableOpacity 
              key={langCode}
              style={styles.settingItem}
              onPress={() => handleLanguageChange(langCode as SupportedLanguage)}
            >
              <View style={[styles.settingIcon, styles.languageIconBg]}>
                <Text style={styles.flagEmoji}>{config.flag}</Text>
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{config.name}</Text>
                <Text style={styles.settingDescription}>
                  {language === langCode ? t('preferences.language.default') : t('preferences.language.change_to', { language: config.nativeName })}
                </Text>
              </View>
              {language === langCode && (
                <View style={styles.checkmark}>
                  <IconSymbol size={20} name="checkmark.circle.fill" color={colors.success} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </BlurView>

        {/* Haptic Feedback Section */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity 
            style={[{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: Theme.spacing.lg,
              paddingVertical: Theme.spacing.md,
              marginVertical: Theme.spacing.sm,
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              borderRadius: Theme.borderRadius.md,
            }]}
            onPress={() => updateHapticEnabled(!hapticEnabled)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(255, 45, 85, 0.15)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <IconSymbol size={18} name="hand.tap.fill" color="#FF2D55" />
              </View>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors.text,
              }}>
                Haptic Feedback
              </Text>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={updateHapticEnabled}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor={hapticEnabled ? '#FFFFFF' : colors.textSecondary}
            />
          </TouchableOpacity>
        )}

        {/* Notifications Section */}
        <View ref={notificationsRef}>
          <BlurView 
            intensity={95} 
            tint={isDark ? "dark" : "light"} 
            style={styles.sectionCard}
          >
          <Text style={styles.sectionTitle}>{t('preferences.notifications.title')}</Text>
          <Text style={styles.sectionDescription}>
            {t('preferences.notifications.description')}
          </Text>
          
          {/* Permissions Denied Warning */}
          {permissionStatus === 'denied' && (
            <View style={styles.permissionsDeniedContainer}>
              <Text style={styles.permissionsDeniedTitle}>
                {t('preferences.notifications.permissions_denied_title')}
              </Text>
              <Text style={styles.permissionsDeniedMessage}>
                {t('preferences.notifications.permissions_denied_message')}
              </Text>
              <TouchableOpacity 
                style={styles.openSettingsButton}
                onPress={openNotificationSettings}
              >
                <Text style={styles.openSettingsButtonText}>
                  {t('preferences.notifications.open_settings')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
<TouchableOpacity
  style={styles.settingItem}
  onPress={() => {
    const newValue = !notificationSettings.enabled;
    if (newValue && !isSubscribed) {
      setShowPremiumModal(true);
    } else {
      updateNotificationSettings({ enabled: newValue });
    }
  }}
>
  <View style={[styles.settingIcon, styles.notificationIconBg]}>
    <IconSymbol size={20} name="bell.fill" color={colors.primary} />
  </View>
  <View style={styles.settingContent}>
    <Text style={styles.settingTitle}>{t('preferences.notifications.general_notifications')}</Text>

  </View>
  <Switch
    value={notificationSettings.enabled}
    onValueChange={(value) => {
      if (value && !isSubscribed) {
        setShowPremiumModal(true);
      } else {
        updateNotificationSettings({ enabled: value });
      }
    }}
    trackColor={{ false: colors.separator, true: colors.primary }}
    thumbColor={notificationSettings.enabled ? '#FFFFFF' : colors.textSecondary}
  />
</TouchableOpacity>

<TouchableOpacity
  style={styles.settingItem}
  onPress={() => {
    const newValue = !notificationSettings.autoTimer;
    if (newValue && !isSubscribed) {
      setShowPremiumModal(true);
    } else {
      updateNotificationSettings({ autoTimer: newValue });
    }
  }}
>
  <View style={[styles.settingIcon, styles.autoIconBg]}>
    <IconSymbol size={20} name="timer" color={colors.warning} />
  </View>
  <View style={styles.settingContent}>
    <Text style={styles.settingTitle}>{t('preferences.notifications.auto_timer')}</Text>

  </View>
  <Switch
    value={notificationSettings.autoTimer}
    onValueChange={(value) => {
      if (value && !isSubscribed) {
        setShowPremiumModal(true);
      } else {
        updateNotificationSettings({ autoTimer: value });
      }
    }}
    trackColor={{ false: colors.separator, true: colors.primary }}
    thumbColor={notificationSettings.autoTimer ? '#FFFFFF' : colors.textSecondary}
    disabled={!notificationSettings.enabled}
  />
</TouchableOpacity>

<TouchableOpacity
  style={styles.settingItem}
  onPress={() => {
    const newValue = !notificationSettings.workReminders;
    if (newValue && !isSubscribed) {
      setShowPremiumModal(true);
    } else {
      handleWorkRemindersToggle(newValue);
    }
  }}
>
  <View style={[styles.settingIcon, styles.reminderIconBg]}>
    <IconSymbol size={20} name="clock.fill" color={colors.warning} />
  </View>
  <View style={styles.settingContent}>
    <Text style={styles.settingTitle}>{t('preferences.notifications.work_schedule_reminders')}</Text>
 
  </View>
  <Switch
    value={notificationSettings.workReminders}
    onValueChange={(value) => {
      if (value && !isSubscribed) {
        setShowPremiumModal(true);
      } else {
        handleWorkRemindersToggle(value);
      }
    }}
    trackColor={{ false: colors.separator, true: colors.primary }}
    thumbColor={notificationSettings.workReminders ? '#FFFFFF' : colors.textSecondary}
    disabled={!notificationSettings.enabled}
  />
</TouchableOpacity>

  
          {/* Test Notification Button */}
          <TouchableOpacity 
            style={[
              styles.settingItem, 
              { 
                marginTop: 16, 
                backgroundColor: notificationSettings.enabled ? 'rgba(0, 122, 255, 0.1)' : 'rgba(142, 142, 147, 0.1)', 
                borderRadius: 12,
                opacity: notificationSettings.enabled ? 1 : 0.5
              }
            ]}
            onPress={async () => {
              if (!notificationSettings.enabled) {
                console.log('🚫 Test notification blocked - general notifications are disabled');
                return;
              }
              console.log('🧪 Test button pressed');
              console.log('📱 Notification settings:', notificationSettings);
              try {
                const notificationService = NotificationService.getInstance();
                await notificationService.sendTestNotification();
                console.log('✅ Test notification sent successfully');
              } catch (error) {
                console.error('❌ Error sending test notification:', error);
              }
            }}
            disabled={!notificationSettings.enabled}
          >
            <View style={[styles.settingIcon, { backgroundColor: notificationSettings.enabled ? 'rgba(0, 122, 255, 0.15)' : 'rgba(142, 142, 147, 0.15)' }]}>
              <IconSymbol size={20} name="paperplane.fill" color={notificationSettings.enabled ? colors.primary : colors.textSecondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('preferences.notifications.test_button')}</Text>
              <Text style={styles.settingDescription}>
                {t('preferences.notifications.test_desc')}
              </Text>
            </View>
    
          </TouchableOpacity>


          
        </BlurView>
        </View>
      
      </ScrollView>

      {/* Premium Modal */}
      <Modal
        visible={showPremiumModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPremiumModal(false)}
      >
        <View style={styles.premiumModalOverlay}>
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.premiumModalContainer}>
            <View style={styles.premiumModalHeader}>
              <View style={styles.premiumIcon}>
                <IconSymbol size={40} name="crown.fill" color="#000" />
              </View>
              <Text style={styles.premiumModalTitle}>
                {t('job_form.premium.title')}
              </Text>
              <Text style={styles.premiumModalSubtitle}>
                {t('job_form.premium.message')}
              </Text>
            </View>

            <View style={styles.premiumModalContent}>
              <View style={styles.premiumFeaturesList}>
                <View style={styles.premiumFeatureItem}>
                  <View style={styles.premiumFeatureIcon}>
                    <IconSymbol size={18} name="timer" color={colors.primary} />
                  </View>
                  <Text style={styles.premiumFeatureText}>
                    {t('job_form.premium.features.auto')}
                  </Text>
                </View>
                
                <View style={styles.premiumFeatureItem}>
                  <View style={styles.premiumFeatureIcon}>
                    <IconSymbol size={18} name="bell.fill" color={colors.primary} />
                  </View>
                  <Text style={styles.premiumFeatureText}>
                    Notificaciones avanzadas
                  </Text>
                </View>

                <View style={styles.premiumFeatureItem}>
                  <View style={styles.premiumFeatureIcon}>
                    <IconSymbol size={18} name="clock.fill" color={colors.primary} />
                  </View>
                  <Text style={styles.premiumFeatureText}>
                    {t('job_form.premium.features.schedule')}
                  </Text>
                </View>

                <View style={styles.premiumFeatureItem}>
                  <View style={styles.premiumFeatureIcon}>
                    <IconSymbol size={18} name="dollarsign.circle.fill" color={colors.primary} />
                  </View>
                  <Text style={styles.premiumFeatureText}>
                    {t('job_form.premium.features.financial')}
                  </Text>
                </View>
              </View>

              <View style={styles.premiumModalActions}>
                <TouchableOpacity 
                  style={styles.premiumCancelButton}
                  onPress={() => setShowPremiumModal(false)}
                >
                  <Text style={styles.premiumCancelButtonText}>
                    {t('job_form.premium.cancel')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.premiumSubscribeButton}
                  onPress={() => {
                    setShowPremiumModal(false);
                    if (onNavigateToSubscription) {
                      onNavigateToSubscription();
                    }
                  }}
                >
                  <Text style={styles.premiumSubscribeButtonText}>
                    {t('job_form.premium.subscribe')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>

      <LoadingOverlay visible={isClosing} />
    </SafeAreaView>
  );
}