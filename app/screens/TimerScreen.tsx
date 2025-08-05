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
  StatusBar,
  Modal,
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
import NoJobsWarning from '../components/NoJobsWarning';
import JobFormModal from '../components/JobFormModal';
import TimerSuccessModal from '../components/TimerSuccessModal';
import { Job, WorkDay, StoredActiveSession } from '../types/WorkTypes';
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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    color: colors.text,
    letterSpacing: -0.3,
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
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 12,
  },
  timerCard: {
    marginVertical: 20,
    marginHorizontal: 4,
    borderRadius: 28,
    padding: 40,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 0.5,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
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
    justifyContent: 'center',
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 28,
    paddingVertical: 16,
  },
  timerTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  timerTime: {
    fontSize: 72,
    fontWeight: '100',
    fontFamily: 'System',
    marginBottom: 12,
    color: colors.text,
    textShadowColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
    letterSpacing: -2,
    textAlign: 'center',
  },
  timerHours: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  notesEditButton: {
    position: 'absolute',
    top: -8,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    shadowColor: colors.textSecondary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    paddingTop: 8,
  },
  activeControls: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.6)',
    overflow: 'hidden',
    transform: [{ scale: 1 }],
  },
  controlButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  startButton: {
    minWidth: 160,
    height: 64,
    justifyContent: 'center',
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOpacity: 0.4,
  },
  pauseButton: {
    backgroundColor: colors.warning,
    minWidth: 72,
    height: 56,
    shadowColor: colors.warning,
    shadowOpacity: 0.3,
  },
  resumeButton: {
    backgroundColor: colors.success,
    minWidth: 72,
    height: 56,
    shadowColor: colors.success,
    shadowOpacity: 0.3,
  },
  stopButton: {
    backgroundColor: colors.error,
    minWidth: 72,
    height: 56,
    shadowColor: colors.error,
    shadowOpacity: 0.3,
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
    marginVertical: 8,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.surface,
    shadowColor: '#000',
       paddingBottom: 44,
    shadowOffset: {
      width: 0,
      height: 1,
      
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    color: colors.text,
  },
  quickActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
  autoTimerQuickButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(0, 122, 255, 0.25)' : 'rgba(0, 122, 255, 0.18)',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  statsQuickButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.08)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.18)',
    shadowColor: '#22C55E',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  autoTimerQuickButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  autoTimerQuickButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  autoTimerQuickButtonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  autoTimerQuickButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  compactJobSelector: {
marginTop: -4,
    paddingHorizontal: 16,
  },


    compactJobSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  compactJobTabs: {
    flexDirection: 'row',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    borderRadius: 16,
    padding: 6,
    gap: 8,
  },
  compactJobTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
    justifyContent: 'center',
  },
  compactJobTabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactJobTabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactJobTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  compactJobTabTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  compactJobScrollContainer: {
    maxHeight: 60,
  },
  recentSessionsContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  recentSessionsHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  recentSessionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  viewStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: colors.primary + '12',
    borderWidth: 1.5,
    borderColor: colors.primary + '25',
    gap: 8,
    minWidth: 160,
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  viewStatsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  recentSessionsList: {
    paddingLeft: 20,
  },
  recentSessionCard: {
    width: 200,
    marginRight: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    shadowColor: colors.textSecondary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  recentSessionCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  recentSessionDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  recentSessionTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  recentSessionJob: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  recentSessionJobDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recentSessionJobName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
  },
  recentSessionHours: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },
  recentSessionHoursLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  deleteSessionButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyRecentSessions: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  emptyRecentSessionsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalNotesInput: {
    flex: 1,
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    backgroundColor: colors.surface,
    minHeight: 200,
  },
  modalNotesHint: {
    fontSize: 12,
    marginTop: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default function TimerScreen({ onNavigate }: TimerScreenProps) {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { triggerHaptic } = useHapticFeedback();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [showAllJobs, setShowAllJobs] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [autoTimerElapsedTime, setAutoTimerElapsedTime] = useState(0);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [notes, setNotes] = useState('');
  const [autoTimerStatus, setAutoTimerStatus] = useState<AutoTimerStatus | null>(null);
  const [autoTimerService] = useState(() => AutoTimerService.getInstance());
  const { handleBack } = useBackNavigation();
  const { selectedJob, setSelectedJob } = useNavigation();
  const [isJobFormModalVisible, setIsJobFormModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{
    hours: number;
    totalHours?: number;
    isUpdate: boolean;
  }>({ hours: 0, isUpdate: false });
  const [recentTimerSessions, setRecentTimerSessions] = useState<WorkDay[]>([]);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  
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
    loadRecentTimerSessions();
  }, []);

  // Register header notes button handler
  useEffect(() => {
    // Register the notes handler globally
    globalThis.timerScreenNotesHandler = () => {
      setNotesModalVisible(true);
    };

    // Cleanup on unmount
    return () => {
      delete globalThis.timerScreenNotesHandler;
    };
  }, []);

  // Recargar sesiones cuando cambie el trabajo seleccionado
  useEffect(() => {
    loadRecentTimerSessions();
  }, [selectedJobId, showAllJobs]);

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
        remainingTime: status.remainingTime,
        remainingFormatted: status.remainingTime >= 60 
          ? `${Math.floor(status.remainingTime / 60)}:${Math.floor(status.remainingTime % 60).toString().padStart(2, '0')}`
          : `${Math.floor(status.remainingTime)}s`
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
    // When paused, keep the elapsed time static (it's already set in pauseTimer)
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
        const isPaused = (sessionData as any).isPaused || false;
        const pausedElapsedTime = (sessionData as any).pausedElapsedTime || 0;
        console.log('🔄 TimerScreen setting active session, isPaused:', isPaused, 'pausedElapsedTime:', pausedElapsedTime, 'for job:', sessionData.jobId);
        
        setActiveSession({
          ...sessionData,
          startTime: new Date(sessionData.startTime),
        });
        setSelectedJobId(sessionData.jobId);
        setNotes(sessionData.notes || '');
        setIsRunning(!isPaused); // Si está pausado, no está corriendo
        
        if (isPaused && pausedElapsedTime > 0) {
          // If paused, show the paused elapsed time
          setElapsedTime(pausedElapsedTime);
          console.log('⏸️ Timer loaded in paused state with elapsed time:', pausedElapsedTime);
        } else {
          // If running, calculate current elapsed time
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - new Date(sessionData.startTime).getTime()) / 1000);
          setElapsedTime(elapsed);
        }
      }
    } catch (error) {
      console.error('Error loading active session:', error);
    }
  };

  const loadRecentTimerSessions = async () => {
    try {
      const allWorkDays = await JobService.getWorkDays();
      // Filtrar solo los días que NO son auto-generados (creados con timer)
      let timerSessions = allWorkDays
        .filter(day => day.type === 'work' && !day.isAutoGenerated);
      
      // Si hay un trabajo específico seleccionado y no está en modo "todos"
      if (selectedJobId && !showAllJobs) {
        timerSessions = timerSessions.filter(day => day.jobId === selectedJobId);
      }
      
      // Ordenar y limitar
      timerSessions = timerSessions
        .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
        .slice(0, 10); // Solo los últimos 10
      
      setRecentTimerSessions(timerSessions);
    } catch (error) {
      console.error('Error loading recent timer sessions:', error);
    }
  };

  const deleteTimerSession = async (sessionId: string) => {
    Alert.alert(
      t('common.confirm_delete'),
      t('timer.confirm_delete_session'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await JobService.deleteWorkDay(sessionId);
              await loadRecentTimerSessions();
              triggerHaptic('success');
            } catch (error) {
              console.error('Error deleting session:', error);
              Alert.alert('Error', t('timer.delete_session_error'));
            }
          }
        }
      ]
    );
  };

  const startTimer = async () => {
    if (!selectedJobId || showAllJobs) {
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

  const pauseTimer = async () => {
    setIsRunning(false);
    
    // Save the paused state with accumulated time
    if (activeSession) {
      try {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - activeSession.startTime.getTime()) / 1000);
        
        const sessionForStorage = {
          jobId: activeSession.jobId,
          startTime: activeSession.startTime.toISOString(),
          notes: activeSession.notes,
          isPaused: true,
          pausedElapsedTime: elapsed, // Save elapsed time at pause
        };
        
        await JobService.saveActiveSession(sessionForStorage);
        console.log(`⏸️ Timer paused with ${elapsed}s elapsed`);
      } catch (error) {
        console.error('Error pausing timer:', error);
      }
    }
  };

  const resumeTimer = async () => {
    setIsRunning(true);
    
    // When resuming, adjust the start time to account for paused time
    if (activeSession) {
      try {
        const sessionData = await JobService.getActiveSession();
        const pausedElapsedTime = (sessionData as any).pausedElapsedTime || 0;
        
        // Calculate new start time by subtracting paused elapsed time from now
        const now = new Date();
        const adjustedStartTime = new Date(now.getTime() - (pausedElapsedTime * 1000));
        
        const sessionForStorage = {
          jobId: activeSession.jobId,
          startTime: adjustedStartTime.toISOString(),
          notes: activeSession.notes,
          isPaused: false,
          pausedElapsedTime: 0, // Clear paused time
        };
        
        await JobService.saveActiveSession(sessionForStorage);
        
        // Update local state with adjusted start time
        setActiveSession({
          ...activeSession,
          startTime: adjustedStartTime,
        });
        
        console.log(`▶️ Timer resumed from ${pausedElapsedTime}s`);
      } catch (error) {
        console.error('Error resuming timer:', error);
      }
    }
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
          
        // Get the job and its schedule for today
        const job = jobs.find(j => j.id === activeSession.jobId);
        const todayDate = new Date();
        const daySchedule = job ? getScheduleForDay(job, todayDate) : null;
        
        const updatedWorkDay: Omit<WorkDay, 'id' | 'createdAt' | 'updatedAt'> = {
          date: today,
          jobId: activeSession.jobId,
          hours: updatedHours,
          notes: combinedNotes,
          overtime: updatedHours > 8,
          type: 'work',
          // Add schedule times if available
          ...(daySchedule && {
            startTime: daySchedule.startTime,
            endTime: daySchedule.endTime,
            ...(daySchedule.hasSplitShift && {
              secondStartTime: daySchedule.secondStartTime,
              secondEndTime: daySchedule.secondEndTime,
            }),
          }),
        };
        
        await JobService.updateWorkDay(existingWorkDay.id, updatedWorkDay);
        
        // Check if AutoTimer was active
        const wasAutoTimerActive = autoTimerStatus?.state === 'active';
        
        // Show success modal for updated work day
        setSuccessModalData({
          hours: parseFloat(hours.toFixed(2)),
          totalHours: parseFloat(updatedHours.toFixed(2)),
          isUpdate: true
        });
        
        // If AutoTimer was active, disable it completely
        if (wasAutoTimerActive && activeSession?.jobId) {
          console.log('🚫 Disabling AutoTimer completely for job after manual stop');
          
          // Get the job and disable its AutoTimer
          const jobs = await JobService.getJobs();
          const job = jobs.find(j => j.id === activeSession.jobId);
          
          if (job) {
            // Disable AutoTimer for this job
            const updatedJob = {
              ...job,
              autoTimer: {
                ...job.autoTimer,
                enabled: false,
                geofenceRadius: job.autoTimer?.geofenceRadius || 100,
                delayStart: job.autoTimer?.delayStart || 2,
                delayStop: job.autoTimer?.delayStop || 2,
                notifications: job.autoTimer?.notifications !== false
              }
            };
            
            await JobService.updateJob(job.id, updatedJob);
            console.log(`✅ AutoTimer disabled for job: ${job.name}`);
            
            // Stop the AutoTimer service
            autoTimerService.stop();
          }
        }
        
        setSuccessModalVisible(true);
      } else {
        // Create new work day
        // Get the job and its schedule for today
        const job = jobs.find(j => j.id === activeSession.jobId);
        const todayDate = new Date();
        const daySchedule = job ? getScheduleForDay(job, todayDate) : null;
        
        const workDay: Omit<WorkDay, 'id' | 'createdAt' | 'updatedAt'> = {
          date: today,
          jobId: activeSession.jobId,
          hours: hours,
          notes: notes,
          overtime: hours > 8,
          type: 'work',
          // Add schedule times if available
          ...(daySchedule && {
            startTime: daySchedule.startTime,
            endTime: daySchedule.endTime,
            ...(daySchedule.hasSplitShift && {
              secondStartTime: daySchedule.secondStartTime,
              secondEndTime: daySchedule.secondEndTime,
            }),
          }),
        };

        await JobService.addWorkDay(workDay);
        
        // Check if AutoTimer was active
        const wasAutoTimerActive = autoTimerStatus?.state === 'active';
        
        // Show success modal for new work day
        setSuccessModalData({
          hours: parseFloat(hours.toFixed(2)),
          isUpdate: false
        });
        
        // If AutoTimer was active, disable it completely
        if (wasAutoTimerActive && activeSession?.jobId) {
          console.log('🚫 Disabling AutoTimer completely for job after manual stop');
          
          // Get the job and disable its AutoTimer
          const jobs = await JobService.getJobs();
          const job = jobs.find(j => j.id === activeSession.jobId);
          
          if (job) {
            // Disable AutoTimer for this job
            const updatedJob = {
              ...job,
              autoTimer: {
                ...job.autoTimer,
                enabled: false,
                geofenceRadius: job.autoTimer?.geofenceRadius || 100,
                delayStart: job.autoTimer?.delayStart || 2,
                delayStop: job.autoTimer?.delayStop || 2,
                notifications: job.autoTimer?.notifications !== false
              }
            };
            
            await JobService.updateJob(job.id, updatedJob);
            console.log(`✅ AutoTimer disabled for job: ${job.name}`);
            
            // Stop the AutoTimer service
            autoTimerService.stop();
          }
        }
        
        setSuccessModalVisible(true);
      }
      
      await JobService.clearActiveSession();
      
      setActiveSession(null);
      setIsRunning(false);
      setElapsedTime(0);
      setNotes('');
      
      // Notify auto timer service about manual stop
      autoTimerService.handleManualTimerStop();
      
      // Reload recent timer sessions after saving
      await loadRecentTimerSessions();
      
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
              await autoTimerService.setManualMode();
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
    const seconds = parseInt(messageParts[1] || '0');
    const minutes = Math.ceil(seconds / 60);

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

  const handleJobFormSave = async () => {
    await loadJobs();
    setIsJobFormModalVisible(false);
  };

  // Helper function to get schedule for a specific day from job
  const getScheduleForDay = (job: Job, date: Date) => {
    if (!job.schedule) return null;
    
    const dayOfWeek = date.getDay();
    
    // Try new weeklySchedule structure first
    if (job.schedule.weeklySchedule && job.schedule.weeklySchedule[dayOfWeek]) {
      return job.schedule.weeklySchedule[dayOfWeek];
    }
    
    // Fallback to legacy structure
    if (job.schedule.workDays && job.schedule.workDays.includes(dayOfWeek)) {
      return {
        startTime: job.schedule.startTime || '09:00',
        endTime: job.schedule.endTime || '17:00',
        hasSplitShift: job.schedule.hasSplitShift || false,
        secondStartTime: job.schedule.secondStartTime,
        secondEndTime: job.schedule.secondEndTime,
        breakTime: job.schedule.breakTime || 60,
      };
    }
    
    return null;
  };

  const handleSuccessModalConfirm = (breakMinutes?: number) => {
    setSuccessModalVisible(false);
    onNavigate('reports');
  };

  const handleSuccessModalClose = () => {
    setSuccessModalVisible(false);
  };

  const renderRecentTimerSessions = () => {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.recentSessionsList}
        contentContainerStyle={{ paddingRight: 20 }}
      >
        {recentTimerSessions.map((session) => {
          const job = jobs.find(j => j.id === session.jobId);
          const sessionDate = new Date(session.date);
          const createdDate = session.createdAt ? new Date(session.createdAt) : sessionDate;
          
          return (
            <BlurView 
              key={session.id} 
              intensity={95} 
              tint={isDark ? "dark" : "light"} 
              style={styles.recentSessionCard}
            >
              <LinearGradient
                colors={isDark ? 
                  ['rgba(142, 142, 147, 0.08)', 'rgba(142, 142, 147, 0.03)'] : 
                  ['rgba(142, 142, 147, 0.05)', 'rgba(142, 142, 147, 0.02)']
                }
                style={styles.recentSessionCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              
              {/* Delete Button */}
              <TouchableOpacity 
                style={styles.deleteSessionButton}
                onPress={() => {
                  triggerHaptic('light');
                  deleteTimerSession(session.id);
                }}
                activeOpacity={0.7}
              >
                <IconSymbol size={12} name="xmark" color={colors.textSecondary} />
              </TouchableOpacity>
              
              <Text style={styles.recentSessionDate}>
                {sessionDate.toLocaleDateString(
                  language === 'es' ? 'es-ES' : 
                  language === 'en' ? 'en-US' : 
                  language === 'de' ? 'de-DE' : 
                  language === 'fr' ? 'fr-FR' : 
                  language === 'it' ? 'it-IT' : 'en-US', 
                  { 
                    day: 'numeric', 
                    month: 'short' 
                  }
                ).replace(/\.$/, '')}
              </Text>
              
              <Text style={styles.recentSessionTime}>
                {createdDate.toLocaleTimeString(
                  language === 'es' ? 'es-ES' : 
                  language === 'en' ? 'en-US' : 
                  language === 'de' ? 'de-DE' : 
                  language === 'fr' ? 'fr-FR' : 
                  language === 'it' ? 'it-IT' : 'en-US', 
                  { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }
                )}
              </Text>
              
              {job && (
                <View style={styles.recentSessionJob}>
                  <View style={[styles.recentSessionJobDot, { backgroundColor: job.color }]} />
                  <Text style={styles.recentSessionJobName} numberOfLines={1}>
                    {job.name}
                  </Text>
                </View>
              )}
              
              <Text style={styles.recentSessionHours}>
                {session.hours.toFixed(1)}h
              </Text>
              <Text style={styles.recentSessionHoursLabel}>
                {session.overtime ? t('timer.overtime') : t('timer.regular')}
              </Text>
            </BlurView>
          );
        })}
      </ScrollView>
    );
  };

  const renderCompactJobSelector = () => {
    console.log('🔄 renderCompactJobSelector called with jobs:', jobs.length, 'isRunning:', isRunning, 'activeSession:', !!activeSession);
    if (jobs.length === 0) return null;
    
    if (jobs.length === 1) {
      // Para 1 trabajo, mostrar como seleccionado
      const job = jobs[0];
      return (
        <View style={styles.compactJobSelector}>
          <View style={styles.compactJobTabs}>
            <View style={[styles.compactJobTab, styles.compactJobTabActive]}>
              <View style={[styles.compactJobTabDot, { backgroundColor: job.color }]} />
              <Text style={[styles.compactJobTabText, styles.compactJobTabTextActive]} numberOfLines={1}>
                {job.name}
              </Text>
              
            </View>
          </View>
        </View>
      );
    }
    
    if (jobs.length <= 3) {
      // Para 2-3 trabajos, mostrar como pestañas
      return (
        <View style={styles.compactJobSelector}>
          {jobs.length > 1 && (
            <Text style={styles.compactJobSelectorTitle}>{t('calendar.filter_by_job')}</Text>
          )}
          <View style={styles.compactJobTabs}>
            {/* All Jobs Button */}
            <TouchableOpacity
              style={[
                styles.compactJobTab,
                showAllJobs && styles.compactJobTabActive
              ]}
              onPress={() => {
                triggerHaptic('light');
                setShowAllJobs(true);
                setSelectedJobId('');
              }}
              activeOpacity={0.7}
            >
              <Text 
                style={[
                  styles.compactJobTabText,
                  showAllJobs && styles.compactJobTabTextActive
                ]}
                numberOfLines={1}
              >
                {t('timer.all_jobs')}
              </Text>
            </TouchableOpacity>
            
            {jobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={[
                  styles.compactJobTab,
                  selectedJobId === job.id && styles.compactJobTabActive
                ]}
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedJobId(job.id);
                  setShowAllJobs(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.compactJobTabDot, { backgroundColor: job.color }]} />
                <Text 
                  style={[
                    styles.compactJobTabText,
                    selectedJobId === job.id && styles.compactJobTabTextActive
                  ]}
                  numberOfLines={1}
                >
                  {job.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    } else {
      // Para más de 3 trabajos, mostrar como scroll horizontal
      return (
        <View style={styles.compactJobSelector}>
          {jobs.length > 1 && (
            <Text style={styles.compactJobSelectorTitle}>{t('job_selector.title')}</Text>
          )}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.compactJobScrollContainer}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            {/* All Jobs Button */}
            <TouchableOpacity
              style={[
                styles.compactJobTab,
                showAllJobs && styles.compactJobTabActive,
                { 
                  flex: 0,
                  minWidth: 80,
                  marginRight: 8
                }
              ]}
              onPress={() => {
                triggerHaptic('light');
                setShowAllJobs(true);
                setSelectedJobId('');
              }}
              activeOpacity={0.7}
            >
              <Text 
                style={[
                  styles.compactJobTabText,
                  showAllJobs && styles.compactJobTabTextActive
                ]}
                numberOfLines={1}
              >
                {t('timer.all_jobs')}
              </Text>
            </TouchableOpacity>
            
            {jobs.map((job, index) => (
              <TouchableOpacity
                key={job.id}
                style={[
                  styles.compactJobTab,
                  selectedJobId === job.id && styles.compactJobTabActive,
                  { 
                    flex: 0,
                    minWidth: 120,
                    marginRight: index < jobs.length - 1 ? 8 : 0
                  }
                ]}
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedJobId(job.id);
                  setShowAllJobs(false);
                }}
              >
                <View style={[styles.compactJobTabDot, { backgroundColor: job.color }]} />
                <Text 
                  style={[
                    styles.compactJobTabText,
                    selectedJobId === job.id && styles.compactJobTabTextActive
                  ]}
                  numberOfLines={1}
                >
                  {job.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>

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
                  onPress={async () => {
                    await autoTimerService.cancelPendingAction();
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
                  onPress={async () => {
                    await autoTimerService.setManualMode();
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
                  {(() => {
                    const totalSeconds = Math.floor(autoTimerStatus.remainingTime);
                    if (totalSeconds >= 60) {
                      const minutes = Math.floor(totalSeconds / 60);
                      const seconds = totalSeconds % 60;
                      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    } else {
                      return `${totalSeconds}s`;
                    }
                  })()}
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
            {!isRunning && !activeSession && jobs.length > 0 && (
              <View style={styles.section}>
                {renderCompactJobSelector()}
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
              <View style={styles.timerTimeContainer}>
                <Animated.Text style={[styles.timerTime, animatedTimeTextStyle]}>
                  {formatTime(elapsedTime)}
                </Animated.Text>
 
              </View>
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
                  disabled={!selectedJobId && !showAllJobs}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#34C759', '#28A745', '#1F7A40']}
                    style={styles.controlButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <IconSymbol size={24} name="play.fill" color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <View style={styles.activeControls}>
                  {isRunning ? (
                    <Animated.View style={animatedButtonStyle}>
                      <TouchableOpacity
                        style={[styles.controlButton, styles.pauseButton]}
                        onPress={() => { triggerHaptic('medium'); pauseTimer(); }}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={['#FF9500', '#E6820C', '#D17200']}
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
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={['#34C759', '#28A745', '#1F7A40']}
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
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#FF3B30', '#DB1D1D', '#C41E3A']}
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

        {/* Recent Timer Sessions - Only show if there are sessions */}
        {recentTimerSessions.length > 0 && (
          <View style={styles.recentSessionsContainer}>
            <View style={styles.recentSessionsHeader}>
              <Text style={styles.recentSessionsTitle}>
                {t('timer.recent_sessions')}
              </Text>
            </View>
            {renderRecentTimerSessions()}
          </View>
        )}

        {/* Quick Actions - Moved below recent sessions */}
        {!isRunning && !activeSession && (
          <View style={styles.quickActions}>
            <Text style={styles.quickActionsTitle}>{t('timer.quick_actions')}</Text>
            <View style={styles.quickActionButtons}>
              <TouchableOpacity 
                style={styles.autoTimerQuickButton}
                onPress={() => {
                  triggerHaptic('light');
                  setIsJobFormModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isDark ? 
                    ['rgba(0, 122, 255, 0.2)', 'rgba(0, 122, 255, 0.05)'] : 
                    ['rgba(0, 122, 255, 0.15)', 'rgba(0, 122, 255, 0.03)']
                  }
                  style={styles.autoTimerQuickButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.autoTimerQuickButtonContent}>
                  <View style={styles.autoTimerQuickButtonIcon}>
                    <IconSymbol size={16} name="location.fill" color={colors.primary} />
                  </View>
                  <Text style={styles.autoTimerQuickButtonText}>
                    AUTOTIMER
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.statsQuickButton}
                onPress={() => {
                  triggerHaptic('light');
                  onNavigate('reports');
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isDark ? 
                    ['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.05)'] : 
                    ['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.03)']
                  }
                  style={styles.autoTimerQuickButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.autoTimerQuickButtonContent}>
                  <View style={[styles.autoTimerQuickButtonIcon, { backgroundColor: '#22C55E' + '20' }]}>
                    <IconSymbol size={16} name="chart.bar.fill" color="#22C55E" />
                  </View>
                  <Text style={[styles.autoTimerQuickButtonText, { color: '#22C55E' }]}>
                    ESTADÍSTICAS
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <Text style={[styles.quickActionText, { textAlign: 'center', marginTop: 6, fontSize: 10, lineHeight: 12, opacity: 0.7 }]}>
              {t('timer.auto_timer.privacy_notice_short')}
            </Text>
          </View>
        )}


          </>
        )}
      </ScrollView>

      <JobFormModal
        visible={isJobFormModalVisible}
        onClose={() => setIsJobFormModalVisible(false)}
        editingJob={selectedJobId ? jobs.find(job => job.id === selectedJobId) : null}
        onSave={handleJobFormSave}
        initialTab="auto"
        onNavigateToSubscription={() => onNavigate('subscription')}
      />

      <TimerSuccessModal
        visible={successModalVisible}
        hours={successModalData.hours}
        totalHours={successModalData.totalHours}
        isUpdate={successModalData.isUpdate}
        onConfirm={handleSuccessModalConfirm}
        onClose={handleSuccessModalClose}
      />

      {/* Notes Modal */}
      <Modal
        visible={notesModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setNotesModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <IconSymbol size={24} name="xmark" color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('timer.session_notes')}</Text>
            <TouchableOpacity 
              onPress={() => {
                triggerHaptic('success');
                setNotesModalVisible(false);
              }}
              style={styles.modalSaveButton}
            >
              <IconSymbol size={20} name="checkmark" color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <TextInput
              style={[styles.modalNotesInput, { color: colors.text, borderColor: colors.border }]}
              placeholder={t('timer.notes_placeholder')}
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.modalNotesHint}>
              {t('timer.notes_hint')}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

