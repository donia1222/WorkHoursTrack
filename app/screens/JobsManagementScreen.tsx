import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import type { IconSymbolName } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { BlurView } from 'expo-blur';
import { Job } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import JobFormModal from '../components/JobFormModal';

interface JobsManagementScreenProps {
  onNavigate?: (screen: string) => void;
  onClose?: () => void;
  openAddModal?: boolean;
  editJob?: Job;
  initialTab?: 'basic' | 'schedule' | 'financial' | 'billing' | 'auto';
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
    marginLeft: Theme.spacing.md,
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
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
  },
  section: {
    marginVertical: Theme.spacing.md,
  },
  sectionTitle: {
    ...Theme.typography.headline,
    color: colors.text,
    marginBottom: Theme.spacing.md,
    fontWeight: '600',
  },
  jobCard: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.medium,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobColorIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: Theme.spacing.sm,
  },
  jobMainInfo: {
    flex: 1,
  },
  jobName: {
    ...Theme.typography.headline,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  jobCompany: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
  },
  inactiveText: {
    opacity: 0.7,
  },
  jobActions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  actionButton: {
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
  },
  jobDetails: {
    gap: Theme.spacing.xs,
  },
  jobDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobDetailText: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    marginLeft: Theme.spacing.xs,
    flex: 1,
  },
  emptyCard: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    ...Theme.shadows.medium,
  },
  emptyText: {
    ...Theme.typography.callout,
    color: colors.textSecondary,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  emptyButton: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: Theme.borderRadius.md,
  },
  emptyButtonText: {
    ...Theme.typography.footnote,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addNewJobButton: {
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
    marginHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    ...Theme.shadows.medium,
  },
  addNewJobButtonText: {
    ...Theme.typography.callout,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default function JobsManagementScreen({ onNavigate, onClose, openAddModal = false, editJob, initialTab }: JobsManagementScreenProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { triggerHaptic } = useHapticFeedback();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showAddModal, setShowAddModal] = useState(openAddModal);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  
  const styles = getStyles(colors, isDark);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (openAddModal) {
      setShowAddModal(true);
    }
    if (editJob) {
      setEditingJob(editJob);
      setShowAddModal(true);
    }
  }, [openAddModal, editJob]);

  const loadJobs = async () => {
    try {
      const loadedJobs = await JobService.getJobs();
      setJobs(loadedJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const handleAddJob = () => {
    setEditingJob(null);
    setShowAddModal(true);
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setShowAddModal(true);
  };

  const handleDeleteJob = (job: Job) => {
    Alert.alert(
      t('jobs_management.delete.title'),
      t('jobs_management.delete.message', { jobName: job.name }),
      [
        { text: t('jobs_management.delete.cancel'), style: 'cancel' },
        {
          text: t('jobs_management.delete.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await JobService.deleteJob(job.id);
              await loadJobs();
              Alert.alert(t('maps.success'), t('jobs_management.delete.success'));
            } catch (error) {
              console.error('Error deleting job:', error);
              Alert.alert(t('job_form.errors.error_title'), t('jobs_management.delete.error'));
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (job: Job) => {
    try {
      await JobService.updateJob(job.id, { isActive: !job.isActive });
      await loadJobs();
    } catch (error) {
      console.error('Error toggling job status:', error);
      Alert.alert(t('job_form.errors.error_title'), t('jobs_management.update_error'));
    }
  };

  const activeJobs = (jobs || []).filter(job => job && job.isActive);
  const inactiveJobs = (jobs || []).filter(job => job && !job.isActive);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <View style={styles.titleContainer}>
              <IconSymbol size={20} name="briefcase.fill" color={colors.primary} />
              <Text style={styles.headerTitle}>{t('jobs_management.title')}</Text>
            </View>
            <Text style={styles.headerSubtitle}>{t('jobs_management.subtitle')}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => { triggerHaptic('light'); onClose?.(); }}
            style={styles.closeButton}
          >
            <IconSymbol size={24} name="xmark" color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('jobs_management.active_jobs', { count: activeJobs.length.toString() })}</Text>
          {activeJobs.length > 0 ? (
            activeJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onEdit={() => handleEditJob(job)}
                onDelete={() => handleDeleteJob(job)}
                onToggleActive={() => handleToggleActive(job)}
              />
            ))
          ) : (
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.emptyCard}>
              <IconSymbol size={32} name="calendar" color={colors.textTertiary} />
              <Text style={styles.emptyText}>{t('jobs_management.no_active_jobs')}</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => { triggerHaptic('light'); handleAddJob(); }}>
                <Text style={styles.emptyButtonText}>{t('jobs_management.add_job')}</Text>
              </TouchableOpacity>
            </BlurView>
          )}
        </View>

        {/* Inactive jobs */}
        {inactiveJobs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('jobs_management.inactive_jobs', { count: inactiveJobs.length.toString() })}</Text>
            {inactiveJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onEdit={() => handleEditJob(job)}
                onDelete={() => handleDeleteJob(job)}
                onToggleActive={() => handleToggleActive(job)}
                isInactive
              />
            ))}
          </View>
        )}
        
        {/* Add New Job Button */}
        <TouchableOpacity 
          style={styles.addNewJobButton}
          onPress={() => { triggerHaptic('medium'); handleAddJob(); }}
        >
          <IconSymbol size={24} name="plus" color="#FFFFFF" />
          <Text style={styles.addNewJobButtonText}>
            {t('jobs_management.add_new_job_button')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <JobFormModal
        visible={showAddModal}
        editingJob={editingJob}
        initialTab={initialTab}
        onClose={() => {
          setShowAddModal(false);
          setEditingJob(null);
        }}
        onSave={async () => {
          await loadJobs();
          setShowAddModal(false);
          setEditingJob(null);
        }}
        onNavigateToCalendar={() => onNavigate?.('calendar')}
        onNavigateToSubscription={() => onNavigate?.('subscription')}
      />
    </SafeAreaView>
  );
}

interface JobCardProps {
  job: Job;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isInactive?: boolean;
}

function JobCard({ job, onEdit, onDelete, onToggleActive, isInactive }: JobCardProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { triggerHaptic } = useHapticFeedback();
  const styles = getStyles(colors, isDark);
  
  return (
    <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={[styles.jobCard, isInactive && styles.inactiveCard]}>
      <View style={styles.jobCardHeader}>
        <View style={styles.jobInfo}>
          <View style={[styles.jobColorIndicator, { backgroundColor: job.color }]} />
          <View style={styles.jobMainInfo}>
            <Text style={[styles.jobName, isInactive && styles.inactiveText]}>{job.name}</Text>
            {job.company && (
              <Text style={[styles.jobCompany, isInactive && styles.inactiveText]}>{job.company}</Text>
            )}
          </View>
        </View>
        <View style={styles.jobActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => { triggerHaptic('light'); onEdit(); }}>
            <IconSymbol size={18} name="gear" color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => { triggerHaptic('medium'); onToggleActive(); }}>
            <IconSymbol 
              size={18} 
              name={(isInactive ? "play.fill" : "pause.fill") as IconSymbolName} 
              color={isInactive ? colors.success : colors.warning} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => { triggerHaptic('warning'); onDelete(); }}>
            <IconSymbol size={18} name="xmark" color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.jobDetailRow}>
          <IconSymbol size={16} name="clock.fill" color={colors.textSecondary} />
          <Text style={styles.jobDetailText}>{t('jobs_management.default_hours', { hours: (job.defaultHours || 8).toString() })}</Text>
        </View>
        
        {job.salary && job.salary.amount > 0 && (
          <View style={styles.jobDetailRow}>
            <IconSymbol size={16} name="dollarsign.circle.fill" color={colors.success} />
            <Text style={styles.jobDetailText}>
              {job.salary.amount} {job.salary.currency}/{job.salary.type === 'hourly' ? t('jobs_management.per_hour') : job.salary.type === 'monthly' ? t('jobs_management.per_month') : t('jobs_management.per_year')}
            </Text>
          </View>
        )}
        
        {job.schedule && (
          <View style={styles.jobDetailRow}>
            <IconSymbol size={16} name="clock.fill" color={colors.primary} />
            <Text style={styles.jobDetailText}>
              {job.schedule.startTime} - {job.schedule.endTime}
            </Text>
          </View>
        )}
        
        {job.billing?.enabled && (
          <View style={styles.jobDetailRow}>
            <IconSymbol size={16} name="chart.bar.fill" color={colors.warning} />
            <Text style={styles.jobDetailText}>{t('jobs_management.billing_enabled')}</Text>
          </View>
        )}
        
        {job.hourlyRate && job.hourlyRate > 0 && (
          <View style={styles.jobDetailRow}>
            <IconSymbol size={16} name="chart.bar.fill" color={colors.textSecondary} />
            <Text style={styles.jobDetailText}>
              {t('jobs_management.billing_rate', { rate: job.hourlyRate, currency: job.currency || 'EUR' })}
            </Text>
          </View>
        )}
        
        {job.location?.address && (
          <View style={styles.jobDetailRow}>
            <IconSymbol size={16} name="location.fill" color={colors.textSecondary} />
            <Text style={styles.jobDetailText} numberOfLines={1}>{job.location.address}</Text>
          </View>
        )}
      </View>
    </BlurView>
  );
}


