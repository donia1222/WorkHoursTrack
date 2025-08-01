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
import { LinearGradient } from 'expo-linear-gradient';
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
  
  const styles = getStyles(colors, isDark);

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
          <View style={styles.placeholder} />
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol size={21} name="xmark" color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <BlurView intensity={98} tint={isDark ? "dark" : "light"} style={styles.infoCard}>
            <LinearGradient
              colors={isDark ? ['rgba(0, 122, 255, 0.12)', 'rgba(0, 122, 255, 0.04)'] : ['rgba(0, 122, 255, 0.08)', 'rgba(0, 122, 255, 0.02)']}
              style={styles.infoCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          </BlurView>

          {loading ? (
            <BlurView intensity={98} tint={isDark ? "dark" : "light"} style={styles.loadingCard}>
              <LinearGradient
                colors={isDark ? ['rgba(142, 142, 147, 0.1)', 'rgba(142, 142, 147, 0.03)'] : ['rgba(142, 142, 147, 0.06)', 'rgba(142, 142, 147, 0.02)']}
                style={styles.loadingCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <IconSymbol size={32} name="gear" color={colors.textSecondary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('job_selector.loading')}</Text>
            </BlurView>
          ) : jobs.length === 0 ? (
            <BlurView intensity={98} tint={isDark ? "dark" : "light"} style={styles.emptyCard}>
              <LinearGradient
                colors={isDark ? ['rgba(255, 59, 48, 0.1)', 'rgba(255, 59, 48, 0.03)'] : ['rgba(255, 59, 48, 0.06)', 'rgba(255, 59, 48, 0.02)']}
                style={styles.emptyCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
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
                  <BlurView intensity={98} tint={isDark ? "dark" : "light"} style={styles.jobCardInner}>
                    <LinearGradient
                      colors={isDark ? ['rgba(34, 197, 94, 0.08)', 'rgba(34, 197, 94, 0.02)'] : ['rgba(34, 197, 94, 0.05)', 'rgba(34, 197, 94, 0.015)']}
                      style={styles.jobCardGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <View style={styles.jobInfo}>
                      <View style={[styles.jobColorDot, { backgroundColor: job.color }]} />
                      <View style={styles.jobDetails}>
                        <Text style={[styles.jobName, { color: colors.text }]}>{job.name}</Text>
                        {job.company && (
                          <Text style={[styles.jobCompany, { color: colors.textSecondary }]}>{job.company}</Text>
                        )}
                        <View style={styles.jobMeta}>
                    
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
                      <IconSymbol size={21} name="chevron.right" color={colors.primary} />
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

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
    textShadowColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  infoCard: {
    borderRadius: 24,
    padding: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  infoCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    color: colors.textSecondary,
    position: 'relative',
    zIndex: 1,
  },
  loadingCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    shadowColor: colors.textSecondary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  loadingCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptyCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    shadowColor: colors.error,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  emptyCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
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
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    shadowColor: colors.success,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  jobCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 20,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
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
    padding: 12,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.15)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 122, 255, 0.2)',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});