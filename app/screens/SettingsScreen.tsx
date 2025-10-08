import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Modal, Animated } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import JobsManagementScreen from './JobsManagementScreen';
import PreferencesScreen from './PreferencesScreen';
import HelpSupportScreen from './HelpSupportScreen';
import SupportTermsScreen from './SupportTermsScreen';
import DebugScreen from './DebugScreen';
import { Job } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import JobFormModal from '../components/JobFormModal';
import JobSelectorModal from '../components/JobSelectorModal';
import WelcomeModal from '../components/WelcomeModal';
import AutoBackupModal from '../components/AutoBackupModal';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { DataExportService } from '../services/DataExportService';
import { AutoBackupService, BackupFrequency } from '../services/AutoBackupService';
import { useSubscription } from '../hooks/useSubscription';
import { Platform, Alert } from 'react-native';

interface SettingsScreenProps {
  onNavigate: (screen: string) => void;
  navigationOptions?: { 
    openJobsModal?: boolean; 
    openAddModal?: boolean; 
    editJob?: Job;
    initialTab?: 'basic' | 'schedule' | 'financial' | 'billing' | 'auto';
  } | null;
  onNavigationHandled?: () => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,

    marginTop: 10,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 24,
  },
  backButton: {
    position: 'absolute',
    left: 24,
    padding: 8,
  },
  headerText: {
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    color: colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,

  },
  sectionCard: {
    marginVertical: 12,
    borderRadius: 20,
    padding: 20,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
    shadowColor: isDark ? '#000' : colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  sectionCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    color: colors.text,
    letterSpacing: -0.3,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
    color: colors.textSecondary,
    paddingRight: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  settingContent: {
    flex: 1,
    paddingRight: 8,
  },
  settingTitle: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.2,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  statsCard: {
    marginVertical: 12,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: isDark ? 0.15 : 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  statsTitle: {
    fontSize: 17,
    marginBottom: 20,
    textAlign: 'center',
    color: colors.text,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    marginTop: 6,
    marginBottom: 4,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 13,
    textAlign: 'center',
    color: colors.textSecondary,
    fontWeight: '500',
  },
  primaryIconBg: {
    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.12)',
  },
  successIconBg: {
    backgroundColor: isDark ? 'rgba(52, 199, 89, 0.2)' : 'rgba(52, 199, 89, 0.12)',
  },
  warningIconBg: {
    backgroundColor: isDark ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.12)',
  },
  secondaryIconBg: {
    backgroundColor: isDark ? 'rgba(142, 142, 147, 0.2)' : 'rgba(142, 142, 147, 0.12)',
  },
  errorIconBg: {
    backgroundColor: isDark ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 59, 48, 0.12)',
  },
});

export default function SettingsScreen({ onNavigate, navigationOptions, onNavigationHandled }: SettingsScreenProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { isSubscribed } = useSubscription();
  const searchParams = useLocalSearchParams();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim1 = useRef(new Animated.Value(0.9)).current;
  const scaleAnim2 = useRef(new Animated.Value(0.9)).current;
  const scaleAnim3 = useRef(new Animated.Value(0.9)).current;
  
  const [showJobsManagement, setShowJobsManagement] = useState(false);
  const [openAddJobModal, setOpenAddJobModal] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [showSupportTerms, setShowSupportTerms] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [selectedEditType, setSelectedEditType] = useState<'schedule' | 'location' | 'financial' | 'billing'>('schedule');
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  
  // Auto Backup State
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState<BackupFrequency>('daily');
  const [availableBackups, setAvailableBackups] = useState<any[]>([]);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [showAutoBackupModal, setShowAutoBackupModal] = useState(false);
  const [shouldScrollToNotifications, setShouldScrollToNotifications] = useState(false);
  
  // Check for navigation to notifications
  useEffect(() => {
    if (searchParams.scrollTo === 'notifications' || (global as any).scrollToNotifications) {
      setShowPreferences(true);
      setShouldScrollToNotifications(true);
      // Clear the global flag to avoid repeated triggers
      (global as any).scrollToNotifications = false;
    }
  }, [searchParams.scrollTo]);

  // Check global flag on component mount and re-renders
  useEffect(() => {
    if ((global as any).scrollToNotifications) {
      setShowPreferences(true);
      setShouldScrollToNotifications(true);
      (global as any).scrollToNotifications = false;
    }
  });
  
  // Entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim1, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.spring(scaleAnim2, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.spring(scaleAnim3, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim1, scaleAnim2, scaleAnim3]);

  // Handle navigation options
  React.useEffect(() => {
    if (navigationOptions?.openJobsModal) {
      setShowJobsManagement(true);
      setOpenAddJobModal(navigationOptions.openAddModal || false);
      onNavigationHandled?.();
    }
  }, [navigationOptions, onNavigationHandled]);

  // No longer need to control header visibility for modal screens

  // Check for auto backup when Settings screen mounts
  React.useEffect(() => {
    const checkAutoBackup = async () => {
      try {
        await AutoBackupService.checkAndCreateBackupIfNeeded();
      } catch (error) {
        console.error('Error checking auto backup in settings:', error);
      }
    };

    checkAutoBackup();
    loadAutoBackupConfig();
  }, []);

  // Auto Backup Functions
  const loadAutoBackupConfig = async () => {
    try {
      const config = await AutoBackupService.getConfig();
      setAutoBackupEnabled(config.enabled);
      setAutoBackupFrequency(config.frequency);
      setLastBackupDate(config.lastBackupDate || null);
      
      const backups = await AutoBackupService.getAvailableBackups();
      setAvailableBackups(backups);
    } catch (error) {
      console.error('Error loading auto backup config:', error);
    }
  };

  const handleEditCategory = (category: 'schedule' | 'location' | 'financial' | 'billing') => {
    setSelectedEditType(category);
    setShowJobSelector(true);
  };

  const handleJobSelect = (job: Job) => {
    setEditingJob(job);
    setShowJobForm(true);
  };

  const handleJobFormSave = () => {
    setShowJobForm(false);
    setEditingJob(null);
  };

  const getEditInfo = (type: string) => {
    switch (type) {
      case 'schedule':
        return {
          title: t('edit.schedule.title'),
          subtitle: t('edit.schedule.subtitle'),
          tab: 'schedule' as const,
        };
      case 'location':
        return {
          title: t('edit.autotimer.title'),
          subtitle: t('edit.autotimer.subtitle'),
          tab: 'auto' as const,
        };
      case 'financial':
        return {
          title: t('edit.financial.title'),
          subtitle: t('edit.financial.subtitle'),
          tab: 'financial' as const,
        };
      case 'billing':
        return {
          title: t('edit.billing.title'),
          subtitle: t('edit.billing.subtitle'),
          tab: 'billing' as const,
        };
      default:
        return {
          title: t('edit.schedule.title'),
          subtitle: t('edit.schedule.subtitle'),
          tab: 'basic' as const,
        };
    }
  };

  // Don't render inline anymore - use modals instead

  const styles = getStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Jobs Management Section */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim1 }] }}>
        <BlurView 
          intensity={98} 
          tint={isDark ? "dark" : "light"} 
          style={styles.sectionCard}
        >
          <LinearGradient
            colors={isDark ? ['rgba(0, 122, 255, 0.15)', 'rgba(0, 122, 255, 0.05)'] : ['rgba(0, 122, 255, 0.1)', 'rgba(0, 122, 255, 0.03)']}
            style={styles.sectionCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>{t('settings.jobs.title')}</Text>
            <Text style={styles.sectionDescription}>
              {t('settings.jobs.description')}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowJobsManagement(true)}
          >
            <View style={[styles.settingIcon, styles.primaryIconBg]}>
              <IconSymbol size={24} name="chart.bar.fill" color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('settings.jobs.my_jobs')}</Text>
              <Text style={styles.settingDescription}>{t('settings.jobs.my_jobs_desc')}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>
        </BlurView>
        </Animated.View>



        {/* App Configuration Section */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim2 }] }}>
        <BlurView 
          intensity={98} 
          tint={isDark ? "dark" : "light"} 
          style={styles.sectionCard}
        >
          <LinearGradient
            colors={isDark ? ['rgba(142, 142, 147, 0.1)', 'rgba(142, 142, 147, 0.03)'] : ['rgba(142, 142, 147, 0.06)', 'rgba(142, 142, 147, 0.02)']}
            style={styles.sectionCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>{t('settings.app_config.title')}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowPreferences(true)}
          >
            <View style={[styles.settingIcon, styles.secondaryIconBg]}>
              <IconSymbol size={24} name="gear" color={colors.textSecondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('settings.app_config.preferences')}</Text>
              <Text style={styles.settingDescription}>{t('settings.app_config.preferences_desc')}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowWelcomeModal(true)}
          >
            <View style={[styles.settingIcon, styles.primaryIconBg]}>
              <IconSymbol size={24} name="lightbulb.fill" color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('settings.app_config.how_it_works')}</Text>
              <Text style={styles.settingDescription}>{t('settings.app_config.how_it_works_desc')}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowHelpSupport(true)}
          >
            <View style={[styles.settingIcon, styles.errorIconBg]}>
              <IconSymbol size={24} name="questionmark.circle" color={colors.error} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('settings.app_config.help')}</Text>
              <Text style={styles.settingDescription}>{t('settings.app_config.help_desc')}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>
          
          {/* Debug Button - Solo visible durante desarrollo */}
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowDebug(true)}
          >
            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.12)' }]}>
              <IconSymbol size={24} name="wrench.and.screwdriver" color="#FF9500" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('debug.title')}</Text>
              <Text style={styles.settingDescription}>{t('debug.subtitle')}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowSupportTerms(true)}
          >
            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.12)' }]}>
              <IconSymbol size={24} name="shield.fill" color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('settings.app_config.support_terms')}</Text>
              <Text style={styles.settingDescription}>{t('settings.app_config.support_terms_desc')}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>

        </BlurView>
        </Animated.View>

        {/* Data Management Section */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim3 }] }}>
        <BlurView 
          intensity={98} 
          tint={isDark ? "dark" : "light"} 
          style={styles.sectionCard}
        >
          <LinearGradient
            colors={isDark ? ['rgba(255, 59, 48, 0.12)', 'rgba(255, 59, 48, 0.04)'] : ['rgba(255, 59, 48, 0.08)', 'rgba(255, 59, 48, 0.02)']}
            style={styles.sectionCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>{t('preferences.data_management.title')}</Text>
            <Text style={styles.sectionDescription}>
              {t('preferences.data_management.description')}
            </Text>
          </View>
          
          {/* Export Data */}
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={async () => {
              try {
                console.log('🚀 Starting backup process...');
                
                // Create a backup first
                console.log('📦 Creating backup...');
                await AutoBackupService.createBackupNow();
                console.log('✅ Backup created successfully');
                
                // Get available backups and download the most recent one
                console.log('📋 Getting available backups...');
                const backups = await AutoBackupService.getAvailableBackups();
                console.log('🔍 Backups array length:', backups.length);
                console.log('🔍 Backups array:', JSON.stringify(backups, null, 2));
                
                if (backups.length > 0) {
                  const firstBackup = backups[0];
                  console.log('🔍 First backup object type:', typeof firstBackup);
                  console.log('🔍 First backup object:', JSON.stringify(firstBackup, null, 2));
                  console.log('🔍 About to download backup with filePath:', firstBackup.filePath);
                  await AutoBackupService.downloadBackup(firstBackup);
                } else {
                  console.error('No backup files found after creation');
                }
              } catch (error) {
                console.error('Error exporting data:', error);
      
              }
            }}
          >
            <View style={[styles.settingIcon, { backgroundColor: 'rgba(0, 200, 100, 0.15)' }]}>
              <IconSymbol size={24} name="square.and.arrow.up" color={colors.success} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('preferences.data_management.export_title')}</Text>
              <Text style={styles.settingDescription}>
                {t('preferences.data_management.export_desc')}
              </Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Import Data */}
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={async () => {
              try {
                await DataExportService.importAllData();
              } catch (error) {
                console.error('Error importing data:', error);
              }
            }}
          >
            <View style={[styles.settingIcon, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
              <IconSymbol size={24} name="square.and.arrow.down" color={colors.warning} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('preferences.data_management.import_title')}</Text>
              <Text style={styles.settingDescription}>
                {t('preferences.data_management.import_desc')}
              </Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Auto Backup */}
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowAutoBackupModal(true)}
          >
            <View style={[styles.settingIcon, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
              <IconSymbol size={24} name="clock.arrow.circlepath" color={colors.success} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('preferences.data_management.auto_backup_title')}</Text>
              <Text style={styles.settingDescription}>
                {t('preferences.data_management.auto_backup_desc')}
              </Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>
        </BlurView>
        </Animated.View>

        {/* Subscription Section */}
        <BlurView 
          intensity={98} 
          tint={isDark ? "dark" : "light"} 
          style={[styles.sectionCard, { 
            marginTop: 14,
            marginBottom: 68,
            padding: 24,
            backgroundColor: isSubscribed 
              ? (isDark ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.06)')
              : (isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.06)')
          }]}
        >
          <TouchableOpacity 
            onPress={() => onNavigate('subscription')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isSubscribed 
                ? (isDark ? ['rgba(34, 197, 94, 0)', 'rgba(34, 197, 94, 0)'] : ['rgba(34, 197, 94, 0)', 'rgba(34, 197, 94, 0)'])
                : (isDark ? ['rgba(99, 101, 241, 0)', 'rgba(99, 101, 241, 0)'] : ['rgba(99, 101, 241, 0)', 'rgba(99, 101, 241, 0)'])
              }
              style={styles.sectionCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={[styles.settingItem, { marginBottom: 0, paddingVertical: 16, backgroundColor: 'transparent' }]}>
              <View style={[styles.settingIcon, { 
                backgroundColor: isSubscribed 
                  ? (isDark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.15)') 
                  : (isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(250, 204, 64, 0.73)'),
                width: 52,
                height: 52,
                borderRadius: 26,
              }]}>
                <IconSymbol 
                  size={26} 
                  name="crown.fill" 
                  color={isSubscribed ? '#22C55E' : '#747371ff'} 
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { fontSize: 16, fontWeight: '700' }]}>
                  {isSubscribed ? t('side_menu.menu_items.subscription.premium_title') : t('side_menu.menu_items.subscription.title')}
                </Text>
                <Text style={[styles.settingDescription, { marginTop: 4, fontSize: 15 }]}>
                  {isSubscribed ? t('side_menu.menu_items.subscription.premium_description') : t('side_menu.menu_items.subscription.description')}
                </Text>
              </View>
              <IconSymbol size={18} name="chevron.right" color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </BlurView>


      </ScrollView>

      {/* Job Selector Modal */}
      <JobSelectorModal
        visible={showJobSelector}
        onClose={() => setShowJobSelector(false)}
        onJobSelect={handleJobSelect}
        title={getEditInfo(selectedEditType).title}
        subtitle={getEditInfo(selectedEditType).subtitle}
      />

      {/* Job Form Modal */}
      <JobFormModal
        visible={showJobForm}
        editingJob={editingJob}
        onClose={() => {
          setShowJobForm(false);
          setEditingJob(null);
        }}
        onSave={handleJobFormSave}
        initialTab={getEditInfo(selectedEditType).tab}
        onNavigateToCalendar={() => onNavigate?.('calendar')}
        onNavigateToSubscription={() => onNavigate?.('subscription')}
      />

      {/* Welcome Modal */}
      <WelcomeModal
        visible={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />

      {/* Auto Backup Modal */}
      <AutoBackupModal
        visible={showAutoBackupModal}
        onClose={() => setShowAutoBackupModal(false)}
        enabled={autoBackupEnabled}
        frequency={autoBackupFrequency}
        availableBackups={availableBackups}
        lastBackupDate={lastBackupDate}
        onConfigChange={async (enabled, frequency) => {
          try {
            await AutoBackupService.updateConfig({ enabled, frequency });
            await loadAutoBackupConfig();
          } catch (error) {
            console.error('Error updating auto backup config:', error);
          }
        }}
        onDownloadBackup={async (backup) => {
          try {
            await AutoBackupService.downloadBackup(backup);
          } catch (error) {
            console.error('Error downloading backup:', error);
          }
        }}
        onRefreshBackups={async () => {
          try {
            await loadAutoBackupConfig();
            // Also create new backup if auto backup is enabled
            if (autoBackupEnabled) {
              await AutoBackupService.createBackupNow();
              await loadAutoBackupConfig(); // Reload to show the new backup
            }
          } catch (error) {
            console.error('Error refreshing backups:', error);
          }
        }}
        onDeleteBackup={async (backup) => {
          try {
            await AutoBackupService.deleteBackup(backup);
            await loadAutoBackupConfig(); // Reload to update the list
          } catch (error) {
            console.error('Error deleting backup:', error);
          }
        }}
      />

      {/* Preferences Modal */}
      <Modal
        visible={showPreferences}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => {
          setShowPreferences(false);
          setShouldScrollToNotifications(false);
          
          // Si vino del MiniMapWidget, volver al mapa (igual que onClose)
          if ((global as any).returnToPrevious === 'mapa') {
            (global as any).returnToPrevious = null; // Limpiar flag
            // Pequeño delay para asegurar que el estado se mantenga
            setTimeout(() => {
              onNavigate('mapa');
            }, 100);
          }
        }}
      >
        <PreferencesScreen 
          onClose={() => {
            setShowPreferences(false);
            setShouldScrollToNotifications(false);
            
            // Si vino del MiniMapWidget, volver al mapa
            if ((global as any).returnToPrevious === 'mapa') {
              (global as any).returnToPrevious = null; // Limpiar flag
              // Pequeño delay para asegurar que el estado se mantenga
              setTimeout(() => {
                onNavigate('mapa');
              }, 100);
            }
          }} 
          scrollToNotifications={shouldScrollToNotifications}
          onNavigateToSubscription={() => {
            setShowPreferences(false);
            onNavigate('subscription');
          }}
        />
      </Modal>

      {/* Jobs Management Modal */}
      <Modal
        visible={showJobsManagement}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => {
          setShowJobsManagement(false);
          setOpenAddJobModal(false);
        }}
      >
        <JobsManagementScreen 
          onClose={() => {
            setShowJobsManagement(false);
            setOpenAddJobModal(false);
          }} 
          onNavigate={(screen) => {
            if (screen === 'subscription') {
              // Close all modals and reset states
              setShowJobsManagement(false);
              setOpenAddJobModal(false);
              setShowWelcomeModal(false);
              setShowAutoBackupModal(false);
              // Longer delay to ensure all modals close properly before navigation
              setTimeout(() => {
                onNavigate('subscription');
              }, 300);
            } else if (screen === 'mapa') {
              // Close all modals and reset states
              setShowJobsManagement(false);
              setOpenAddJobModal(false);
              setShowWelcomeModal(false);
              setShowAutoBackupModal(false);
              // Longer delay to ensure all modals close properly before navigation
              setTimeout(() => {
                onNavigate('mapa');
              }, 300);
            }
          }}
          openAddModal={openAddJobModal}
          editJob={navigationOptions?.editJob}
          initialTab={navigationOptions?.initialTab}
        />
      </Modal>

      {/* Help Support Modal */}
      <Modal
        visible={showHelpSupport}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowHelpSupport(false)}
      >
        <HelpSupportScreen onClose={() => setShowHelpSupport(false)} />
      </Modal>
      
      {/* Support Terms Modal */}
      <Modal
        visible={showSupportTerms}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowSupportTerms(false)}
      >
        <SupportTermsScreen onClose={() => setShowSupportTerms(false)} />
      </Modal>

      {/* Debug Modal */}
      <Modal
        visible={showDebug}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowDebug(false)}
      >
        <DebugScreen onBack={() => setShowDebug(false)} />
      </Modal>

    </SafeAreaView>
  );
}
