import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import JobsManagementScreen from './JobsManagementScreen';
import PreferencesScreen from './PreferencesScreen';
import HelpSupportScreen from './HelpSupportScreen';
import { useBackNavigation } from '../context/NavigationContext';
import { Job } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import JobFormModal from '../components/JobFormModal';
import JobSelectorModal from '../components/JobSelectorModal';
import WelcomeModal from '../components/WelcomeModal';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

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
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerText: {
    flex: 1,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionCard: {
    marginVertical: 16,
    borderRadius: 24,
    padding: 28,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  sectionCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.text,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    marginBottom: 2,
    fontWeight: '600',
    color: colors.text,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsCard: {
    marginVertical: 12,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    color: colors.text,
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
    fontSize: 20,
    marginTop: 4,
    marginBottom: 2,
    fontWeight: '600',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  primaryIconBg: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  successIconBg: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  warningIconBg: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
  },
  secondaryIconBg: {
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
  },
  errorIconBg: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
});

export default function SettingsScreen({ onNavigate, navigationOptions, onNavigationHandled }: SettingsScreenProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [showJobsManagement, setShowJobsManagement] = useState(false);
  const [openAddJobModal, setOpenAddJobModal] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [selectedEditType, setSelectedEditType] = useState<'schedule' | 'location' | 'financial' | 'billing'>('schedule');
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const { handleBack } = useBackNavigation();

  // Handle navigation options
  React.useEffect(() => {
    if (navigationOptions?.openJobsModal) {
      setShowJobsManagement(true);
      setOpenAddJobModal(navigationOptions.openAddModal || false);
      onNavigationHandled?.();
    }
  }, [navigationOptions, onNavigationHandled]);

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
          title: t('edit.location.title'),
          subtitle: t('edit.location.subtitle'),
          tab: 'billing' as const,
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

  if (showJobsManagement) {
    return (
      <JobsManagementScreen 
        onClose={() => {
          setShowJobsManagement(false);
          setOpenAddJobModal(false);
        }} 
        openAddModal={openAddJobModal}
        editJob={navigationOptions?.editJob}
        initialTab={navigationOptions?.initialTab}
      />
    );
  }

  if (showPreferences) {
    return (
      <PreferencesScreen onClose={() => setShowPreferences(false)} />
    );
  }

  if (showHelpSupport) {
    return (
      <HelpSupportScreen onClose={() => setShowHelpSupport(false)} />
    );
  }

  const styles = getStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.placeholder} />
          <View style={styles.headerText}>
            <View style={styles.titleContainer}>
              <IconSymbol size={26} name="gear" color={colors.primary} />
              <Text style={styles.headerTitle}>{t('settings.title')}</Text>
            </View>
            <Text style={styles.headerSubtitle}>{t('settings.subtitle')}</Text>
          </View>
          <TouchableOpacity 
            onPress={handleBack}
            style={styles.backButton}
          >
            <IconSymbol size={24} name="xmark" color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Jobs Management Section */}
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
          <Text style={styles.sectionTitle}>{t('settings.jobs.title')}</Text>
          <Text style={styles.sectionDescription}>
            {t('settings.jobs.description')}
          </Text>
          
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

        {/* Work Configuration Section */}
        <BlurView 
          intensity={98} 
          tint={isDark ? "dark" : "light"} 
          style={styles.sectionCard}
        >
          <LinearGradient
            colors={isDark ? ['rgba(34, 197, 94, 0.12)', 'rgba(34, 197, 94, 0.04)'] : ['rgba(34, 197, 94, 0.08)', 'rgba(34, 197, 94, 0.02)']}
            style={styles.sectionCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.sectionTitle}>{t('settings.work_config.title')}</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => handleEditCategory('schedule')}
          >
            <View style={[styles.settingIcon, styles.successIconBg]}>
              <IconSymbol size={24} name="clock.fill" color={colors.success} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('settings.work_config.schedules')}</Text>
              <Text style={styles.settingDescription}>{t('settings.work_config.schedules_desc')}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => handleEditCategory('location')}
          >
            <View style={[styles.settingIcon, styles.warningIconBg]}>
              <IconSymbol size={24} name="location.fill" color={colors.warning} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('settings.work_config.locations')}</Text>
              <Text style={styles.settingDescription}>{t('settings.work_config.locations_desc')}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>
        </BlurView>

        {/* Financial Configuration Section */}
        <BlurView 
          intensity={98} 
          tint={isDark ? "dark" : "light"} 
          style={styles.sectionCard}
        >
          <LinearGradient
            colors={isDark ? ['rgba(255, 149, 0, 0.12)', 'rgba(255, 149, 0, 0.04)'] : ['rgba(255, 149, 0, 0.08)', 'rgba(255, 149, 0, 0.02)']}
            style={styles.sectionCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.sectionTitle}>{t('settings.financial_config.title')}</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => handleEditCategory('financial')}
          >
            <View style={[styles.settingIcon, styles.successIconBg]}>
              <IconSymbol size={24} name="dollarsign.circle.fill" color={colors.success} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('settings.financial_config.rates')}</Text>
              <Text style={styles.settingDescription}>{t('settings.financial_config.rates_desc')}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => handleEditCategory('billing')}
          >
            <View style={[styles.settingIcon, styles.primaryIconBg]}>
              <IconSymbol size={24} name="chart.bar.fill" color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('settings.financial_config.billing')}</Text>
              <Text style={styles.settingDescription}>{t('settings.financial_config.billing_desc')}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>
        </BlurView>

        {/* App Configuration Section */}
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
          <Text style={styles.sectionTitle}>{t('settings.app_config.title')}</Text>
          
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
      />

      {/* Welcome Modal */}
      <WelcomeModal
        visible={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />

    </SafeAreaView>
  );
}

