import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { BlurView } from 'expo-blur';
import { Job } from '../types/WorkTypes';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface JobSelectorProps {
  jobs: Job[];
  selectedJobId: string;
  onJobSelect: (jobId: string) => void;
  onAddJob?: () => void;
  showAddButton?: boolean;
}

export default function JobSelector({ 
  jobs, 
  selectedJobId, 
  onJobSelect, 
  onAddJob,
  showAddButton = true 
}: JobSelectorProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const activeJobs = jobs.filter(job => job.isActive);
  const styles = getStyles(colors, isDark);

  return (
    <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('job_selector.title')}</Text>
        <Text style={styles.subtitle}>
          {activeJobs.length === 1 
            ? t('job_selector.subtitle_single', { count: activeJobs.length })
            : t('job_selector.subtitle_multiple', { count: activeJobs.length })
          }
        </Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.jobsContainer}
        style={styles.scrollView}
      >
        {activeJobs.map((job) => (
          <TouchableOpacity
            key={job.id}
            style={[
              styles.jobCard,
              selectedJobId === job.id && styles.jobCardSelected
            ]}
            onPress={() => { triggerHaptic('selection'); onJobSelect(job.id); }}
          >
            <View style={styles.jobCardInner}>
              <View 
                style={[
                  styles.jobColorIndicator, 
                  { backgroundColor: job.color }
                ]} 
              />
              <View style={styles.jobInfo}>
                <Text 
                  style={[
                    styles.jobName,
                    selectedJobId === job.id && styles.jobNameSelected
                  ]}
                  numberOfLines={1}
                >
                  {job.name}
                </Text>
                {job.company && (
                  <Text 
                    style={[
                      styles.jobCompany,
                      selectedJobId === job.id && styles.jobCompanySelected
                    ]}
                    numberOfLines={1}
                  >
                    {job.company}
                  </Text>
                )}
                <View style={styles.jobDetails}>
                  <Text 
                    style={[
                      styles.jobHours,
                      selectedJobId === job.id && styles.jobHoursSelected
                    ]}
                  >
                    {t('job_selector.default_hours', { hours: job.defaultHours })}
                  </Text>
                  {job.hourlyRate && job.hourlyRate > 0 && (
                    <Text 
                      style={[
                        styles.jobRate,
                        selectedJobId === job.id && styles.jobRateSelected
                      ]}
                    >
                      {t('job_selector.hourly_rate', { rate: job.hourlyRate, currency: job.currency || 'EUR' })}
                    </Text>
                  )}
                </View>
              </View>
              {selectedJobId === job.id && (
                <View style={styles.selectedIndicator}>
                  <IconSymbol 
                    size={16} 
                    name="checkmark" 
                    color="#FFFFFF" 
                  />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {showAddButton && onAddJob && (
          <TouchableOpacity
            style={styles.addJobCard}
            onPress={() => { triggerHaptic('light'); onAddJob(); }}
          >
            <View style={styles.addJobCardInner}>
              <View style={styles.addJobIcon}>
                <IconSymbol 
                  size={22} 
                  name="plus" 
                  color="#FFFFFF" 
                />
              </View>
              <Text style={styles.addJobText}>
                {t('job_selector.add_job')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </BlurView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.medium,
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  title: {
    ...Theme.typography.headline,
    color: colors.text,
    marginBottom: Theme.spacing.xs,
  },
  subtitle: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
  },
  scrollView: {
    marginHorizontal: -Theme.spacing.xs,
  },
  jobsContainer: {
    paddingHorizontal: Theme.spacing.xs,
    gap: Theme.spacing.sm,
  },
  jobCard: {
    width: 160,
    marginHorizontal: Theme.spacing.xs,
  },
  jobCardSelected: {
    transform: [{ scale: 1.02 }],
  },
  jobCardInner: {
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Theme.shadows.small,
    minHeight: 100,
    position: 'relative',
  },
  jobColorIndicator: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginBottom: Theme.spacing.sm,
  },
  jobInfo: {
    flex: 1,
  },
  jobName: {
    ...Theme.typography.headline,
    color: colors.text,
    marginBottom: Theme.spacing.xs,
    fontWeight: '600',
  },
  jobNameSelected: {
    color: colors.primary,
  },
  jobCompany: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  jobCompanySelected: {
    color: colors.textSecondary,
  },
  jobHours: {
    ...Theme.typography.caption2,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  jobHoursSelected: {
    color: colors.primary,
  },
  jobDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobRate: {
    ...Theme.typography.caption2,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  jobRateSelected: {
    color: colors.primary,
  },
  selectedIndicator: {
    position: 'absolute',
    top: Theme.spacing.sm,
    right: Theme.spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addJobCard: {
    width: 160,
    marginHorizontal: Theme.spacing.xs,
  },
  addJobCardInner: {
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)',
    borderWidth: 2,
    borderColor: isDark ? 'rgba(0, 122, 255, 0.4)' : 'rgba(0, 122, 255, 0.3)',
    borderStyle: 'dashed',
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addJobIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
    ...Theme.shadows.small,
  },
  addJobText: {
    ...Theme.typography.footnote,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
});