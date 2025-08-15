import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import WorkDayModal from '../components/WorkDayModal';
import NoJobsWarning from '../components/NoJobsWarning';
import { Job, WorkDay, WorkDayWithJob, DAY_TYPES } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import { useBackNavigation, useNavigation } from '../context/NavigationContext';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { CalendarSyncService } from '../services/CalendarSyncService';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationService from '../services/NotificationService';
import { ChatDataParser, ParsedWorkData } from '../services/ChatDataParser';
import WidgetSyncService from '../services/WidgetSyncService';

// Custom Day Component
const CustomDay = ({ date, state, marking, onPress }: any) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  
  const getWorkBadgeStyle = (workDay: WorkDay, job?: Job) => {
    if (!workDay) return null;
    
    let badgeColor = '#9CA3AF'; // Default gray for OFF
    let badgeText = 'OFF';
    let timeText = '';
    
    if (workDay.type === 'work' && job) {
      badgeColor = job.color || '#10B981'; // Use job color or default green
      badgeText = t('calendar.badge_work');
      timeText = workDay.startTime || '';
      if (workDay.endTime) {
        timeText = `${workDay.startTime}-${workDay.endTime}`;
        // Add second shift info if split shift
        if (workDay.secondStartTime && workDay.secondEndTime) {
          timeText += `\n${workDay.secondStartTime}-${workDay.secondEndTime}`;
        }
      }
    } else if (workDay.type === 'free') {
      badgeColor = '#3B82F6'; // Blue
      badgeText = t('calendar.badge_free');
    } else if (workDay.type === 'vacation') {
      badgeColor = '#F59E0B'; // Yellow
      badgeText = t('calendar.badge_vacation');
    } else if (workDay.type === 'sick') {
      badgeColor = '#EF4444'; // Red
      badgeText = t('calendar.badge_sick');
    }
    
    return { badgeColor, badgeText, timeText };
  };
  
  const isToday = state === 'today';
  const isDisabled = state === 'disabled';
  const workDay = marking?.workDay;
  const job = marking?.job;
  const badgeStyle = getWorkBadgeStyle(workDay, job);
  
  return (
    <TouchableOpacity
      onPress={() => onPress && onPress(date)}
      style={{
        width: 50,
        height: 80,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 4,
        paddingBottom: 4,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isToday ? colors.primary + '20' : 'transparent',
          borderWidth: isToday ? 2 : 0,
          borderColor: colors.primary,
          marginBottom: badgeStyle ? 6 : 0,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: isToday ? '700' : '500',
            color: isDisabled ? colors.textTertiary : isToday ? colors.primary : colors.text,
          }}
        >
          {date.day}
        </Text>
      </View>
      
      {badgeStyle && (
        <View style={{ alignItems: 'center', width: '100%' }}>
          <View
            style={{
              backgroundColor: badgeStyle.badgeColor + '15',
              paddingHorizontal: 5,
              paddingVertical: 3,
              borderRadius: 8,
              minWidth: 36,
              alignItems: 'center',
              marginBottom: 2,
              borderWidth: 1.5,
              borderColor: badgeStyle.badgeColor,
            }}
          >
            <Text
              style={{
                color: badgeStyle.badgeColor,
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 0.5,
              }}
            >
              {badgeStyle.badgeText}
            </Text>
          </View>
          {badgeStyle.timeText && (
            <Text
              style={{
                fontSize: 7,
                color: colors.textSecondary,
                fontWeight: '600',
                marginTop: 1,
                textAlign: 'center',
                lineHeight: 9,
              }}
            >
              {badgeStyle.timeText}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

interface CalendarScreenProps {
  onNavigate?: (screen: string, options?: any) => void;
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
  jobSelector: {
    marginTop: 20,
    marginBottom: 12,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 12, 
    elevation: 6,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  jobSelectorGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: 'center',
    color: colors.text,
  },
  jobScrollView: {
    marginHorizontal: -4,
  },
  jobButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  jobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: colors.separator,
    gap: 6,
  },
  jobButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  jobButtonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  jobButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  jobButtonTextActive: {
    color: '#FFFFFF',
  },
  compactJobSelector: {
    marginTop: 12,
    marginBottom: 8,
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
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
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
    backgroundColor: isDark ? colors.surface : '#FFFFFF',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.primary + '30',
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
    flex: 1,
  },
  compactJobTabTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  compactJobScrollContainer: {
    maxHeight: 60,

  },
  calendar: {
    marginVertical: 12,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 12, 
    elevation: 6,
    overflow: 'hidden',
    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.03)' : 'rgba(0, 122, 255, 0.02)',
  },
  statsCard: {
    marginVertical: 16,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 14, 
    elevation: 8,
    overflow: 'hidden',
  },
  statsCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  legendCard: {
    marginVertical: 16,
    borderRadius: 20,
    shadowColor: colors.textSecondary,
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.12, 
    shadowRadius: 10, 
    elevation: 6,
    overflow: 'hidden',
   paddingBottom: 44,
  },
  legendCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  actionButton: {
   
  },
  actionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginLeft: 16,
  },
  jobsStatsCard: {
    marginVertical: 16,
    borderRadius: 16,
    padding: 20,
    backgroundColor: colors.surface,
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 4,
  },
  jobStatRow: {
    marginBottom: 8,
  },
  jobStatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobStatColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  jobStatText: {
    flex: 1,
  },
  jobStatName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  jobStatDetails: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  dayTypeBreakdown: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  breakdownTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  dayTypeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayTypeItem: {
    alignItems: 'center',
    flex: 1,
  },
  dayTypeNumber: {
    fontSize: 16,
    color: colors.text,
    marginTop: 4,
    marginBottom: 2,
    fontWeight: '600',
  },
  dayTypeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  legendSeparator: {
    height: 1,
    backgroundColor: colors.separator,
    marginVertical: 8,
  },
});

export default function CalendarScreen({ onNavigate }: CalendarScreenProps) {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { settings: notificationSettings } = useNotifications();
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showWorkDayModal, setShowWorkDayModal] = useState(false);
  const [editingWorkDay, setEditingWorkDay] = useState<WorkDay | undefined>();
  const [preselectedJobId, setPreselectedJobId] = useState<string | undefined>();
  const [selectedJobId, setSelectedJobId] = useState<string | 'all'>('all');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { handleBack } = useBackNavigation();
  const { selectedJob, setSelectedJob, setOnExportToCalendar } = useNavigation();
  const { triggerHaptic } = useHapticFeedback();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  const styles = getStyles(colors, isDark);

  useEffect(() => {
    loadData();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  // Configure calendar locale based on user language
  useEffect(() => {
    const months = {
      es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
      en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
      fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
      it: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
    };

    const days = {
      es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
      en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
      fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
      it: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
    };

    const daysShort = {
      es: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
      en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      de: ['S', 'M', 'D', 'M', 'D', 'F', 'S'],
      fr: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
      it: ['D', 'L', 'M', 'M', 'G', 'V', 'S']
    };

    const today = {
      es: 'Hoy',
      en: 'Today',
      de: 'Heute',
      fr: "Aujourd'hui",
      it: 'Oggi'
    };

    LocaleConfig.locales[language] = {
      monthNames: months[language] || months.es,
      monthNamesShort: (months[language] || months.es).map(m => m.substring(0, 3)),
      dayNames: days[language] || days.es,
      dayNamesShort: daysShort[language] || daysShort.es,
      today: today[language] || today.es
    };
    LocaleConfig.defaultLocale = language;
  }, [language]);

  // Registrar el handler de exportación desde chat
  useEffect(() => {
    const handleChatExport = async (jobId: string, parsedData: ParsedWorkData) => {
      // Ya no necesitamos hacer nada aquí porque la exportación se hace directamente desde ChatMessage
      console.log('📤 [CALENDAR] Handler registrado, pero exportación se hace directamente desde chat');
    };

    setOnExportToCalendar(handleChatExport);
    
    // Cleanup: deregister handler when component unmounts
    return () => {
      setOnExportToCalendar(undefined);
    };
  }, [setOnExportToCalendar]);

  // Register header sync button handler
  useEffect(() => {
    // Register the sync handler globally
    globalThis.calendarScreenSyncHandler = () => {
      handleSyncCalendar();
    };

    // Cleanup on unmount
    return () => {
      delete globalThis.calendarScreenSyncHandler;
    };
  }, [currentMonth, workDays, jobs]);

  // Auto-select job if coming from map
  useEffect(() => {
    if (selectedJob) {
      setPreselectedJobId(selectedJob.id);
      setSelectedJobId(selectedJob.id);
      // Clear the selected job after using it
      setSelectedJob(null);
    }
  }, [selectedJob]);

  // Re-schedule reminders when notification settings change (with debounce)
  useEffect(() => {
    console.log('🔄 Notification settings changed, checking if need to reschedule...');
    console.log('   isInitialLoad:', isInitialLoad);
    console.log('   Jobs:', jobs.length, 'WorkDays:', workDays.length);
    console.log('   Settings:', { 
      enabled: notificationSettings.enabled, 
      workReminders: notificationSettings.workReminders,
      reminderMinutes: notificationSettings.reminderMinutes 
    });
    
    // Skip scheduling during initial load to avoid immediate notifications
    if (isInitialLoad) {
      console.log('⏭️ Skipping notification scheduling during initial load');
      return;
    }
    
    // Debounce to avoid multiple rapid executions
    const timeoutId = setTimeout(() => {
      if (jobs.length > 0 && workDays.length > 0) {
        if (notificationSettings.enabled && notificationSettings.workReminders) {
          console.log('📅 Rescheduling due to settings change (debounced)...');
          scheduleWorkReminders(jobs, workDays);
        } else {
          console.log('🗑️ Cancelling reminders due to settings change (debounced)...');
          // Cancel all work reminders if disabled
          const notificationService = NotificationService.getInstance();
          notificationService.cancelWorkReminders();
        }
      } else {
        console.log('⏭️ No jobs/workdays to schedule (debounced)');
      }
    }, 3000); // Wait 3 seconds before executing to avoid interfering with immediate scheduling

    return () => clearTimeout(timeoutId);
  }, [notificationSettings.workReminders, notificationSettings.reminderMinutes, notificationSettings.enabled, jobs, workDays, isInitialLoad]);

  const loadData = async () => {
    try {
      const [loadedJobs, loadedWorkDays] = await Promise.all([
        JobService.getJobs(),
        JobService.getWorkDays(),
      ]);
      setJobs(loadedJobs);
      setWorkDays(loadedWorkDays);
      
      // Mark initial load as complete after a short delay
      setTimeout(() => {
        setIsInitialLoad(false);
        console.log('✅ Initial load completed, notifications can now be scheduled');
      }, 2000);
      
      // NO schedule reminders here - only when data changes
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const scheduleWorkReminders = async (jobsList: Job[], workDaysList: WorkDay[]) => {
    const notificationService = NotificationService.getInstance();
    
    try {
      // Cancel existing scheduled notifications for work reminders
      // TODO: Temporarily disabled to prevent immediate cancellation
      // await notificationService.cancelWorkReminders();
      
      if (!notificationSettings.workReminders || !notificationSettings.enabled) {
        console.log('📵 Work reminders disabled, skipping scheduling');
        return;
      }
      
      const now = new Date();
      const nextDays = 7; // Schedule reminders for the next 7 days
      let scheduledCount = 0;
      
      console.log(`⏰ Scheduling work reminders. Current time: ${now.toLocaleString()}`);
      console.log(`📋 Reminder setting: ${notificationSettings.reminderMinutes} minutes before work`);
      
      for (let i = 0; i < nextDays; i++) {
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + i);
        const dateString = checkDate.toISOString().split('T')[0];
        
        // Check if there's a work day scheduled for this date
        const workDay = workDaysList.find(wd => wd.date === dateString);
        if (workDay && workDay.type === 'work' && workDay.jobId && workDay.startTime) {
          const job = jobsList.find(j => j.id === workDay.jobId);
          if (job) {
            try {
              // Parse start time
              const [hours, minutes] = workDay.startTime.split(':').map(Number);
              const workStartTime = new Date(checkDate);
              workStartTime.setHours(hours, minutes, 0, 0);
              
              // Let the detailed logic below handle time validation
              
              // Calculate reminder time
              const reminderDate = new Date(workStartTime);
              reminderDate.setMinutes(reminderDate.getMinutes() - notificationSettings.reminderMinutes);
              
              const minutesUntilReminder = Math.round((reminderDate.getTime() - now.getTime()) / 1000 / 60);
              const minutesUntilWork = Math.round((workStartTime.getTime() - now.getTime()) / 1000 / 60);
              
              console.log(`\n🔍 Checking ${job.name} on ${dateString}:`);
              console.log(`   Work time: ${workDay.startTime} (${workStartTime.toLocaleString()})`);
              console.log(`   Reminder time: ${reminderDate.toLocaleString()}`);
              console.log(`   Minutes until reminder: ${minutesUntilReminder}`);
              console.log(`   Minutes until work: ${minutesUntilWork}`);
              
              // Only schedule if work time is in the future
              if (workStartTime.getTime() > now.getTime()) {
                let actualReminderDate = reminderDate;
                let actualMinutesBefore = notificationSettings.reminderMinutes;
                
                // If normal reminder time has passed, calculate when to send it
                if (reminderDate.getTime() <= now.getTime()) {
                  const minutesUntilWork = Math.round((workStartTime.getTime() - now.getTime()) / 1000 / 60);
                  
                  if (minutesUntilWork < 0) {
                    console.log(`   ⏭️ SKIPPED - work time has already passed`);
                    continue;
                  } else if (minutesUntilWork >= 15) {
                    // If there's still 15+ minutes until work, schedule for 15 minutes before
                    actualReminderDate = new Date(workStartTime.getTime() - (15 * 60 * 1000));
                    actualMinutesBefore = 15;
                    console.log(`   🕐 Rescheduling for 15 minutes before work: ${actualReminderDate.toLocaleTimeString()}`);
                  } else {
                    // If less than 15 minutes until work, schedule for work start time
                    actualReminderDate = new Date(workStartTime.getTime());
                    actualMinutesBefore = 0; // It's time to start work
                    console.log(`   ⚡ Scheduling notification for work start time: ${actualReminderDate.toLocaleTimeString()}`);
                  }
                }
                
                await notificationService.scheduleWorkReminder(
                  actualReminderDate,
                  job.name,
                  workDay.startTime,
                  actualMinutesBefore
                );
                scheduledCount++;
                console.log(`   ✅ SCHEDULED reminder for ${actualReminderDate.toLocaleTimeString()}`);
              } else {
                console.log(`   ⏭️ SKIPPED - work time already passed`);
              }
              
            } catch (error) {
              console.error(`❌ Error processing reminder for ${job?.name || 'unknown job'}:`, error);
            }
          }
        }
      }
      
      console.log(`\n🎯 FINAL RESULT: Scheduled ${scheduledCount} work reminders`);
      if (scheduledCount === 0) {
        console.log('💡 No reminders scheduled - check if work times are in the future');
      }
    } catch (error) {
      console.error('❌ Error scheduling work reminders:', error);
    }
  };

  const handleDayPress = (day: DateData) => {
    const dateString = day.dateString;
    setSelectedDate(dateString);
    
    const existingWorkDay = workDays.find(wd => wd.date === dateString);
    setEditingWorkDay(existingWorkDay);
    
    // Pre-select the job if a specific job is filtered
    if (selectedJobId !== 'all') {
      setPreselectedJobId(selectedJobId);
    } else {
      setPreselectedJobId(undefined);
    }
    
    setShowWorkDayModal(true);
  };

  const handleSaveWorkDay = async (workDayData: Omit<WorkDay, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('💾 Saving work day:', workDayData);
      console.log('   Date:', workDayData.date);
      console.log('   Start time:', workDayData.startTime);
      console.log('   Job ID:', workDayData.jobId);
      
      if (editingWorkDay) {
        await JobService.updateWorkDay(editingWorkDay.id, workDayData);
      } else {
        await JobService.addWorkDay(workDayData);
      }
      
      // Reload data and get fresh data
      const [updatedJobs, updatedWorkDays] = await Promise.all([
        JobService.getJobs(),
        JobService.getWorkDays(),
      ]);
      setJobs(updatedJobs);
      setWorkDays(updatedWorkDays);
      
      console.log('📚 Fresh data loaded:');
      console.log('   Jobs:', updatedJobs.length);
      console.log('   Work days:', updatedWorkDays.length);
      
      // Sync with widget after saving
      console.log('🔄 Syncing calendar with widget...');
      await WidgetSyncService.syncCalendarToWidget();
      console.log('✅ Widget sync completed');
      if (updatedWorkDays.length > 0) {
        const latestWorkDay = updatedWorkDays[updatedWorkDays.length - 1];
        console.log('   Latest work day:', latestWorkDay.date, latestWorkDay.startTime);
      }
      
      // Schedule reminders immediately after save
      if (notificationSettings.enabled && notificationSettings.workReminders) {
        console.log('🔄 Scheduling reminders after save...');
        await scheduleWorkReminders(updatedJobs, updatedWorkDays);
      }
      
    } catch (error) {
      console.error('Error saving work day:', error);
      Alert.alert('Error', t('calendar.save_workday_error'));
    }
  };

  const handleDeleteWorkDay = async () => {
    if (editingWorkDay) {
      try {
        await JobService.deleteWorkDay(editingWorkDay.id);
        
        // Reload data and get fresh data
        const [updatedJobs, updatedWorkDays] = await Promise.all([
          JobService.getJobs(),
          JobService.getWorkDays(),
        ]);
        setJobs(updatedJobs);
        setWorkDays(updatedWorkDays);
        
        // Sync with widget after deleting
        console.log('🔄 Syncing calendar with widget after delete...');
        await WidgetSyncService.syncCalendarToWidget();
        console.log('✅ Widget sync completed');
        
        // Then reschedule reminders with fresh data
        if (notificationSettings.enabled && notificationSettings.workReminders) {
          await scheduleWorkReminders(updatedJobs, updatedWorkDays);
        }
      } catch (error) {
        console.error('Error deleting work day:', error);
        Alert.alert('Error', t('calendar.delete_workday_error'));
      }
    }
  };

  const renderCompactJobSelector = () => {
    if (jobs.length === 0) return null;
    
    // Only show "All" option when there are multiple jobs
    const allOptions = jobs.length > 1 
      ? [{ id: 'all', name: t('calendar.all_jobs'), color: colors.primary }].concat(jobs)
      : jobs;
    
    // When there's only one job, auto-select it
    if (jobs.length === 1 && selectedJobId === 'all') {
      setSelectedJobId(jobs[0].id);
    }
    
    if (allOptions.length <= 4) {
      // Para hasta 4 opciones (incluyendo "Todos"), mostrar como pestañas
      return (
        <Animated.View style={[styles.compactJobSelector, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {jobs.length > 1 && (
            <Text style={styles.compactJobSelectorTitle}>{t('calendar.filter_by_job')}</Text>
          )}
          <View style={styles.compactJobTabs}>
            {allOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.compactJobTab,
                  selectedJobId === option.id && styles.compactJobTabActive
                ]}
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedJobId(option.id);
                }}
              >
                {option.id !== 'all' && (
                  <View style={[styles.compactJobTabDot, { backgroundColor: option.color }]} />
                )}
                <Text 
                  style={[
                    styles.compactJobTabText,
                    selectedJobId === option.id && styles.compactJobTabTextActive
                  ]}
                  numberOfLines={1}
                >
                  {option.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      );
    } else {
      // Para más opciones, mostrar como scroll horizontal
      return (
        <Animated.View style={[styles.compactJobSelector, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {jobs.length > 1 && (
            <Text style={styles.compactJobSelectorTitle}>{t('calendar.filter_by_job')}</Text>
          )}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.compactJobScrollContainer}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            {allOptions.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.compactJobTab,
                  selectedJobId === option.id && styles.compactJobTabActive,
                  { 
                    flex: 0,
                    minWidth: 100,
                    marginRight: index < allOptions.length - 1 ? 8 : 0
                  }
                ]}
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedJobId(option.id);
                }}
              >
                {option.id !== 'all' && (
                  <View style={[styles.compactJobTabDot, { backgroundColor: option.color }]} />
                )}
                <Text 
                  style={[
                    styles.compactJobTabText,
                    selectedJobId === option.id && styles.compactJobTabTextActive
                  ]}
                  numberOfLines={1}
                >
                  {option.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      );
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};

    // Filter workDays by selected job if not "all"
    // When filtering, show only days from selected job (both work and non-work days)
    const filteredWorkDays = selectedJobId !== 'all'
      ? workDays.filter(wd => {
          if (wd.type === 'work') {
            return wd.jobId === selectedJobId;
          }
          // Show non-work days from the selected job OR legacy days without jobId
          return wd.jobId === selectedJobId || wd.jobId === undefined;
        })
      : workDays;

    filteredWorkDays.forEach(workDay => {
      const job = jobs.find(j => j.id === workDay.jobId);
      
      marked[workDay.date] = {
        customStyles: {
          container: {
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            width: 42,
            height: 42,
          },
          text: {
            color: colors.text,
            fontWeight: '500',
            fontSize: 16,
            marginBottom: 2,
          },
        },
        workDay: workDay,
        job: job,
      };
    });

    return marked;
  };

  const getMonthStats = () => {
    const monthKey = currentMonth.toISOString().slice(0, 7);
    
    // Filter workDays by selected job if not "all"
    // When filtering, show only days from selected job (both work and non-work days)
    const filteredWorkDays = selectedJobId !== 'all'
      ? workDays.filter(wd => {
          if (wd.type === 'work') {
            return wd.jobId === selectedJobId;
          }
          // Show non-work days from the selected job OR legacy days without jobId
          return wd.jobId === selectedJobId || wd.jobId === undefined;
        })
      : workDays;
    
    const monthWorkDays = filteredWorkDays.filter(day => 
      day.date.startsWith(monthKey)
    );

    const workDaysOnly = monthWorkDays.filter(day => day.type === 'work');
    const freeDays = monthWorkDays.filter(day => day.type === 'free');
    const vacationDays = monthWorkDays.filter(day => day.type === 'vacation');
    const sickDays = monthWorkDays.filter(day => day.type === 'sick');

    const totalDays = monthWorkDays.length;
    const totalHours = workDaysOnly.reduce((sum, day) => sum + day.hours, 0);
    const overtimeDays = workDaysOnly.filter(day => day.overtime).length;

    // Group by job (only work days)
    const jobStats = jobs.reduce((acc, job) => {
      const jobWorkDays = workDaysOnly.filter(day => day.jobId === job.id);
      if (jobWorkDays.length > 0) {
        acc[job.id] = {
          job,
          days: jobWorkDays.length,
          hours: jobWorkDays.reduce((sum, day) => sum + day.hours, 0),
        };
      }
      return acc;
    }, {} as Record<string, { job: Job; days: number; hours: number }>);

    return { 
      totalDays, 
      totalHours, 
      overtimeDays, 
      jobStats,
      workDays: workDaysOnly.length,
      freeDays: freeDays.length,
      vacationDays: vacationDays.length,
      sickDays: sickDays.length,
    };
  };

  const stats = getMonthStats();

  const handleCreateJob = () => {
    onNavigate && onNavigate('jobs-management', { openAddModal: true });
  };

  const handleSyncCalendar = async () => {
    try {
      // Get current month work days (only work days)
      const monthKey = currentMonth.toISOString().slice(0, 7);
      const monthWorkDays = workDays.filter(day => 
        day.date.startsWith(monthKey) && day.type === 'work'
      );

      if (monthWorkDays.length === 0) {
        Alert.alert(t('calendar.sync_title'), t('calendar.no_work_days'));
        return;
      }

      console.log(`Found ${monthWorkDays.length} work days to sync for month ${monthKey}`);

      // Sync directly without additional confirmation
      const syncCount = await CalendarSyncService.syncMultipleWorkDays(monthWorkDays, jobs);
      
      // Only show success message if sync was attempted and succeeded
      if (syncCount > 0) {
        Alert.alert(
          t('calendar.sync_complete'),
          t('calendar.sync_success', { count: syncCount })
        );
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
      Alert.alert(t('common.error'), t('calendar.sync_error'));
    }
  };

  const handleClearMonth = async () => {
    try {
      // Get current month work days (filtered by selected job if not "all")
      const monthKey = currentMonth.toISOString().slice(0, 7);
      let monthDays = workDays.filter(day => day.date.startsWith(monthKey));
      
      // Filter by selected job if not "all"
      if (selectedJobId !== 'all') {
        monthDays = monthDays.filter(day => {
          if (day.type === 'work') {
            return day.jobId === selectedJobId;
          }
          // Include all non-work days (free, vacation, sick) regardless of job selection
          // because they apply to all jobs
          return true;
        });
      }

      if (monthDays.length === 0) {
        Alert.alert(t('calendar.clear_month_title'), t('calendar.no_days_to_clear'));
        return;
      }

      // Show confirmation dialog
      const selectedJob = jobs.find(j => j.id === selectedJobId);
      const confirmationMessage = selectedJobId !== 'all' && selectedJob
        ? t('calendar.clear_month_message_job', { count: monthDays.length, jobName: selectedJob.name })
        : t('calendar.clear_month_message', { count: monthDays.length });
        
      Alert.alert(
        t('calendar.clear_month_title'),
        confirmationMessage,
        [
          {
            text: t('calendar.cancel'),
            style: 'cancel'
          },
          {
            text: t('calendar.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                let deletedCount = 0;
                
                // Delete each work day
                for (const workDay of monthDays) {
                  try {
                    await JobService.deleteWorkDay(workDay.id);
                    deletedCount++;
                  } catch (error) {
                    console.error(`Error deleting work day ${workDay.id}:`, error);
                  }
                }

                // Refresh work days
                await loadData();
                
                // Sync with widget after clearing month
                console.log('🔄 Syncing calendar with widget after clearing month...');
                await WidgetSyncService.syncCalendarToWidget();
                console.log('✅ Widget sync completed');

                if (deletedCount > 0) {
                  Alert.alert(
                    t('calendar.clear_month_title'),
                    t('calendar.clear_month_success', { count: deletedCount })
                  );
                } else {
                  Alert.alert(t('common.error'), t('calendar.clear_month_error'));
                }
              } catch (error) {
                console.error('Error clearing month:', error);
                Alert.alert(t('common.error'), t('calendar.clear_month_error'));
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleClearMonth:', error);
      Alert.alert(t('common.error'), t('calendar.clear_month_error'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {jobs.length === 0 ? (
          <NoJobsWarning onCreateJob={handleCreateJob} />
        ) : (
          <>
        {/* Job selector */}
        {renderCompactJobSelector()}

        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <BlurView 
          intensity={isDark ? 98 : 96} 
          tint={isDark ? "dark" : "light"} 
          style={[styles.calendar, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.05)' : 'rgba(0, 122, 255, 0.03)' }]}
        >
          <Calendar
          onDayPress={handleDayPress}
          onMonthChange={(month: any) => setCurrentMonth(new Date(month.timestamp))}
          markedDates={getMarkedDates()}
          dayComponent={CustomDay}
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            textSectionTitleColor: colors.surface,
            textSectionTitleDisabledColor: colors.surface,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: '#ffffff',
            todayTextColor: colors.primary,
            dayTextColor: colors.text,
            textDisabledColor: colors.textTertiary + '80',
            dotColor: colors.primary,
            selectedDotColor: '#ffffff',
            arrowColor: colors.primary,
            monthTextColor: colors.text,
            indicatorColor: colors.primary,
            textDayFontFamily: 'System',
            textMonthFontFamily: 'System',
            textDayHeaderFontFamily: 'System',
            textDayFontWeight: '500',
            textMonthFontWeight: '600',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 13,
            'stylesheet.calendar.header': {
              header: {
                backgroundColor: 'transparent',
                paddingVertical: 12,
                paddingHorizontal: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottomWidth: 0,
              },
              dayHeader: {
                marginTop: 4,
                marginBottom: 4,
                width: 32,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: '600',
                color: colors.text,
              },
              week: {
                marginTop: 0,
                marginBottom: 0,
                flexDirection: 'row',
                justifyContent: 'space-around',
                backgroundColor: 'transparent',
                paddingBottom: 4,
                paddingHorizontal: 8,
              },
            },
            'stylesheet.day.basic': {
              base: {
                width: 50,
                height: 65,
                alignItems: 'center',
                justifyContent: 'flex-start',
              },
              text: {
                marginTop: 4,
                fontSize: 16,
                fontFamily: 'System',
                fontWeight: '500',
                color: colors.text,
                backgroundColor: 'transparent',
              },
              today: {
                backgroundColor: 'transparent',
              },
              todayText: {
                color: colors.primary,
                fontWeight: '600',
              },
            },
            'stylesheet.calendar.main': {
              container: {
                backgroundColor: 'transparent',
                paddingBottom: 4,
              },
              week: {
                marginTop: 0,
                marginBottom: 0,
                flexDirection: 'row',
                justifyContent: 'space-around',
                backgroundColor: 'transparent',
                paddingVertical: 2,
                paddingHorizontal: 8,
              },
              monthView: {
                backgroundColor: 'transparent',
              },
            },
          }}
            />
        </BlurView>
        </Animated.View>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSyncCalendar}
        >
          <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.actionButtonInner}>
            <IconSymbol size={24} name="calendar.badge.plus" color={colors.success} />
            <Text style={styles.actionButtonText}>{t('calendar.sync_to_phone')}</Text>
            <IconSymbol size={16} name="arrow.right" color={colors.success} />
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleClearMonth}
        >
          <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.actionButtonInner}>
            <IconSymbol size={24} name="trash" color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>{t('calendar.clear_month')}</Text>
            <IconSymbol size={16} name="arrow.right" color={colors.error} />
          </BlurView>
        </TouchableOpacity>

        <View style={styles.statsCard}>
          <BlurView 
            intensity={isDark ? 96 : 94} 
            tint={isDark ? "dark" : "light"} 
            style={{ padding: 28, borderRadius: 24 }}
          >
            <LinearGradient
              colors={isDark ? ['rgba(0, 122, 255, 0.1)', 'rgba(0, 122, 255, 0.02)'] : ['rgba(0, 122, 255, 0.08)', 'rgba(0, 122, 255, 0.01)']}
              style={[styles.statsCardGradient, { borderRadius: 24 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          <Text style={styles.statsTitle}>{t('calendar.month_stats')}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <IconSymbol size={24} name="clock.fill" color={colors.success} />
              <Text style={styles.statNumber}>{stats.workDays}</Text>
              <Text style={styles.statLabel}>{t('calendar.worked_days')}</Text>
            </View>
            <View style={styles.statItem}>
              <IconSymbol size={24} name="clock.fill" color={colors.success} />
              <Text style={styles.statNumber}>{Math.round(stats.totalHours)}h</Text>
              <Text style={styles.statLabel}>{t('calendar.total_hours')}</Text>
            </View>
            <View style={styles.statItem}>
              <IconSymbol size={24} name="chart.bar.fill" color={colors.warning} />
              <Text style={styles.statNumber}>{stats.overtimeDays}</Text>
              <Text style={styles.statLabel}>{t('calendar.overtime_days')}</Text>
            </View>
          </View>
          
          {/* Day type breakdown */}
          {(stats.freeDays > 0 || stats.vacationDays > 0 || stats.sickDays > 0) && (
            <View style={styles.dayTypeBreakdown}>
              <Text style={styles.breakdownTitle}>{t('calendar.other_days')}</Text>
              <View style={styles.dayTypeGrid}>
                {stats.freeDays > 0 && (
                  <View style={styles.dayTypeItem}>
                    <IconSymbol size={16} name="calendar" color={DAY_TYPES.free.color} />
                    <Text style={styles.dayTypeNumber}>{stats.freeDays}</Text>
                    <Text style={styles.dayTypeLabel}>{t('calendar.free_days')}</Text>
                  </View>
                )}
                {stats.vacationDays > 0 && (
                  <View style={styles.dayTypeItem}>
                    <IconSymbol size={16} name="sun.max.fill" color={DAY_TYPES.vacation.color} />
                    <Text style={styles.dayTypeNumber}>{stats.vacationDays}</Text>
                    <Text style={styles.dayTypeLabel}>{t('calendar.vacation_days')}</Text>
                  </View>
                )}
                {stats.sickDays > 0 && (
                  <View style={styles.dayTypeItem}>
                    <IconSymbol size={16} name="cross.fill" color={DAY_TYPES.sick.color} />
                    <Text style={styles.dayTypeNumber}>{stats.sickDays}</Text>
                    <Text style={styles.dayTypeLabel}>{t('calendar.sick_days')}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          </BlurView>
        </View>

        <View style={styles.legendCard}>
          <BlurView intensity={isDark ? 95 : 92} tint={isDark ? "dark" : "light"} style={{ padding: 24, borderRadius: 20 }}>
            <LinearGradient
              colors={isDark ? ['rgba(142, 142, 147, 0.08)', 'rgba(142, 142, 147, 0.02)'] : ['rgba(142, 142, 147, 0.05)', 'rgba(142, 142, 147, 0.01)']}
              style={[styles.legendCardGradient, { borderRadius: 20 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          <Text style={styles.legendTitle}>{t('calendar.day_types')}</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DAY_TYPES.work.color }]} />
            <Text style={styles.legendText}>{t('calendar.work_day')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DAY_TYPES.free.color }]} />
            <Text style={styles.legendText}>{t('calendar.free_day')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DAY_TYPES.vacation.color }]} />
            <Text style={styles.legendText}>{t('calendar.vacation_day')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DAY_TYPES.sick.color }]} />
            <Text style={styles.legendText}>{t('calendar.sick_day')}</Text>
          </View>
          
          <View style={styles.legendSeparator} />
          
          <View style={styles.legendItem}>
            <IconSymbol size={16} name="plus" color={colors.primary} />
            <Text style={styles.legendText}>{t('calendar.tap_to_register')}</Text>
          </View>
          </BlurView>
        </View>




          </>
        )}
      </ScrollView>

      <WorkDayModal
        visible={showWorkDayModal}
        onClose={() => {
          setShowWorkDayModal(false);
          setEditingWorkDay(undefined);
          setPreselectedJobId(undefined);
        }}
        date={selectedDate}
        existingWorkDay={editingWorkDay}
        jobs={jobs}
        preselectedJobId={preselectedJobId}
        onSave={handleSaveWorkDay}
        onDelete={editingWorkDay ? handleDeleteWorkDay : undefined}
      />
    </SafeAreaView>
  );
}

