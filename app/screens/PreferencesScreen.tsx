import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { BlurView } from 'expo-blur';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage, languageConfig, SupportedLanguage } from '../contexts/LanguageContext';

interface PreferencesScreenProps {
  onClose?: () => void;
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
});

export default function PreferencesScreen({ onClose }: PreferencesScreenProps) {
  const { themeMode, setThemeMode, colors, isDark } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderNotifications, setReminderNotifications] = useState(true);
  const [locationNotifications, setLocationNotifications] = useState(false);

  const handleThemeChange = (mode: 'auto' | 'light' | 'dark') => {
    setThemeMode(mode);
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
  };

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

      
      </ScrollView>
    </SafeAreaView>
  );
}

