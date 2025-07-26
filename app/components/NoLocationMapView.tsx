import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { Job } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import JobFormModal from '../components/JobFormModal';
import JobActionModal from '../components/JobActionModal';
import { JobCardsSwiper } from '../components/JobCardsSwiperNoslocation';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  onNavigate?: (screen: string, options?: any) => void;
}

export default function NoLocationMapView({ onNavigate }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);

  // Debug state changes
  React.useEffect(() => {
    console.log('🔴 NoLocationMapView: showActionModal changed to:', showActionModal, 'selectedJob:', selectedJob?.name);
  }, [showActionModal, selectedJob]);
  const [jobStatistics, setJobStatistics] = useState<Map<string, { thisMonthHours: number; thisMonthDays: number }>>(new Map());

  useEffect(() => {
    loadJobs();
    loadJobStatistics();
  }, []);

  const loadJobStatistics = async () => {
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const workDays = await JobService.getWorkDaysForMonth(year, month);
      
      const statsMap = new Map();
      
      for (const job of jobs) {
        const jobWorkDays = workDays.filter(wd => wd.jobId === job.id);
        const thisMonthHours = jobWorkDays.reduce((total, wd) => total + (wd.hours || 0), 0);
        const thisMonthDays = jobWorkDays.length;
        
        statsMap.set(job.id, { thisMonthHours, thisMonthDays });
      }
      
      setJobStatistics(statsMap);
    } catch (error) {
      console.error('Error loading job statistics:', error);
    }
  };

  const loadJobs = async () => {
    try {
      const jobsData = await JobService.getJobs();
      console.log('📋 NoLocationMapView: Loaded jobs:', jobsData);
      
      // Filter out any invalid jobs (jobs without required fields)
      const validJobs = jobsData.filter(job => 
        job && 
        job.id && 
        job.name && 
        job.name.trim() !== ''
      );
      
      console.log('📋 NoLocationMapView: Valid jobs after filtering:', validJobs);
      setJobs(validJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const handleSaveJob = async (jobData: any) => {
    try {
      console.log('💾 NoLocationMapView: Saving job data:', jobData);
      console.log('💾 NoLocationMapView: Is editing?', !!editingJob);
      
      if (editingJob) {
        console.log('💾 NoLocationMapView: Updating job:', editingJob.id);
        await JobService.updateJob(editingJob.id, jobData);
      } else {
        console.log('💾 NoLocationMapView: Adding new job');
        const newJob = await JobService.addJob(jobData);
        console.log('💾 NoLocationMapView: New job created:', newJob);
      }
      setShowJobForm(false);
      setEditingJob(null);
      await loadJobs();
      await loadJobStatistics();
    } catch (error) {
      console.error('Error saving job:', error);
      Alert.alert('Error', 'No se pudo guardar el trabajo');
    }
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setShowJobForm(true);
  };

  const handleDeleteJob = async (job: Job) => {
    Alert.alert(
      t('maps.delete_confirm_title'),
      t('maps.delete_confirm_message', { jobName: job.name }),
      [
        { text: t('maps.cancel'), style: 'cancel' },
        {
          text: t('maps.delete_confirm_button'),
          style: 'destructive',
          onPress: async () => {
            try {
              await JobService.deleteJob(job.id);
              await loadJobs();
              await loadJobStatistics();
            } catch (error) {
              console.error('Error deleting job:', error);
              Alert.alert('Error', t('maps.delete_error'));
            }
          },
        },
      ]
    );
  };

  // Functions for JobCardsSwiper
  const handleJobPress = (job: Job) => {
    console.log('🔵 NoLocationMapView: handleJobPress called with job:', job.name);
    console.log('🔵 NoLocationMapView: Setting selectedJob and showActionModal to true');
    setSelectedJob(job);
    setShowActionModal(true);
  };

  const isJobCurrentlyActive = (_job: Job) => {
    // In no-location mode, no jobs are currently active
    return false;
  };

  const getJobScheduleStatus = (_job: Job) => {
    // In no-location mode, return null since we don't have location-based status
    return null;
  };

  const getJobStatistics = (job: Job) => {
    return jobStatistics.get(job.id) || { thisMonthHours: 0, thisMonthDays: 0 };
  };

  const handleModalAction = (action: string) => {
    setShowActionModal(false);
    
    switch (action) {
      case 'timer':
        onNavigate?.('timer');
        break;
      case 'calendar':
        onNavigate?.('calendar');
        break;
      case 'statistics':
        onNavigate?.('reports');
        break;
      case 'edit':
        if (selectedJob) {
          handleEditJob(selectedJob);
        }
        break;
      case 'delete':
        if (selectedJob) {
          handleDeleteJob(selectedJob);
        }
        break;
    }
    
    setSelectedJob(null);
  };

  const handleCloseModal = () => {
    setShowActionModal(false);
    setSelectedJob(null);
  };

  const styles = getStyles(colors, isDark);

  return (
    <View style={styles.container}>
                  <BlurView intensity={85} tint={isDark ? "dark" : "light"} style={styles.infoCardInner}>

            <View style={styles.infoContent}>
              <View style={styles.infoIconContainer}>
                <IconSymbol size={20} name="info.circle" color={colors.primary} />
              </View>
              <Text style={styles.infoText}>
                {jobs.length === 0 ? t('maps.add_job_desc') : 'Modo sin ubicación - funcionalidad limitada'}
              </Text>
            </View>
            
          </BlurView>

      {/* Header info with gradient */}
      <View style={styles.headerInfo}>
        <LinearGradient
          colors={isDark ? ['rgba(0,0,0,0.7)', 'rgba(40,40,40,0.4)'] : ['rgba(255,255,255,0.9)', 'rgba(247,250,252,0.6)']}
          style={styles.infoCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <BlurView intensity={85} tint={isDark ? "dark" : "light"} style={styles.infoCardInner}>

          </BlurView>
        </LinearGradient>
      </View>

      {/* Job Cards or Empty State */}
      {jobs.length === 0 ? (
        // No jobs state with enhanced design
        <View style={styles.emptyState}>
          <LinearGradient
            colors={isDark ? ['rgba(40,40,40,0.9)', 'rgba(20,20,20,0.6)'] : ['rgba(255,255,255,0.95)', 'rgba(250,252,255,0.8)']}
            style={styles.emptyCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.emptyCardInner}>
              <View style={styles.emptyIconContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.primary + '80']}
                  style={styles.emptyIconBackground}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <IconSymbol size={48} name="briefcase" color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>{t('maps.add_job')}</Text>
              <Text style={styles.emptySubtitle}>{t('maps.add_job_desc')}</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowJobForm(true)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primary + 'DD']}
                  style={styles.addButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <IconSymbol size={20} name="plus" color="#FFFFFF" />
                  <Text style={styles.addButtonText}>{t('maps.add_job')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          </LinearGradient>
        </View>
      ) : (
        // Job Cards Swiper
        <JobCardsSwiper
          jobs={jobs}
          onJobPress={handleJobPress}
          isJobCurrentlyActive={isJobCurrentlyActive}
          getJobScheduleStatus={getJobScheduleStatus}
          getJobStatistics={getJobStatistics}
          t={t}
        />
      )}

      {/* Job form modal */}
      <JobFormModal
        visible={showJobForm}
        onClose={() => {
          setShowJobForm(false);
          setEditingJob(null);
        }}
        onSave={handleSaveJob}
        editingJob={editingJob}
      />

      {/* Action Modal */}
      <JobActionModal
        visible={showActionModal}
        job={selectedJob}
        onClose={handleCloseModal}
        onAction={handleModalAction}
        showAutoTimer={false}
      />
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerInfo: {
    padding: 16,
  },
  infoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  infoCardInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,

  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 200, // Space for job cards
  },
  addJobSection: {
    paddingTop: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    maxWidth: 320,
    width: '100%',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  emptyCardInner: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 32,
  },
  emptyIconContainer: {
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  emptyIconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  addButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  jobsSection: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
    marginTop: 12,
    textAlign: 'center',
    textShadowColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  jobDetails: {
    flex: 1,
  },
  jobName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  jobCompany: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  jobAddress: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  jobActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  addJobButton: {
    marginBottom: 24,
  },
  addJobCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
  },
  addJobCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 10,
    borderRadius: 20,
  },
  addJobIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addJobText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  quickActions: {
    paddingBottom: 32,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '47%',
    marginBottom: 4,
  },
  quickActionCard: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  quickActionCardInner: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
    borderRadius: 24,
  },
  quickActionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  quickActionText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});