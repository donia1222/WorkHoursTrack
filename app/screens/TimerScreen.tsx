import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  Alert,
  TextInput,
  Modal,
  Animated as RNAnimated,
  KeyboardAvoidingView,
  Platform,
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
import NotesHistoryModal from '../components/NotesHistoryModal';
import { Job, WorkDay, StoredActiveSession } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import { ManualTimerService } from '../services/ManualTimerService';

import { useNavigation } from '../context/NavigationContext';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useTimeFormat } from '../hooks/useTimeFormat';


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
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)', // Azul suave
marginTop: -16,
marginBottom: 50,
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
    backgroundColor: 'transparent',
  },
  section: {
    marginVertical: 12,
  },
  timerCard: {
    marginVertical: 12,
    marginHorizontal: 12,
    borderRadius: 28,
    padding: 20,
    marginTop: 10,
    elevation: 18,
  
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
    fontWeight: '200',
    fontFamily: 'System',
    marginBottom: 8,
    color: colors.text,
    textShadowColor: isDark ? 'rgba(0, 122, 255, 0.4)' : 'rgba(0, 0, 0, 0.08)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
    letterSpacing: -2,
    textAlign: 'center',
        marginTop: 10,
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
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
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
  miniMapContainer: {
    marginTop: 24,
    marginBottom: 80,
    marginHorizontal: 12,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  miniMap: {
    height: 260,
    width: '100%',
  },
  miniMapTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.3,
  },
  jobMarkerContainer: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
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
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
        marginTop:30,
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
  // New modern styles for recent sessions
  recentSessionCardBlur: {
    flex: 1,
    borderRadius: 20,
  },
  recentSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentSessionJobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  recentSessionJobIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  recentSessionJobTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  deleteSessionButtonNew: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
  },
  recentSessionTimeDisplay: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  recentSessionHoursNew: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  recentSessionTypeLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    opacity: 0.8,
  },
  recentSessionMetadata: {
    gap: 6,
  },
  recentSessionDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  recentSessionTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentSessionDateNew: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  recentSessionTimeNew: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  recentSessionNotesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border + '20',
  },
  recentSessionNotesText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  actionButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 16,
  },
  actionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',


  },
  actionButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  actionButtonIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  syncButton: {
    backgroundColor: isDark ? 'rgba(52, 199, 89, 0.05)' : 'rgba(52, 199, 89, 0.03)',
  },
  clearButton: {
    backgroundColor: isDark ? 'rgba(255, 59, 48, 0.05)' : 'rgba(255, 59, 48, 0.03)',
  },
    actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
    
    actionButtonTextsub: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.text,
    flex: 1,
    marginLeft: 16,
    marginRight: 8,

  },
  featuresContainer: {
    marginVertical: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  featuresGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },


});

export default function TimerScreen({ onNavigate }: TimerScreenProps) {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { triggerHaptic } = useHapticFeedback();
  const { formatTime: formatTimeFromHours, formatTimeWithPreferences } = useTimeFormat();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [showAllJobs, setShowAllJobs] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [notes, setNotes] = useState('');
  const { selectedJob, setSelectedJob, navigateTo } = useNavigation();
  const [isJobFormModalVisible, setIsJobFormModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successModalData] = useState<{
    hours: number;
    totalHours?: number;
    seconds: number; // Add seconds for precise time display
    totalSeconds?: number; // Add total seconds for update scenarios
    isUpdate: boolean;
    wasAutoTimerActive?: boolean;
    jobId?: string;
  }>({ hours: 0, seconds: 0, isUpdate: false });
  const [showNotesHistoryModal, setShowNotesHistoryModal] = useState(false);
  const [recentTimerSessions, setRecentTimerSessions] = useState<WorkDay[]>([]);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  
  // Animaciones
  const pulseAnimation = useSharedValue(1);
  const glowAnimation = useSharedValue(0);
  const buttonPulse = useSharedValue(1);
  
  // Animation values for entrance
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const scaleAnim = useRef(new RNAnimated.Value(0.9)).current;
  
  const styles = getStyles(colors, isDark);

  // Entrance animation
  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      RNAnimated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);
  
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


  // Update elapsed time for timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && activeSession) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - activeSession.startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
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
      const sessionData = await ManualTimerService.getManualSession();
      console.log('📱 TimerScreen loadManualSession result:', sessionData ? 'found session' : 'no session');
      if (sessionData) {
        const isPaused = sessionData.isPaused || false;
        const pausedElapsedTime = sessionData.pausedElapsedTime || 0;
        console.log('🔄 TimerScreen setting manual session, isPaused:', isPaused, 'pausedElapsedTime:', pausedElapsedTime, 'for job:', sessionData.jobId);
        
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
          console.log('⏸️ Manual timer loaded in paused state with elapsed time:', pausedElapsedTime);
        } else {
          // If running normally, calculate current elapsed time
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - new Date(sessionData.startTime).getTime()) / 1000);
          setElapsedTime(elapsed);
          console.log('⏱️ Manual timer calculated elapsed time from startTime:', elapsed);
        }
      }
    } catch (error) {
      console.error('Error loading manual timer session:', error);
    }
  };

  const loadRecentTimerSessions = async () => {
    try {
      const allWorkDays = await JobService.getWorkDays();
      // Filtrar solo las sesiones que tienen notas útiles (no automáticas)
      let timerSessions = allWorkDays
        .filter(day => 
          day.type === 'work' && 
          !day.isAutoGenerated &&
          day.notes && 
          day.notes.trim() !== '' &&
          !day.notes.includes('Auto-started') && 
          !day.notes.includes('SimpleAutoTimer') &&
          !day.notes.includes('Manual timer')
        );
      
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
      const startTime = new Date();
      const session: StoredActiveSession = {
        jobId: selectedJobId,
        startTime: startTime.toISOString(),
        notes: '',
      };
      
      await ManualTimerService.saveManualSession(session);
      
      setActiveSession({
        jobId: selectedJobId,
        startTime,
        notes: '',
      });
      setIsRunning(true);
      setElapsedTime(0);
      console.log('✅ Manual timer started successfully');
    } catch (error) {
      console.error('Error starting manual timer:', error);
      Alert.alert('Error', t('timer.start_timer_error'));
    }
  };

  const pauseTimer = async () => {
    try {
      if (activeSession) {
        const updatedSession: StoredActiveSession = {
          jobId: activeSession.jobId,
          startTime: activeSession.startTime.toISOString(),
          notes: activeSession.notes,
          isPaused: true,
          pausedElapsedTime: elapsedTime,
        } as StoredActiveSession;
        await ManualTimerService.saveManualSession(updatedSession);
        setIsRunning(false);
        console.log('⏸️ Manual timer paused successfully');
      }
    } catch (error) {
      console.error('Error pausing timer:', error);
    }
  };

  const resumeTimer = async () => {
    try {
      if (activeSession) {
        const updatedSession: StoredActiveSession = {
          jobId: activeSession.jobId,
          startTime: activeSession.startTime.toISOString(),
          notes: activeSession.notes,
          isPaused: false,
        } as StoredActiveSession;
        await ManualTimerService.saveManualSession(updatedSession);
        setIsRunning(true);
        console.log('▶️ Manual timer resumed successfully');
      }
    } catch (error) {
      console.error('Error resuming timer:', error);
    }
  };

  const handleStopButton = async () => {
    if (!activeSession) return;
    
    try {
      const job = jobs.find(j => j.id === activeSession.jobId);
      if (!job) return;
      
      const endTime = new Date();
      // Calculate actual time directly from start/end times instead of relying on elapsedTime state
      const actualSeconds = Math.floor((endTime.getTime() - activeSession.startTime.getTime()) / 1000);
      const hours = actualSeconds / 3600;
      
      console.log('🔍 Timer stop debug:', {
        startTime: activeSession.startTime,
        endTime: endTime.toISOString(),
        elapsedTimeState: elapsedTime,
        actualCalculatedSeconds: actualSeconds,
        actualCalculatedHours: hours,
        timeDifference: actualSeconds - elapsedTime
      });
      
      const workDay: WorkDay = {
        id: `timer-${Date.now()}`,
        jobId: activeSession.jobId,
        date: endTime.toISOString().split('T')[0],
        type: 'work',
        hours, // This is calculated from actualSeconds, not elapsedTime
        overtime: false,
        notes: notes || '',
        createdAt: endTime.toISOString(),
        updatedAt: endTime.toISOString(),
        // Add actual start and end times for display
        actualStartTime: activeSession.startTime.toTimeString().substring(0, 5), // HH:MM format
        actualEndTime: endTime.toTimeString().substring(0, 5), // HH:MM format
      };
      
      await JobService.addWorkDay(workDay);
      console.log('✅ WorkDay saved:', workDay);
      await JobService.clearActiveSession();
      await ManualTimerService.clearManualSession(); // Add this line to clear manual session
      
      setActiveSession(null);
      setIsRunning(false);
      setElapsedTime(0);
      setNotes('');
      
      await loadRecentTimerSessions();
      console.log('✅ Timer stopped successfully');
      
      // Navigate to ReportsScreen and open last session modal
      navigateTo('reports', undefined, { openLastSession: true });
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


  // Auto timer message function removed - using unified context now

  const currentSelectedJob = jobs.find(job => job.id === selectedJobId);

  const handleCreateJob = () => {
    onNavigate('jobs-management', { openAddModal: true });
  };

  const handleJobFormSave = async () => {
    await loadJobs();
    setIsJobFormModalVisible(false);
  };

  // Success modal handlers - simplified since AutoTimer context handles stopping
  const handleSuccessModalConfirm = async () => {
    setSuccessModalVisible(false);
    onNavigate('reports');
  };

  const handleSuccessModalClose = async () => {
    setSuccessModalVisible(false);
  };

  const renderRecentTimerSessions = () => {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.recentSessionsList}
        contentContainerStyle={{ paddingRight: 20, paddingLeft: 4 }}
      >
        {recentTimerSessions.map((session) => {
          const job = jobs.find(j => j.id === session.jobId);
          const sessionDate = new Date(session.date);
          const createdDate = session.createdAt ? new Date(session.createdAt) : sessionDate;
          const isToday = sessionDate.toDateString() === new Date().toDateString();
          const isYesterday = new Date(Date.now() - 86400000).toDateString() === sessionDate.toDateString();
          
          // Format date more elegantly
          let dateDisplay;
          if (isToday) {
            dateDisplay = t('common.today');
          } else if (isYesterday) {
            dateDisplay = t('common.yesterday');
          } else {
            dateDisplay = sessionDate.toLocaleDateString(
              language === 'es' ? 'es-ES' : 
              language === 'en' ? 'en-US' : 
              language === 'de' ? 'de-DE' : 
              language === 'fr' ? 'fr-FR' : 
              language === 'it' ? 'it-IT' : 'en-US', 
              { day: 'numeric', month: 'short' }
            ).replace(/\.$/, '');
          }
          
          return (
            <RNAnimated.View
              key={session.id}
              style={[
                styles.recentSessionCard,
                {
                  transform: [
                    {
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                  opacity: fadeAnim,
                },
              ]}
            >
              <BlurView 
                intensity={isDark ? 92 : 96} 
                tint={isDark ? "dark" : "light"} 
                style={styles.recentSessionCardBlur}
              >
                <LinearGradient
                  colors={job ? 
                    [job.color + '12', job.color + '04'] : 
                    isDark ? 
                      ['rgba(99, 102, 241, 0.12)', 'rgba(99, 102, 241, 0.04)'] : 
                      ['rgba(99, 102, 241, 0.08)', 'rgba(99, 102, 241, 0.02)']
                  }
                  style={styles.recentSessionCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                
                {/* Header with job info and delete */}
                <View style={styles.recentSessionHeader}>
                  {job && (
                    <View style={styles.recentSessionJobInfo}>
                      <View style={[styles.recentSessionJobIndicator, { backgroundColor: job.color }]} />
                      <Text style={styles.recentSessionJobTitle} numberOfLines={1}>
                        {job.name}
                      </Text>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.deleteSessionButtonNew}
                    onPress={() => {
                      triggerHaptic('light');
                      deleteTimerSession(session.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <IconSymbol size={14} name="xmark" color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                {/* Time Display - Main Feature */}
                <View style={styles.recentSessionTimeDisplay}>
                  <Text style={[styles.recentSessionHoursNew, { color: job?.color || colors.primary }]}>
                    {formatTimeFromHours(session.hours)}
                  </Text>
                  <Text style={styles.recentSessionTypeLabel}>
                    {session.overtime ? t('timer.overtime') : t('timer.regular')}
                  </Text>
                </View>
                
                {/* Date and Time Info */}
                <View style={styles.recentSessionMetadata}>
                  <View style={styles.recentSessionDateInfo}>
                    <IconSymbol size={12} name="calendar" color={colors.textSecondary} />
                    <Text style={styles.recentSessionDateNew}>
                      {dateDisplay}
                    </Text>
                  </View>
                  
                  <View style={styles.recentSessionTimeInfo}>
                    <IconSymbol size={12} name="clock" color={colors.textSecondary} />
                    <Text style={styles.recentSessionTimeNew}>
                      {formatTimeWithPreferences(
                        `${createdDate.getHours().toString().padStart(2, '0')}:${createdDate.getMinutes().toString().padStart(2, '0')}`
                      )}
                    </Text>
                  </View>
                </View>
                
                {/* Notes display - prominently shown since we're only showing sessions with notes */}
                {session.notes && (
                  <View style={[styles.recentSessionNotesIndicator, { marginTop: 8, backgroundColor: isDark ? 'rgba(96, 165, 250, 0.1)' : 'rgba(96, 165, 250, 0.05)', borderRadius: 8, padding: 8 }]}>
                    <IconSymbol size={12} name="note.text" color={colors.primary} />
                    <Text style={[styles.recentSessionNotesText, { fontSize: 11, color: colors.text }]} numberOfLines={2}>
                      {session.notes}
                    </Text>
                  </View>
                )}
                
              </BlurView>
            </RNAnimated.View>
          );
        })}
      </ScrollView>
    );
  };

  const renderCompactJobSelector = () => {
    console.log('🔄 renderCompactJobSelector called with jobs:', jobs.length, 'isRunning:', isRunning, 'activeSession:', !!activeSession);
    
    // Don't show selector if there are no jobs or only one job
    if (jobs.length <= 1) {
      // Auto-select the single job if exists
      if (jobs.length === 1 && showAllJobs) {
        setSelectedJobId(jobs[0].id);
        setShowAllJobs(false);
      }
      return null;
    }
    
    if (jobs.length <= 3) {
      // Para 2-3 trabajos, mostrar como pestañas
      return (
        <RNAnimated.View style={[styles.compactJobSelector, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
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
                key={`tab-${job.id}`}
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
        </RNAnimated.View>
      );
    } else {
      // Para más de 3 trabajos, mostrar como scroll horizontal
      return (
        <RNAnimated.View style={[styles.compactJobSelector, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {jobs.length > 1 && (
            <Text style={styles.compactJobSelectorTitle}>{t('reports.filter_by_job')}</Text>
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
                key={`scroll-${job.id}`}
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
        </RNAnimated.View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
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


 

        <RNAnimated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <BlurView 
          intensity={98} 
          tint={isDark ? "dark" : "light"} 
          style={styles.timerCard}
        >
  
          <View style={styles.timerContent}>
      
            <Animated.View style={[styles.timerDisplay, animatedTimerStyle]}>
              <View style={styles.timerTimeContainer}>
                <Animated.Text style={[styles.timerTime, animatedTimeTextStyle]}>
                  {formatTime(elapsedTime)}
                </Animated.Text>
 
              </View>
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
        </RNAnimated.View>


        {/* Session Notes Input - Show when timer is active */}

          <View style={[styles.notesCard, { backgroundColor: colors.surface, marginVertical: 16 }]}>
            <LinearGradient
              colors={isDark ? 
                ['rgba(96, 165, 250, 0.08)', 'rgba(96, 165, 250, 0.03)'] : 
                ['rgba(96, 165, 250, 0.05)', 'rgba(96, 165, 250, 0.02)']
              }
              style={styles.notesCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.notesTitle}>{t('timer.session_notes')}</Text>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('light');
                  setShowNotesHistoryModal(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(96, 165, 250, 0.1)',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <IconSymbol size={16} name="note.text" color={isDark ? '#60a5fa' : '#3b82f6'} />
                <Text style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isDark ? '#60a5fa' : '#3b82f6',
                  marginLeft: 6,
                }}>{t('timer.view_notes_history')}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.notesInput, { color: colors.text, borderColor: colors.border }]}
              placeholder={t('timer.notes_placeholder')}
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
            />
            <Text style={styles.notesHint}>
              {t('timer.notes_hint')}
            </Text>
          </View>

        {/* Manual Timer Features */}
        {!isRunning && !activeSession && (
          <View style={[styles.featuresContainer, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={isDark ?
                ['rgba(59, 130, 246, 0.08)', 'rgba(59, 130, 246, 0.03)'] :
                ['rgba(59, 130, 246, 0.06)', 'rgba(59, 130, 246, 0.02)']
              }
              style={styles.featuresGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Text style={[styles.featuresTitle, { color: colors.text }]}>
              {t('timer.manual_timer_features')}
            </Text>

            <View style={styles.featuresList}>
              {/* Feature 1: Start/Stop */}
              <View style={styles.featureItem}>
                <View style={[styles.featureIconContainer, {
                  backgroundColor: isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)'
                }]}>
                  <IconSymbol size={18} name="play.circle.fill" color="#34C759" />
                </View>
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                  {t('timer.feature_start_stop')}
                </Text>
              </View>

              {/* Feature 2: Add Notes */}
              <View style={styles.featureItem}>
                <View style={[styles.featureIconContainer, {
                  backgroundColor: isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(96, 165, 250, 0.1)'
                }]}>
                  <IconSymbol size={18} name="note.text" color="#60a5fa" />
                </View>
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                  {t('timer.feature_add_notes')}
                </Text>
              </View>

              {/* Feature 3: Auto Add to Calendar */}
              <View style={styles.featureItem}>
                <View style={[styles.featureIconContainer, {
                  backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.1)'
                }]}>
                  <IconSymbol size={18} name="calendar.badge.checkmark" color="#a855f7" />
                </View>
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                  {t('timer.feature_auto_add')}
                </Text>
              </View>

              {/* Feature 4: Background Counting */}
              <View style={styles.featureItem}>
                <View style={[styles.featureIconContainer, {
                  backgroundColor: isDark ? 'rgba(255, 159, 10, 0.15)' : 'rgba(255, 159, 10, 0.1)'
                }]}>
                  <IconSymbol size={18} name="arrow.clockwise" color="#FF9F0A" />
                </View>
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                  {t('timer.feature_background')}
                </Text>
              </View>
            </View>
          </View>
        )}



        {/* Quick Actions - Moved below recent sessions */}
         <RNAnimated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        {!isRunning && !activeSession && (
          <View style={styles.quickActions}>
            <Text style={styles.quickActionsTitle}>{t('timer.quick_actions')}</Text>

                           <TouchableOpacity
                          style={styles.actionButton}
                                 onPress={() => {
                  triggerHaptic('light');
                  setIsJobFormModalVisible(true);
                }}
                        >
                          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={[styles.actionButtonInner, styles.syncButton]}>
                            <LinearGradient
                              colors={['rgba(52, 199, 89, 0.1)', 'rgba(52, 199, 89, 0.05)']}
                              style={styles.actionButtonGradient}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            />
                            <View style={[styles.actionButtonIconContainer, { backgroundColor: colors.success + '20' }]}>
                              <IconSymbol size={24} name="timer" color={colors.success} />  
                            </View>
                            <View style={{ flex: 1, marginLeft: 12, marginRight: 12 }}>
                              <Text style={[styles.actionButtonText, { color: colors.success, marginBottom: 2 }]}>{t('job_form.auto_timer.title')}</Text>
                              <Text style={[styles.actionButtonTextsub, { color: colors.success, opacity: 0.8 }]}>{t('job_form.auto_timer.subtitle')}</Text>
                            </View>
                            <IconSymbol size={16} name="arrow.right" color={colors.success} />
                          </BlurView>
                        </TouchableOpacity>



     





                       
          </View>
        )}
</RNAnimated.View>
          </>
        )}
        
      </ScrollView>
      </KeyboardAvoidingView>

      <JobFormModal
        visible={isJobFormModalVisible}
        onClose={() => setIsJobFormModalVisible(false)}
        editingJob={selectedJobId ? jobs.find(job => job.id === selectedJobId) : null}
        onSave={handleJobFormSave}
        initialTab="basic"
        onNavigateToSubscription={() => onNavigate('subscription')}
      />

      <TimerSuccessModal
        visible={successModalVisible}
        hours={successModalData.hours}
        totalHours={successModalData.totalHours}
        seconds={successModalData.seconds}
        totalSeconds={successModalData.totalSeconds}
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

      {/* Statistics Modal */}
      <Modal
        visible={statsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStatsModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setStatsModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <IconSymbol size={24} name="xmark" color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('timer.quick_stats')}</Text>
            <TouchableOpacity 
              onPress={() => {
                triggerHaptic('success');
                setStatsModalVisible(false);
                onNavigate('reports');
              }}
              style={styles.modalSaveButton}
            >
              <IconSymbol size={20} name="arrow.right" color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={{ paddingBottom: 20 }}>
              {/* Quick Stats Summary */}
              <View style={[styles.notesCard, { backgroundColor: colors.surface }]}>
                <LinearGradient
                  colors={isDark ? 
                    ['rgba(34, 197, 94, 0.08)', 'rgba(34, 197, 94, 0.03)'] : 
                    ['rgba(34, 197, 94, 0.05)', 'rgba(34, 197, 94, 0.02)']
                  }
                  style={styles.notesCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Text style={[styles.notesTitle, { textAlign: 'center', marginBottom: 24 }]}>
                  {t('timer.this_week_summary')}
                </Text>
                
                {/* Quick stats display */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>
                      {formatTimeFromHours(recentTimerSessions.slice(0, 7).reduce((sum, session) => sum + session.hours, 0))}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                      {t('timer.total_hours')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>
                      {recentTimerSessions.slice(0, 7).length}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                      {t('timer.sessions')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>
                      {jobs.length}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                      {t('timer.active_jobs')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Recent Sessions Quick View */}
              <View style={[styles.notesCard, { backgroundColor: colors.surface, marginTop: 16 }]}>
            
                <Text style={[styles.notesTitle, { marginBottom: 16 }]}>
                  {t('timer.recent_activity')}
                </Text>
                
                {recentTimerSessions.slice(0, 5).map((session) => {
                  const job = jobs.find(j => j.id === session.jobId);
                  return (
                    <View key={session.id} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border + '20',
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        {job && (
                          <View style={[styles.compactJobTabDot, { 
                            backgroundColor: job.color,
                            marginRight: 8 
                          }]} />
                        )}
                        <Text style={{ fontSize: 14, color: colors.text, flex: 1 }} numberOfLines={1}>
                          {job?.name || t('common.unknown_job')}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                        {formatTimeFromHours(session.hours)}
                      </Text>
                    </View>
                  );
                })}
                
                {recentTimerSessions.length === 0 && (
                  <Text style={{ 
                    fontSize: 14, 
                    color: colors.textSecondary, 
                    textAlign: 'center',
                    fontStyle: 'italic',
                    paddingVertical: 20
                  }}>
                    {t('timer.no_recent_sessions')}
                  </Text>
                )}
              </View>

              {/* Quick Action to View Full Reports */}
              <TouchableOpacity
                style={[styles.viewStatsButton, { 
                  marginTop: 24,
                  alignSelf: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 32
                }]}
                onPress={() => {
                  triggerHaptic('light');
                  setStatsModalVisible(false);
                  onNavigate('reports');
                }}
                activeOpacity={0.8}
              >
                <IconSymbol size={18} name="chart.bar.fill" color={colors.primary} />
                <Text style={[styles.viewStatsButtonText, { fontSize: 16 }]}>
                  {t('timer.view_full_reports')}
                </Text>
                <IconSymbol size={16} name="arrow.right" color={colors.primary} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Notes History Modal */}
      <NotesHistoryModal
        visible={showNotesHistoryModal}
        onClose={() => setShowNotesHistoryModal(false)}
        jobs={jobs}
      />
    </SafeAreaView>
  );
}
