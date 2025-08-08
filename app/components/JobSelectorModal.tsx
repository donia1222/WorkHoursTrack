import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedGestureHandler, 
  withSpring, 
  withTiming,
  withRepeat,
  runOnJS 
} from 'react-native-reanimated';
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
  onNavigateToTimer?: () => void;
  showAutoTimerHeader?: boolean;
}

// Componente animado para el círculo de color
const AnimatedColorDot = ({ color, isDark }: { color: string; isDark: boolean }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Animación de pulso
    scale.value = withRepeat(
      withTiming(1.2, { duration: 1000 }),
      -1,
      true
    );
    
    // Animación de opacidad
    opacity.value = withRepeat(
      withTiming(0.6, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * 1.3 }],
    opacity: opacity.value * 0.3,
  }));

  return (
    <View style={{ position: 'relative', width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View 
        style={[
          {
            position: 'absolute',
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: color,
            opacity: 0.3,
          },
          pulseRingStyle
        ]} 
      />
      <Animated.View 
        style={[
          {
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: color,
            borderWidth: 2,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
          },
          animatedStyle
        ]} 
      />
    </View>
  );
};

export default function JobSelectorModal({ 
  visible, 
  onClose, 
  onJobSelect, 
  title, 
  subtitle,
  onNavigateToTimer,
  showAutoTimerHeader = false 
}: JobSelectorModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [selectedJobForStats, setSelectedJobForStats] = useState<Job | null>(null);
  const [activeTimers, setActiveTimers] = useState<{ [jobId: string]: number }>({});
  
  const screenHeight = Dimensions.get('window').height;
  const styles = getStyles(colors, isDark, jobs.length, screenHeight);
  
  // Animation values for gesture
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      loadJobs();
      checkActiveTimers();
    }
  }, [visible]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (visible && Object.keys(activeTimers).length > 0) {
      interval = setInterval(() => {
        checkActiveTimers();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [visible, activeTimers]);

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

  const checkActiveTimers = async () => {
    try {
      const activeSession = await JobService.getActiveSession();
      if (activeSession) {
        const startTime = new Date(activeSession.startTime);
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setActiveTimers({ [activeSession.jobId]: elapsedSeconds });
      } else {
        setActiveTimers({});
      }
    } catch (error) {
      console.error('Error checking active timers:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Gesture handler for drag to close
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startY = translateY.value;
    },
    onActive: (event, context: any) => {
      const newTranslateY = context.startY + event.translationY;
      if (newTranslateY >= 0) {
        translateY.value = newTranslateY;
        // Fade out as user drags down
        const progress = Math.min(newTranslateY / 100, 1);
        opacity.value = 1 - progress * 0.5;
      }
    },
    onEnd: (event) => {
      const shouldClose = event.translationY > 80 || event.velocityY > 500;
      
      if (shouldClose) {
        translateY.value = withTiming(screenHeight, { duration: 250 });
        opacity.value = withTiming(0, { duration: 250 });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        opacity.value = withSpring(1, { damping: 15, stiffness: 150 });
      }
    },
  });

  // Animated style for modal container
  const animatedModalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Reset animation values when modal opens/closes
  useEffect(() => {
    if (visible) {
      translateY.value = 0;
      opacity.value = 1;
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View style={[styles.modalContainer, animatedModalStyle]}>
            {/* Drag handle */}
            <View style={styles.dragHandle} />
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <IconSymbol size={30} name="xmark.circle.fill" color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
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
                  activeOpacity={0.7}
                >
                  <BlurView intensity={98} tint={isDark ? "dark" : "light"} style={styles.jobCardInner}>
                    {job.autoTimer?.enabled && showAutoTimerHeader && (
                      <TouchableOpacity 
                        style={styles.autoTimerHeader}
                        onPress={() => {
                          if (onNavigateToTimer) {
                            onClose();
                            onNavigateToTimer();
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.autoTimerContent}>
                          <IconSymbol size={12} name="location.fill" color="#4CD964" />
                          <Text style={styles.autoTimerHeaderText}>AutoTimer</Text>
                        </View>
                        {activeTimers[job.id] && (
                          <View style={styles.timerBadge}>
                            <IconSymbol size={10} name="clock.fill" color="#4CD964" />
                            <Text style={styles.timerText}>{formatTime(activeTimers[job.id])}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                    <LinearGradient
                      colors={[
                        `${job.color}15`,
                        `${job.color}08`,
                        `${job.color}03`
                      ]}
                      style={styles.jobCardGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <View style={styles.jobContent}>
                      <View style={styles.jobInfo}>
                        <View style={[styles.jobIconContainer, { backgroundColor: `${job.color}20` }]}>
                          {job.autoTimer?.enabled ? (
                            <AnimatedColorDot color={job.color} isDark={isDark} />
                          ) : (
                            <View style={[styles.jobColorDot, { backgroundColor: job.color }]} />
                          )}
                        </View>
                        <View style={styles.jobDetails}>
                          <Text style={[styles.jobName, { color: colors.text }]} numberOfLines={1}>{job.name}</Text>
                          {job.company && (
                            <Text style={[styles.jobCompany, { color: colors.textSecondary }]} numberOfLines={1}>
                              <IconSymbol size={12} name="building.2" color={colors.textTertiary} /> {job.company}
                            </Text>
                          )}
                          <View style={styles.jobMeta}>
                            {job.location?.address && (
                              <View style={styles.jobMetaItem}>
                                <IconSymbol size={12} name="map.fill" color={colors.primary} />
                                <Text style={[styles.jobMetaText, { color: colors.textTertiary }]} numberOfLines={1}>
                                  {job.location.address.split(',')[0]}
                                </Text>
                              </View>
                            )}
                            {job.salary && job.salary.amount > 0 && (
                              <View style={styles.jobMetaItem}>
                                <IconSymbol size={12} name="dollarsign.circle.fill" color={colors.success} />
                                <Text style={[styles.jobMetaText, { color: colors.textTertiary }]}>
                                  {job.salary.amount} {job.salary.currency}/{job.salary.type === 'hourly' ? 'h' : job.salary.type === 'monthly' ? 'mes' : 'año'}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      <View style={styles.jobActions}>
                        <View style={[styles.jobArrowContainer, { backgroundColor: `${colors.primary}10` }]}>
                          <IconSymbol size={16} name="chevron.right" color={colors.primary} />
                        </View>
                      </View>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
          </Animated.View>
        </PanGestureHandler>
      </View>
      
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

const getStyles = (colors: ThemeColors, isDark: boolean, jobsCount: number, screenHeight: number) => {
  // Calculate dynamic height based on jobs count - More generous sizing
  const baseHeight = 280; // Header + info card + padding
  const jobCardHeight = 120; // More space per job card
  const maxHeight = screenHeight * 0.85; // Use more screen space
  const minHeight = screenHeight * 0.45; // Much larger minimum
  
  let dynamicHeight = baseHeight + (jobsCount * jobCardHeight);
  if (dynamicHeight > maxHeight) dynamicHeight = maxHeight;
  if (dynamicHeight < minHeight) dynamicHeight = minHeight;
  
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: dynamicHeight,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    textShadowColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
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
    maxHeight: jobsCount > 3 ? 240 : 'auto', // Allow scrolling if more than 3 jobs
  },
  jobCard: {
    marginBottom: 16,
  },
  jobCardInner: {
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
  autoTimerHeader: {
    backgroundColor: 'rgba(76, 217, 100, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 217, 100, 0.2)',
  },
  autoTimerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoTimerHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4CD964',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CD964',
    letterSpacing: 0.3,
  },
  jobCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  jobContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  jobColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
  jobMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  jobMetaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  jobActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobArrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
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
});};