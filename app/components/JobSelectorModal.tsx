import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Job } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import JobStatisticsModal from './JobStatisticsModal';

interface JobSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onJobSelect: (job: Job) => void;
  title: string;
  subtitle: string;
}

export default function JobSelectorModal({ 
  visible, 
  onClose, 
  onJobSelect, 
  title, 
  subtitle 
}: JobSelectorModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [selectedJobForStats, setSelectedJobForStats] = useState<Job | null>(null);

  useEffect(() => {
    if (visible) {
      loadJobs();
    }
  }, [visible]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const loadedJobs = await JobService.getJobs();
      setJobs(loadedJobs.filter(job => job.isActive));
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJobSelect = (job: Job) => {
    onJobSelect(job);
    onClose();
  };

  const handleShowStatistics = (job: Job, event: any) => {
    event.stopPropagation();
    setSelectedJobForStats(job);
    setShowStatistics(true);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol size={24} name="xmark" color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          </BlurView>

          {loading ? (
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
              <IconSymbol size={32} name="gear" color={colors.textSecondary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('job_selector.loading')}</Text>
            </BlurView>
          ) : jobs.length === 0 ? (
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <IconSymbol size={32} name="calendar" color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('job_selector.no_jobs')}</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                {t('job_selector.no_jobs_subtitle')}
              </Text>
            </BlurView>
          ) : (
            <ScrollView style={styles.jobsList} showsVerticalScrollIndicator={false}>
              {jobs.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() => handleJobSelect(job)}
                >
                  <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={[styles.jobCardInner, { backgroundColor: colors.surface }]}>
                    <View style={styles.jobInfo}>
                      <View style={[styles.jobColorDot, { backgroundColor: job.color }]} />
                      <View style={styles.jobDetails}>
                        <Text style={[styles.jobName, { color: colors.text }]}>{job.name}</Text>
                        {job.company && (
                          <Text style={[styles.jobCompany, { color: colors.textSecondary }]}>{job.company}</Text>
                        )}
                        <View style={styles.jobMeta}>
                          {job.schedule && (
                            <Text style={[styles.jobMetaText, { color: colors.textTertiary }]}>
                              {job.schedule.startTime} - {job.schedule.endTime}
                            </Text>
                          )}
                          {job.salary && job.salary.amount > 0 && (
                            <Text style={[styles.jobMetaText, { color: colors.textTertiary }]}>
                              • {job.salary.amount} {job.salary.currency}
                              /{job.salary.type === 'hourly' ? t('job_selector.time_periods.hour') : job.salary.type === 'monthly' ? t('job_selector.time_periods.month') : t('job_selector.time_periods.year')}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                    <View style={styles.jobActions}>
                      <TouchableOpacity 
                        style={styles.statsButton}
                        onPress={(event) => handleShowStatistics(job, event)}
                      >
                        <IconSymbol size={16} name="chart.bar.fill" color={colors.primary} />
                      </TouchableOpacity>
                      <IconSymbol size={16} name="chevron.right" color={colors.primary} />
                    </View>
                  </BlurView>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
      
      <JobStatisticsModal
        visible={showStatistics}
        onClose={() => {
          setShowStatistics(false);
          setSelectedJobForStats(null);
        }}
        job={selectedJobForStats}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    
  },
  emptyText: {
    fontSize: 18,
    marginTop: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
  jobsList: {
    flex: 1,
  },
  jobCard: {
    marginBottom: 16,
  },
  jobCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 16,
  },
  jobDetails: {
    flex: 1,
  },
  jobName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  jobCompany: {
    fontSize: 14,
    marginBottom: 4,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  jobMetaText: {
    fontSize: 12,
    marginRight: 12,
  },
  jobActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});