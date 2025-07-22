import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  interpolate,
  Easing
} from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import JobSelector from '../components/JobSelector';
import NoJobsWarning from '../components/NoJobsWarning';
import { Job, WorkDay } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import { useBackNavigation, useNavigation } from '../context/NavigationContext';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface TimerScreenProps {
  onNavigate: (screen: string, options?: any) => void;
}

interface ActiveSession {
  jobId: string;
  startTime: Date;
  notes: string;
}

interface StoredActiveSession {
  jobId: string;
  startTime: string;
  notes: string;
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
    marginRight: -8,
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
  section: {
    marginVertical: 12,
  },
  timerCard: {
    marginVertical: 12,
    borderRadius: 16,
    padding: 24,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  timerContent: {
    alignItems: 'center',
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerTime: {
    fontSize: 48,
    fontWeight: '300',
    fontFamily: 'System',
    marginBottom: 4,
    color: colors.text,
  },
  timerHours: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  activeJobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  jobColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  activeJobName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timerControls: {
    alignItems: 'center',
  },
  activeControls: {
    flexDirection: 'row',
    gap: 16,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  startButton: {
    minWidth: 120,
    justifyContent: 'center',
    backgroundColor: colors.success,
  },
  pauseButton: {
    backgroundColor: colors.warning,
  },
  resumeButton: {
    backgroundColor: colors.success,
  },
  stopButton: {
    backgroundColor: colors.error,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
    color: '#FFFFFF',
  },
  notesCard: {
    marginVertical: 12,
    borderRadius: 16,
    padding: 20,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: colors.text,
  },
  notesInput: {
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    color: colors.text,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  notesHint: {
    fontSize: 12,
    marginTop: 4,
    color: colors.textSecondary,
  },
  quickActions: {
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
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: colors.text,
  },
  quickActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 8,
  },
  quickActionText: {
    fontSize: 12,
    marginTop: 4,
    color: colors.textSecondary,
  },
});

export default function TimerScreen({ onNavigate }: TimerScreenProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { triggerHaptic } = useHapticFeedback();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [notes, setNotes] = useState('');
  const { handleBack } = useBackNavigation();
  const { selectedJob, setSelectedJob } = useNavigation();
  
  // Animaciones
  const pulseAnimation = useSharedValue(1);
  const glowAnimation = useSharedValue(0);
  const buttonPulse = useSharedValue(1);
  
  const styles = getStyles(colors, isDark);

  // Controla las animaciones según el estado del timer
  useEffect(() => {
    if (isRunning || activeSession) {
      // Animación de pulso suave
      pulseAnimation.value = withRepeat(
        withTiming(1.05, { 
          duration: 2000, 
          easing: Easing.inOut(Easing.ease) 
        }),
        -1,
        true
      );
      
      // Animación de glow
      glowAnimation.value = withRepeat(
        withTiming(1, { 
          duration: 2500, 
          easing: Easing.inOut(Easing.ease) 
        }),
        -1,
        true
      );
      
      // Animación sutil para el botón activo
      buttonPulse.value = withRepeat(
        withTiming(1.02, { 
          duration: 1500, 
          easing: Easing.inOut(Easing.ease) 
        }),
        -1,
        true
      );
    } else {
      // Detener animaciones
      pulseAnimation.value = withTiming(1, { duration: 300 });
      glowAnimation.value = withTiming(0, { duration: 300 });
      buttonPulse.value = withTiming(1, { duration: 300 });
    }
  }, [isRunning, activeSession]);

  // Estilos animados
  const animatedTimerStyle = useAnimatedStyle(() => {
    const glowOpacity = interpolate(glowAnimation.value, [0, 1], [0, 0.3]);
    
    return {
      transform: [{ scale: pulseAnimation.value }],
      shadowOpacity: glowOpacity,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 20,
    };
  });

  const animatedTimeTextStyle = useAnimatedStyle(() => {
    const glowIntensity = interpolate(glowAnimation.value, [0, 1], [1, 1.02]);
    
    return {
      transform: [{ scale: glowIntensity }],
    };
  });

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonPulse.value }],
    };
  });

  useEffect(() => {
    loadJobs();
    loadActiveSession();
  }, []);

  // Auto-select job if coming from map
  useEffect(() => {
    if (selectedJob && !isRunning && !activeSession) {
      setSelectedJobId(selectedJob.id);
      // Clear the selected job after using it
      setSelectedJob(null);
    }
  }, [selectedJob, isRunning, activeSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && activeSession) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - activeSession.startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, activeSession]);

  const loadJobs = async () => {
    try {
      const loadedJobs = await JobService.getJobs();
      setJobs(loadedJobs);
      
      // Only auto-select if no job is selected AND no job is coming from navigation
      if (loadedJobs.length > 0 && !selectedJobId && !selectedJob) {
        const activeJob = loadedJobs.find(job => job.isActive) || loadedJobs[0];
        setSelectedJobId(activeJob.id);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      Alert.alert('Error', t('timer.load_jobs_error'));
    }
  };

  const loadActiveSession = async () => {
    try {
      const sessionData: StoredActiveSession | null = await JobService.getActiveSession();
      if (sessionData) {
        setActiveSession({
          ...sessionData,
          startTime: new Date(sessionData.startTime),
        });
        setSelectedJobId(sessionData.jobId);
        setNotes(sessionData.notes || '');
        setIsRunning(true);
        
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - new Date(sessionData.startTime).getTime()) / 1000);
        setElapsedTime(elapsed);
      }
    } catch (error) {
      console.error('Error loading active session:', error);
    }
  };

  const startTimer = async () => {
    if (!selectedJobId) {
      Alert.alert('Error', t('timer.select_job_error'));
      return;
    }

    try {
      const sessionForStorage: StoredActiveSession = {
        jobId: selectedJobId,
        startTime: new Date().toISOString(),
        notes: notes,
      };

      const session: ActiveSession = {
        jobId: selectedJobId,
        startTime: new Date(),
        notes: notes,
      };

      await JobService.saveActiveSession(sessionForStorage);
      setActiveSession(session);
      setIsRunning(true);
      setElapsedTime(0);
    } catch (error) {
      console.error('Error starting timer:', error);
      Alert.alert('Error', t('timer.start_timer_error'));
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resumeTimer = () => {
    setIsRunning(true);
  };

  const stopTimer = async () => {
    if (!activeSession) return;

    try {
      const hours = getSessionHours();
      const workDay: Omit<WorkDay, 'id' | 'createdAt' | 'updatedAt'> = {
        date: new Date().toISOString().split('T')[0],
        jobId: activeSession.jobId,
        hours: hours,
        notes: notes,
        overtime: hours > 8,
        type: 'work',
      };

      await JobService.addWorkDay(workDay);
      await JobService.clearActiveSession();
      
      setActiveSession(null);
      setIsRunning(false);
      setElapsedTime(0);
      setNotes('');
      
      Alert.alert(t('maps.success'), t('timer.session_saved', { hours }));
    } catch (error) {
      console.error('Error stopping timer:', error);
      Alert.alert('Error', t('timer.save_error'));
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const getSessionHours = () => {
    return Math.round(elapsedTime / 1800) * 0.5; // Round to nearest 0.5 hour
  };

  const currentSelectedJob = jobs.find(job => job.id === selectedJobId);

  const handleCreateJob = () => {
    onNavigate('jobs-management', { openAddModal: true });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.placeholder} />
          <View style={styles.headerText}>
            <View style={styles.titleContainer}>
              <IconSymbol size={26} name="clock.fill" color={colors.primary} />
              <Text style={styles.headerTitle}>{t('timer.title')}</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {isRunning ? t('timer.active_session') : t('timer.ready_to_work')}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => { triggerHaptic('light'); handleBack(); }}
            style={styles.backButton}
          >
            <IconSymbol size={24} name="xmark" color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {jobs.length === 0 ? (
          <NoJobsWarning onCreateJob={handleCreateJob} />
        ) : (
          <>
            {!isRunning && !activeSession && (
              <View style={styles.section}>
                <JobSelector
                  jobs={jobs}
                  selectedJobId={selectedJobId}
                  onJobSelect={setSelectedJobId}
                  showAddButton={false}
                />
              </View>
            )}

        <BlurView 
          intensity={95} 
          tint={isDark ? "dark" : "light"} 
          style={styles.timerCard}
        >
          <View style={styles.timerContent}>
            <Animated.View style={[styles.timerDisplay, animatedTimerStyle]}>
              <Animated.Text style={[styles.timerTime, animatedTimeTextStyle]}>
                {formatTime(elapsedTime)}
              </Animated.Text>
              <Text style={styles.timerHours}>
                ≈ {getSessionHours()}h{getSessionHours() > 8 ? ` (${t('timer.overtime')})` : ''}
              </Text>
            </Animated.View>

            {activeSession && currentSelectedJob && (
              <View style={styles.activeJobInfo}>
                <View style={[styles.jobColorDot, { backgroundColor: currentSelectedJob.color }]} />
                <Text style={styles.activeJobName}>{currentSelectedJob.name}</Text>
              </View>
            )}

            <View style={styles.timerControls}>
              {!isRunning && !activeSession ? (
                <TouchableOpacity
                  style={[styles.controlButton, styles.startButton]}
                  onPress={() => { triggerHaptic('heavy'); startTimer(); }}
                  disabled={!selectedJobId}
                >
                  <IconSymbol size={20} name="play.fill" color="#FFFFFF" />
                  <Text style={styles.controlButtonText}>{t('timer.start')}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.activeControls}>
                  {isRunning ? (
                    <Animated.View style={animatedButtonStyle}>
                      <TouchableOpacity
                        style={[styles.controlButton, styles.pauseButton]}
                        onPress={() => { triggerHaptic('medium'); pauseTimer(); }}
                      >
                        <IconSymbol size={20} name="pause.fill" color="#FFFFFF" />
                        <Text style={styles.controlButtonText}>{t('timer.pause')}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  ) : (
                    <Animated.View style={animatedButtonStyle}>
                      <TouchableOpacity
                        style={[styles.controlButton, styles.resumeButton]}
                        onPress={() => { triggerHaptic('medium'); resumeTimer(); }}
                      >
                        <IconSymbol size={20} name="play.fill" color="#FFFFFF" />
                        <Text style={styles.controlButtonText}>{t('timer.resume')}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.controlButton, styles.stopButton]}
                    onPress={() => { triggerHaptic('heavy'); stopTimer(); }}
                  >
                    <IconSymbol size={20} name="stop.fill" color="#FFFFFF" />
                    <Text style={styles.controlButtonText}>{t('timer.stop')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </BlurView>

        <BlurView 
          intensity={95} 
          tint={isDark ? "dark" : "light"} 
          style={styles.notesCard}
        >
          <Text style={styles.notesTitle}>{t('timer.session_notes')}</Text>
          <TextInput
            style={styles.notesInput}
            placeholder={t('timer.notes_placeholder')}
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            editable={!isRunning}
          />
          <Text style={styles.notesHint}>
            {t('timer.notes_hint')}
          </Text>
        </BlurView>

        <BlurView 
          intensity={95} 
          tint={isDark ? "dark" : "light"} 
          style={styles.quickActions}
        >
          <Text style={styles.quickActionsTitle}>{t('timer.quick_actions')}</Text>
          <View style={styles.quickActionButtons}>
            <TouchableOpacity style={styles.quickActionButton}>
              <IconSymbol size={16} name="lightbulb.fill" color={colors.warning} />
              <Text style={styles.quickActionText}>{t('timer.tips')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <IconSymbol size={16} name="calendar" color={colors.primary} />
              <Text style={styles.quickActionText}>{t('timer.calendar')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <IconSymbol size={16} name="pause.fill" color={colors.textSecondary} />
              <Text style={styles.quickActionText}>{t('timer.break')}</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

