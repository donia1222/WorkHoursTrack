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
import { LinearGradient } from 'expo-linear-gradient';
import JobSelector from '../components/JobSelector';
import NoJobsWarning from '../components/NoJobsWarning';
import { Job, WorkDay } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import AutoTimerService, { AutoTimerStatus } from '../services/AutoTimerService';
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
    marginVertical: 16,
    borderRadius: 24,
    padding: 32,
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
  timerCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  timerContent: {
    alignItems: 'center',
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerTime: {
    fontSize: 56,
    fontWeight: '200',
    fontFamily: 'System',
    marginBottom: 8,
    color: colors.text,
    textShadowColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  timerHours: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  activeJobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
  },
  jobColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
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
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
    overflow: 'hidden',
  },
  controlButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
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
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    color: '#FFFFFF',
  },
  notesCard: {
    marginVertical: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: colors.textSecondary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  notesCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
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
  autoTimerStatusContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  autoTimerStatusCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  autoTimerStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  autoTimerStatusTitle: {
    ...Theme.typography.headline,
    color: colors.text,
    flex: 1,
    fontWeight: '600',
  },
  autoTimerStatusMessage: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  cancelAutoTimerButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  },
  autoTimerProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  autoTimerProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  autoTimerProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  autoTimerCountdown: {
    ...Theme.typography.caption2,
    color: colors.textSecondary,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  floatingAutoTimerButton: {
    position: 'absolute',
    top: 120,
    right: 16,
    zIndex: 1000,
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 10,
    minWidth: 120,
    justifyContent: 'center',
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  autoTimerSetupCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  autoTimerSetupHeader: {

    marginBottom: 12,
    marginLeft: Theme.spacing.md,
    gap: 10,
  },
  autoTimerSetupTitle: {
    ...Theme.typography.headline,
    color: colors.text,
    fontWeight: '400',
    textAlign: 'center',
  },
  autoTimerSetupDescription: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  autoTimerSetupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  autoTimerSetupButtonText: {
    ...Theme.typography.footnote,
    color: colors.primary,
    fontWeight: '600',
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
  const [autoTimerElapsedTime, setAutoTimerElapsedTime] = useState(0);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [notes, setNotes] = useState('');
  const [autoTimerStatus, setAutoTimerStatus] = useState<AutoTimerStatus | null>(null);
  const [autoTimerService] = useState(() => AutoTimerService.getInstance());
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

  // Initialize and manage auto timer service
  // AutoTimer service initialization - runs only once
  useEffect(() => {
    const handleAutoTimerStatusChange = (status: AutoTimerStatus) => {
      console.log('🔄 TimerScreen received AutoTimer status change:', {
        state: status.state,
        jobId: status.jobId,
        jobName: status.jobName,
        remainingTime: status.remainingTime
      });
      setAutoTimerStatus(status);
    };

    // Add status listener
    autoTimerService.addStatusListener(handleAutoTimerStatusChange);
    
    // Get current status immediately to sync with any ongoing countdown
    const currentStatus = autoTimerService.getStatus();
    setAutoTimerStatus(currentStatus);
    console.log('🔄 TimerScreen: Synced with current AutoTimer status:', currentStatus.state, currentStatus.remainingTime);

    // Cleanup on unmount (but don't stop the service - it should persist across screens)
    return () => {
      autoTimerService.removeStatusListener(handleAutoTimerStatusChange);
    };
  }, []); // Empty dependency array - runs only once

  // Update jobs in AutoTimer service when jobs change
  useEffect(() => {
    const updateAutoTimerJobs = async () => {
      if (jobs.length > 0) {
        console.log('🔄 TimerScreen: Updating AutoTimer with jobs:', jobs.length);
        
        // If service is not enabled, start it; otherwise just update jobs
        if (!autoTimerService.isServiceEnabled()) {
          console.log('🚀 TimerScreen: Starting AutoTimer service');
          autoTimerService.start(jobs);
        } else {
          console.log('🔄 TimerScreen: Service already running, just updating jobs');
          await autoTimerService.updateJobs(jobs);
        }
      }
    };
    
    updateAutoTimerJobs();
  }, [jobs]);

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

  // Calculate elapsed time for active AutoTimer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoTimerStatus?.state === 'active') {
      const updateAutoTimerElapsedTime = async () => {
        try {
          const activeSession = await JobService.getActiveSession();
          if (activeSession) {
            const startTime = new Date(activeSession.startTime);
            const now = new Date();
            const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            setAutoTimerElapsedTime(elapsed);
          }
        } catch (error) {
          console.error('Error calculating AutoTimer elapsed time:', error);
        }
      };

      // Update immediately and then every second
      updateAutoTimerElapsedTime();
      interval = setInterval(updateAutoTimerElapsedTime, 1000);
    } else {
      setAutoTimerElapsedTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoTimerStatus?.state]);

  // Reload active session when AutoTimer becomes active
  useEffect(() => {
    console.log('🔄 TimerScreen AutoTimer effect - state:', autoTimerStatus?.state, 'hasActiveSession:', !!activeSession);
    if (autoTimerStatus?.state === 'active' && !activeSession) {
      console.log('🔄 AutoTimer is now active but no activeSession, reloading session in TimerScreen');
      loadActiveSession();
    }
  }, [autoTimerStatus?.state, activeSession]);

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
      console.log('📱 TimerScreen loadActiveSession result:', sessionData ? 'found session' : 'no session');
      if (sessionData) {
        console.log('🔄 TimerScreen setting active session and isRunning=true for job:', sessionData.jobId);
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
      
      // Notify auto timer service about manual start
      autoTimerService.handleManualTimerStart(selectedJobId);
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
      const today = new Date().toISOString().split('T')[0];
      console.log(`Stopping timer - Elapsed time: ${elapsedTime}s, Hours: ${hours}`);
      
      // Check if there's already a work day for this date and job
      const allWorkDays = await JobService.getWorkDays();
      const existingWorkDay = allWorkDays.find(day => 
        day.date === today && 
        day.jobId === activeSession.jobId && 
        day.type === 'work'
      );
      
      if (existingWorkDay) {
        // Update existing work day - add hours
        const updatedHours = existingWorkDay.hours + hours;
        const combinedNotes = existingWorkDay.notes && notes 
          ? `${existingWorkDay.notes}\n---\n${notes}` 
          : existingWorkDay.notes || notes;
          
        const updatedWorkDay: Omit<WorkDay, 'id' | 'createdAt' | 'updatedAt'> = {
          date: today,
          jobId: activeSession.jobId,
          hours: updatedHours,
          notes: combinedNotes,
          overtime: updatedHours > 8,
          type: 'work',
        };
        
        await JobService.updateWorkDay(existingWorkDay.id, updatedWorkDay);
        Alert.alert(t('maps.success'), t('timer.session_added_to_existing', { 
          sessionHours: parseFloat(hours.toFixed(2)), 
          totalHours: parseFloat(updatedHours.toFixed(2))
        }));
      } else {
        // Create new work day
        const workDay: Omit<WorkDay, 'id' | 'createdAt' | 'updatedAt'> = {
          date: today,
          jobId: activeSession.jobId,
          hours: hours,
          notes: notes,
          overtime: hours > 8,
          type: 'work',
        };

        await JobService.addWorkDay(workDay);
        Alert.alert(t('maps.success'), t('timer.session_saved', { hours: parseFloat(hours.toFixed(2)) }));
      }
      
      await JobService.clearActiveSession();
      
      setActiveSession(null);
      setIsRunning(false);
      setElapsedTime(0);
      setNotes('');
      
      // Notify auto timer service about manual stop
      autoTimerService.handleManualTimerStop();
      
    } catch (error) {
      console.error('Error stopping timer:', error);
      Alert.alert('Error', t('timer.save_error'));
    }
  };

  const handleStopButton = async () => {
    if (autoTimerStatus?.state === 'active') {
      // If auto timer is active, give user choice to stop manually
      Alert.alert(
        t('timer.auto_timer.manual_override'),
        t('timer.auto_timer.manual_override_message'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { 
            text: t('timer.stop'), 
            style: 'destructive',
            onPress: async () => {
              await stopTimer();
              // Set auto timer to manual mode
              autoTimerService.setManualMode();
            }
          }
        ]
      );
    } else {
      await stopTimer();
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

  const getAutoTimerMessage = (status: AutoTimerStatus): string => {
    const messageParts = status.message.split(':');
    const messageType = messageParts[0];
    const minutes = messageParts[1];

    switch (messageType) {
      case 'inactive':
        return t('timer.auto_timer.inactive');
      case 'entering':
        return t('timer.auto_timer.will_start', { minutes });
      case 'active':
        return t('timer.auto_timer.started_auto');
      case 'leaving':
        return t('timer.auto_timer.will_stop', { minutes });
      case 'manual':
        return t('timer.auto_timer.manual_override');
      default:
        return status.message;
    }
  };

  const getSessionHours = () => {
    const hours = elapsedTime / 3600; // Convert seconds to hours
    // Ensure we always save at least 0.01 hours (36 seconds) for any session
    return Math.max(0.01, parseFloat(hours.toFixed(2)));
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
              {isRunning ? 
                (autoTimerStatus?.state === 'active' ? 
                  t('timer.auto_timer.started_auto') : 
                  t('timer.active_session')
                ) : 
                t('timer.ready_to_work')
              }
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

      {/* Auto Timer Status */}
      {autoTimerStatus && autoTimerStatus.state !== 'inactive' && (() => {
        const selectedJob = jobs.find(job => job.id === selectedJobId);
        const hasLocation = selectedJob?.location?.latitude && selectedJob?.location?.longitude;
        return hasLocation && selectedJob?.autoTimer?.enabled;
      })() && (
        <View style={styles.autoTimerStatusContainer}>
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.autoTimerStatusCard}>

            <View style={styles.autoTimerStatusHeader}>

              <IconSymbol 
                size={18} 
                name={
                  autoTimerStatus.state === 'entering' ? 'location.fill' :
                  autoTimerStatus.state === 'active' ? 'clock.fill' :
                  'location'
                } 
                color={
                  autoTimerStatus.state === 'active' ? colors.success : 
                  autoTimerStatus.state === 'entering' ? colors.warning : 
                  colors.primary
                } 
              />
              <Text style={styles.autoTimerStatusTitle}>
                {autoTimerStatus.jobName || 'AutoTimer'}
              </Text>

              {autoTimerStatus.state === 'active' ? (
                <TouchableOpacity 
                  onPress={handleStopButton}
                  style={[styles.cancelAutoTimerButton, { backgroundColor: colors.error + '20' }]}
                >
                  <IconSymbol size={16} name="stop.fill" color={colors.error} />
                </TouchableOpacity>
              ) : autoTimerStatus.state === 'entering' || autoTimerStatus.state === 'leaving' ? (
                // Countdown activo: mostrar botón parar
                <TouchableOpacity 
                  onPress={() => {
                    autoTimerService.cancelPendingAction();
                  }}
                  style={[styles.cancelAutoTimerButton, { backgroundColor: colors.warning + '20' }]}
                >
                  <IconSymbol size={16} name="stop.fill" color={colors.warning} />
                </TouchableOpacity>
              ) : autoTimerStatus.state === 'cancelled' ? (
                // Countdown pausado: mostrar botón reanudar
                <>
                  {console.log('📱 TimerScreen: Showing RESUME button for cancelled AutoTimer')}
                  <TouchableOpacity 
                    onPress={async () => {
                      console.log('🔄 TimerScreen: User pressed resume button');
                      await autoTimerService.manualRestart();
                    }}
                    style={[styles.cancelAutoTimerButton, { backgroundColor: colors.success + '20' }]}
                  >
                    <IconSymbol size={16} name="play.fill" color={colors.success} />
                  </TouchableOpacity>
                </>
              
              ) : (
                // Estado inactivo: botón para desactivar
                <TouchableOpacity 
                  onPress={() => {
                    autoTimerService.setManualMode();
                  }}
                  style={styles.cancelAutoTimerButton}
                >
                  <IconSymbol size={16} name="xmark" color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.autoTimerStatusMessage}>
              {getAutoTimerMessage(autoTimerStatus)}
            </Text>
            {autoTimerStatus.remainingTime > 0 && autoTimerStatus.state !== 'active' && (
              <View style={styles.autoTimerProgressContainer}>
                <View style={styles.autoTimerProgressBar}>
                  <Animated.View 
                    style={[
                      styles.autoTimerProgressFill,
                      {
                        width: `${((autoTimerStatus.totalDelayTime - autoTimerStatus.remainingTime) / autoTimerStatus.totalDelayTime) * 100}%`,
                        backgroundColor: autoTimerStatus.state === 'entering' ? colors.warning : colors.error
                      }
                    ]}
                  />
                </View>
                <Text style={styles.autoTimerCountdown}>
                  {Math.ceil(autoTimerStatus.remainingTime / 60)}m
                </Text>
              </View>
            )}
          </BlurView>
        </View>
      )}

                                     {/* Auto Timer Quick Setup */}
            {!isRunning && !activeSession && selectedJobId && autoTimerStatus?.state !== 'active' && (
              (() => {
                const selectedJob = jobs.find(job => job.id === selectedJobId);
                const hasLocation = selectedJob?.location?.latitude && selectedJob?.location?.longitude;
                const hasAutoTimer = selectedJob?.autoTimer?.enabled;
                
                if (hasLocation && hasAutoTimer) {
                  return (
                    <View style={styles.section}>
                      <View style={styles.autoTimerSetupHeader}>
                        <Text style={styles.autoTimerSetupTitle}>{t('timer.auto_timer.available_title')}</Text>
                      </View>
                    </View>
                  );
                }
                return null;
              })()
            )}

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
          intensity={98} 
          tint={isDark ? "dark" : "light"} 
          style={styles.timerCard}
        >
          <LinearGradient
            colors={isDark ? ['rgba(0, 122, 255, 0.12)', 'rgba(0, 122, 255, 0.04)'] : ['rgba(0, 122, 255, 0.08)', 'rgba(0, 122, 255, 0.02)']}
            style={styles.timerCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
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
                  <LinearGradient
                    colors={['#34C759', '#28A745', '#20874C']}
                    style={styles.controlButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <IconSymbol size={20} name="play.fill" color="#FFFFFF" />
 
                </TouchableOpacity>
              ) : (
                <View style={styles.activeControls}>
                  {isRunning ? (
                    <Animated.View style={animatedButtonStyle}>
                      <TouchableOpacity
                        style={[styles.controlButton, styles.pauseButton]}
                        onPress={() => { triggerHaptic('medium'); pauseTimer(); }}
                      >
                        <LinearGradient
                          colors={['#FF9500', '#E6820C', '#CC7300']}
                          style={styles.controlButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        />
                        <IconSymbol size={20} name="pause.fill" color="#FFFFFF" />
                  
                      </TouchableOpacity>
                    </Animated.View>
                  ) : (
                    <Animated.View style={animatedButtonStyle}>
                      <TouchableOpacity
                        style={[styles.controlButton, styles.resumeButton]}
                        onPress={() => { triggerHaptic('medium'); resumeTimer(); }}
                      >
                        <LinearGradient
                          colors={['#34C759', '#28A745', '#20874C']}
                          style={styles.controlButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        />
                        <IconSymbol size={20} name="play.fill" color="#FFFFFF" />
      
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.controlButton, styles.stopButton]}
                    onPress={() => { triggerHaptic('heavy'); handleStopButton(); }}
                  >
                    <LinearGradient
                      colors={['#FF3B30', '#E6241A', '#CC1F16']}
                      style={styles.controlButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <IconSymbol size={20} name="stop.fill" color="#FFFFFF" />
           
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </BlurView>

        <BlurView 
          intensity={98} 
          tint={isDark ? "dark" : "light"} 
          style={styles.notesCard}
        >
          <LinearGradient
            colors={isDark ? ['rgba(142, 142, 147, 0.08)', 'rgba(142, 142, 147, 0.03)'] : ['rgba(142, 142, 147, 0.05)', 'rgba(142, 142, 147, 0.02)']}
            style={styles.notesCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
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

          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

