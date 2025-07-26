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
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { BlurView } from 'expo-blur';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage, languageConfig, SupportedLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationService from '../services/NotificationService';

interface PreferencesScreenProps {
  onClose?: () => void;
  scrollToNotifications?: boolean;
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
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
});

export default function PreferencesScreen({ onClose, scrollToNotifications }: PreferencesScreenProps) {
  const { themeMode, setThemeMode, colors, isDark } = useTheme();
  const { language, setLanguage, t } = useLanguage();
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

  const handleThemeChange = (mode: 'auto' | 'light' | 'dark') => {
    setThemeMode(mode);
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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.placeholder} />
          <View style={styles.headerText}>
            <View style={styles.titleContainer}>
              <IconSymbol size={26} name="gear" color={colors.primary} />
              <Text style={styles.headerTitle}>{t('preferences.title')}</Text>
            </View>
            <Text style={styles.headerSubtitle}>{t('preferences.subtitle')}</Text>
          </View>
          <TouchableOpacity 
            onPress={onClose}
            style={styles.closeButton}
          >
            <IconSymbol size={24} name="xmark" color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

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
            onPress={() => updateNotificationSettings({ enabled: !notificationSettings.enabled })}
          >
            <View style={[styles.settingIcon, styles.notificationIconBg]}>
              <IconSymbol size={20} name="bell.fill" color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('preferences.notifications.general')}</Text>
              <Text style={styles.settingDescription}>
                {t('preferences.notifications.general_desc')}
              </Text>
            </View>
            <Switch
              value={notificationSettings.enabled}
              onValueChange={(value) => updateNotificationSettings({ enabled: value })}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor={notificationSettings.enabled ? '#FFFFFF' : colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => updateNotificationSettings({ autoTimer: !notificationSettings.autoTimer })}
          >
            <View style={[styles.settingIcon, styles.autoIconBg]}>
              <IconSymbol size={20} name="timer" color={colors.warning} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Timer Automático</Text>
              <Text style={styles.settingDescription}>
                Notificaciones cuando el timer automático se inicie o pause
              </Text>
            </View>
            <Switch
              value={notificationSettings.autoTimer}
              onValueChange={(value) => updateNotificationSettings({ autoTimer: value })}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor={notificationSettings.autoTimer ? '#FFFFFF' : colors.textSecondary}
              disabled={!notificationSettings.enabled}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => handleWorkRemindersToggle(!notificationSettings.workReminders)}
          >
            <View style={[styles.settingIcon, styles.reminderIconBg]}>
              <IconSymbol size={20} name="clock.fill" color={colors.warning} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('preferences.notifications.schedule')}</Text>
              <Text style={styles.settingDescription}>
                {t('preferences.notifications.schedule_desc')}
              </Text>
            </View>
            <Switch
              value={notificationSettings.workReminders}
              onValueChange={handleWorkRemindersToggle}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor={notificationSettings.workReminders ? '#FFFFFF' : colors.textSecondary}
              disabled={!notificationSettings.enabled}
            />
          </TouchableOpacity>

          {/* Reminder Options - Solo se muestran cuando workReminders está activado */}
          {showReminderOptions && notificationSettings.workReminders && (
            <View style={styles.reminderOptions}>
              <Text style={styles.settingTitle}>Tiempo de aviso</Text>
              <Text style={styles.settingDescription}>
                Configura cuándo recibir el recordatorio antes de tu horario de trabajo
              </Text>
              
              {/* Presets predefinidos */}
              <View style={styles.reminderPresetsContainer}>
                {predefinedMinutes.map((preset) => (
                  <TouchableOpacity
                    key={preset.value}
                    style={[
                      styles.reminderPreset,
                      notificationSettings.reminderMinutes === preset.value && styles.reminderPresetActive
                    ]}
                    onPress={() => handleReminderMinutesChange(preset.value)}
                  >
                    <Text style={[
                      styles.reminderPresetText,
                      notificationSettings.reminderMinutes === preset.value && styles.reminderPresetTextActive
                    ]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Input personalizado */}
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  value={customMinutes}
                  onChangeText={setCustomMinutes}
                  onEndEditing={() => {
                    const minutes = parseInt(customMinutes);
                    if (!isNaN(minutes) && minutes >= 0 && minutes <= 480) {
                      handleReminderMinutesChange(minutes);
                    } else {
                      Alert.alert('Error', 'Ingresa un valor entre 0 y 480 minutos (8 horas)');
                      setCustomMinutes(notificationSettings.reminderMinutes.toString());
                    }
                  }}
                  placeholder="Minutos personalizados"
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.customInputLabel}>minutos antes</Text>
              </View>
            </View>
          )}

          {/* Test Notification Button */}
          <TouchableOpacity 
            style={[styles.settingItem, { marginTop: 16, backgroundColor: 'rgba(0, 122, 255, 0.1)', borderRadius: 12 }]}
            onPress={async () => {
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
          >
            <View style={[styles.settingIcon, { backgroundColor: 'rgba(0, 122, 255, 0.15)' }]}>
              <IconSymbol size={20} name="paperplane.fill" color={colors.primary} />
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
    </SafeAreaView>
  );
}

