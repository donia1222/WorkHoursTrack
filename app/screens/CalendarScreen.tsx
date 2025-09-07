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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import WorkDayModal from '../components/WorkDayModal';
import NoJobsWarning from '../components/NoJobsWarning';
import { Job, WorkDay, DAY_TYPES } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import { useBackNavigation, useNavigation } from '../context/NavigationContext';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useTimeFormat } from '../hooks/useTimeFormat';
import { CalendarSyncService } from '../services/CalendarSyncService';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationService from '../services/NotificationService';
import WidgetSyncService from '../services/WidgetSyncService';

// Custom Day Component
const CustomDay = ({ date, state, marking, onPress }: any) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { formatTimeWithPreferences } = useTimeFormat();
  
  const getDayIcon = (workDay: WorkDay, job?: Job) => {
    if (!workDay) return null;
    
    let iconName: any = '';
    let iconColor = '#9CA3AF';
    let timeText = '';
    
    if (workDay.type === 'work' && job) {
      iconName = 'briefcase.fill'; // Maleta para trabajo
      iconColor = '#30D158'; // Verde
      timeText = formatTimeWithPreferences(workDay.startTime || '');
      if (workDay.endTime) {
        timeText = `${formatTimeWithPreferences(workDay.startTime || '')}-${formatTimeWithPreferences(workDay.endTime)}`;
        // Add second shift info if split shift
        if (workDay.secondStartTime && workDay.secondEndTime) {
          timeText += `\n${formatTimeWithPreferences(workDay.secondStartTime)}-${formatTimeWithPreferences(workDay.secondEndTime)}`;
        }
      }
    } else if (workDay.type === 'free') {
      iconName = 'house.fill'; // Casa para día libre
      iconColor = '#3B82F6'; // Azul
    } else if (workDay.type === 'vacation') {
      iconName = 'sun.max.fill'; // Sol para vacaciones
      iconColor = '#F59E0B'; // Amarillo
    } else if (workDay.type === 'sick') {
      iconName = 'cross.case.fill'; // Cruz médica para enfermedad
      iconColor = '#EF4444'; // Rojo
    }
    
    return { iconName, iconColor, timeText };
  };
  
  const isToday = state === 'today';
  const isDisabled = state === 'disabled';
  const workDay = marking?.workDay;
  const job = marking?.job;
  const iconStyle = getDayIcon(workDay, job);
  
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
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          borderWidth: 0,
          borderColor: 'transparent',
          marginBottom: 2,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: isToday ? '700' : '500',
            color: isDisabled ? colors.textTertiary : isToday ? '#007AFF' : colors.text,
          }}
        >
          {date.day}
        </Text>
      </View>
      
      {iconStyle && iconStyle.iconName && (
        <View style={{ alignItems: 'center', width: '100%', marginTop: -10 }}>
          <View
            style={{
              width: 20,
              height: 20,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 0,
            }}
          >
            <IconSymbol
              name={iconStyle.iconName}
              size={iconStyle.iconName === 'sun.max.fill' ? 20 : iconStyle.iconName === 'cross.case.fill' ? 18 : 16}
              color={iconStyle.iconColor}
            />
          </View>
          {iconStyle.timeText && (
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
              {iconStyle.timeText}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

interface CalendarScreenProps {
  onNavigate?: (screen: string, options?: any) => void;
  viewMode?: 'month' | 'year';
  onViewToggle?: (mode: 'month' | 'year') => void;
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
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',

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
  actionButtonsContainer: {
    marginBottom: 70,
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
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
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  viewToggleButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  viewToggleTextActive: {
    color: '#FFFFFF',
  },
  yearView: {
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
  yearViewGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  yearTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  yearNavButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  },
  monthsGrid: {
    padding: 16,
    gap: 12,
  },
  monthsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  miniMonth: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  },
  miniMonthHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  miniMonthDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
  },
  miniDay: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  miniDayText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  miniDayWork: {
    backgroundColor: '#30D158',
  },
  miniDayFree: {
    backgroundColor: '#3B82F6',
  },
  miniDayVacation: {
    backgroundColor: '#F59E0B',
  },
  miniDaySick: {
    backgroundColor: '#EF4444',
  },
  miniDayTextActive: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
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
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  breakdownTitle: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  dayTypeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  dayTypeItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  dayTypeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayTypeNumber: {
    fontSize: 20,
    color: colors.text,
    marginBottom: 4,
    fontWeight: '700',
  },
  dayTypeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: -0.2,
    textTransform: 'capitalize',
  },
  legendSeparator: {
    height: 1,
    backgroundColor: colors.separator,
    marginVertical: 8,
  },
});

export default function CalendarScreen({ onNavigate, viewMode: externalViewMode, onViewToggle: externalOnViewToggle }: CalendarScreenProps) {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { formatTimeWithPreferences } = useTimeFormat();
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
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [internalViewMode, setInternalViewMode] = useState<'month' | 'year'>('month');
  
  // Use external viewMode if provided, otherwise use internal
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = externalOnViewToggle ?? setInternalViewMode;
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { handleBack } = useBackNavigation();
  const { selectedJob, setSelectedJob, setOnExportToCalendar } = useNavigation();
  const { triggerHaptic } = useHapticFeedback();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  // Reanimated values for smooth pinch gesture
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  
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

  // Reload data when returning from other screens (especially ReportsScreen)
  useEffect(() => {
    // Set up a listener that will reload data when navigation changes
    const reloadDataOnFocus = () => {
      console.log('📅 CalendarScreen: Reloading data on focus');
      loadData();
    };
    
    // Set up a global handler for when user navigates to calendar
    globalThis.calendarScreenFocusHandler = reloadDataOnFocus;
    
    return () => {
      delete globalThis.calendarScreenFocusHandler;
    };
  }, []);

  // Configure calendar locale based on user language
  useEffect(() => {
    const months = {
      es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
      en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
      fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
      it: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
      pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
      nl: ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'],
      tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
      ja: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
    };

    const days = {
      es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
      en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
      fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
      it: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
      pt: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
      nl: ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'],
      tr: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
      ja: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
      ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
    };

    const daysShort = {
      es: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
      en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      de: ['S', 'M', 'D', 'M', 'D', 'F', 'S'],
      fr: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
      it: ['D', 'L', 'M', 'M', 'G', 'V', 'S'],
      pt: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
      nl: ['Z', 'M', 'D', 'W', 'D', 'V', 'Z'],
      tr: ['P', 'P', 'S', 'Ç', 'P', 'C', 'C'],
      ja: ['日', '月', '火', '水', '木', '金', '土'],
      ru: ['В', 'П', 'В', 'С', 'Ч', 'П', 'С']
    };

    const today = {
      es: 'Hoy',
      en: 'Today',
      de: 'Heute',
      fr: "Aujourd'hui",
      it: 'Oggi',
      pt: 'Hoje',
      nl: 'Vandaag',
      tr: 'Bugün',
      ja: '今日',
      ru: 'Сегодня'
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
      setIsLoadingJobs(true);
      const [loadedJobs, loadedWorkDays] = await Promise.all([
        JobService.getJobs(),
        JobService.getWorkDays(),
      ]);
      setJobs(loadedJobs);
      setWorkDays(loadedWorkDays);
      
      // Mark loading as complete immediately after data is set
      setIsLoadingJobs(false);
      
      // Mark initial load as complete after a short delay
      setTimeout(() => {
        setIsInitialLoad(false);
        console.log('✅ Initial load completed, notifications can now be scheduled');
      }, 2000);
      
      // NO schedule reminders here - only when data changes
    } catch (error) {
      console.error('Error loading data:', error);
      setIsLoadingJobs(false);
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
    
    // Find existing work day for the specific job (if filtered) or any work day for that date
    const existingWorkDay = selectedJobId !== 'all' 
      ? workDays.find(wd => wd.date === dateString && wd.jobId === selectedJobId)
      : workDays.find(wd => wd.date === dateString);
    setEditingWorkDay(existingWorkDay);
    
    // Pre-select the job if a specific job is filtered
    if (selectedJobId !== 'all') {
      setPreselectedJobId(selectedJobId);
    } else {
      setPreselectedJobId(undefined);
    }
    
    setShowWorkDayModal(true);
  };

  // Handle view mode change with animation
  const changeViewMode = (newMode: 'month' | 'year') => {
    // Animate scale and opacity for smooth transition
    scale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
    opacity.value = withTiming(0.7, { duration: 150 });
    
    // Change view mode after a slight delay for smoother transition
    setTimeout(() => {
      setViewMode(newMode);
      if (globalThis.calendarViewToggleHandler) {
        globalThis.calendarViewToggleHandler(newMode);
      }
      
      // Animate back to normal
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 200 });
    }, 100);
  };

  // Elegant pinch gesture using modern Gesture API
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      // Subtle feedback on start - could add haptic here
    })
    .onUpdate((event) => {
      'worklet';
      // Real-time scale feedback during gesture
      const gestureScale = Math.max(0.8, Math.min(1.2, event.scale));
      scale.value = gestureScale;
      
      // Subtle opacity change based on scale for visual feedback
      if (viewMode === 'month') {
        opacity.value = event.scale < 0.9 ? 0.8 + (event.scale * 0.2) : 1;
      } else {
        opacity.value = event.scale > 1.1 ? 0.8 + ((2 - event.scale) * 0.2) : 1;
      }
    })
    .onEnd((event) => {
      'worklet';
      // Reset visual feedback
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 200 });
      
      // Determine if threshold was met for view change
      if (event.scale < 0.75 && viewMode === 'month') {
        runOnJS(changeViewMode)('year');
      } else if (event.scale > 1.25 && viewMode === 'year') {
        runOnJS(changeViewMode)('month');
      }
    });

  // Animated style for smooth transitions
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

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
    
    // No mostrar el selector cuando solo hay un trabajo
    if (jobs.length === 1) {
      // Auto-seleccionar el único trabajo
      if (selectedJobId === 'all') {
        setSelectedJobId(jobs[0].id);
      }
      return null;
    }
    
    // Only show "All" option when there are multiple jobs
    const allOptions = [{ id: 'all', name: t('calendar.all_jobs'), color: colors.primary }].concat(jobs);
    
    if (allOptions.length <= 4) {
      // Para hasta 4 opciones (incluyendo "Todos"), mostrar como pestañas
      return (
        <Animated.View style={[styles.compactJobSelector, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.compactJobSelectorTitle}>{t('calendar.filter_by_job')}</Text>
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
          <Text style={styles.compactJobSelectorTitle}>{t('calendar.filter_by_job')}</Text>
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
      ? workDays.filter(wd => wd.jobId === selectedJobId)
      : workDays.filter(wd => wd.jobId); // Exclude legacy days without jobId

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


  const getMiniMonthData = (year: number, month: number) => {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    const filteredWorkDays = selectedJobId !== 'all'
      ? workDays.filter(wd => wd.jobId === selectedJobId)
      : workDays.filter(wd => wd.jobId); // Exclude legacy days without jobId
    
    const monthWorkDays = filteredWorkDays.filter(day => 
      day.date.startsWith(monthKey)
    );
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    return { monthWorkDays, daysInMonth, firstDay };
  };

  const renderYearView = () => {
    const monthNames: Record<string, string[]> = {
      es: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
      fr: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
      it: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
      pt: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      nl: ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'],
      tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
      ja: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
    };
    
    const months = monthNames[language] || monthNames['es'];
    
    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <BlurView 
          intensity={isDark ? 98 : 96} 
          tint={isDark ? "dark" : "light"} 
          style={[styles.yearView]}
        >
          <LinearGradient
            colors={isDark ? ['rgba(0, 122, 255, 0.08)', 'rgba(0, 122, 255, 0.03)'] : ['rgba(64, 0, 255, 0.04)', 'rgba(0, 122, 255, 0.02)']}
            style={styles.yearViewGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.yearHeader}>
            <TouchableOpacity 
              style={styles.yearNavButton} 
              onPress={() => setSelectedYear(prev => prev - 1)}
            >
              <IconSymbol size={20} name="chevron.left" color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.yearTitle}>{selectedYear}</Text>
            <TouchableOpacity 
              style={styles.yearNavButton} 
              onPress={() => setSelectedYear(prev => prev + 1)}
            >
              <IconSymbol size={20} name="chevron.right" color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.monthsGrid}>
            {Array.from({ length: 6 }, (_, rowIndex) => (
              <View key={rowIndex} style={styles.monthsRow}>
                {Array.from({ length: 2 }, (_, colIndex) => {
                  const monthIndex = rowIndex * 2 + colIndex;
                  if (monthIndex >= 12) return null;
                  const { monthWorkDays, daysInMonth, firstDay } = getMiniMonthData(selectedYear, monthIndex);
                  
                  return (
                    <TouchableOpacity 
                      key={monthIndex} 
                      style={styles.miniMonth}
                      onPress={() => {
                        setCurrentMonth(new Date(selectedYear, monthIndex, 1));
                        setViewMode('month');
                      }}
                    >
                      <Text style={styles.miniMonthHeader}>{months[monthIndex]}</Text>
                      <View style={styles.miniMonthDays}>
                        {/* Días vacíos al inicio del mes */}
                        {Array.from({ length: firstDay }, (_, i) => (
                          <View key={`empty-${i}`} style={styles.miniDay} />
                        ))}
                        
                        {/* Días del mes */}
                        {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                          const day = dayIndex + 1;
                          const dateString = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const workDay = monthWorkDays.find(wd => wd.date === dateString);
                          
                          let dayStyle: any = styles.miniDay;
                          let textStyle: any = styles.miniDayText;
                          
                          if (workDay) {
                            textStyle = styles.miniDayTextActive;
                            switch (workDay.type) {
                              case 'work':
                                dayStyle = [styles.miniDay, styles.miniDayWork];
                                break;
                              case 'free':
                                dayStyle = [styles.miniDay, styles.miniDayFree];
                                break;
                              case 'vacation':
                                dayStyle = [styles.miniDay, styles.miniDayVacation];
                                break;
                              case 'sick':
                                dayStyle = [styles.miniDay, styles.miniDaySick];
                                break;
                            }
                          }
                          
                          return (
                            <View key={day} style={dayStyle}>
                              <Text style={textStyle}>{day}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </BlurView>
      </Animated.View>
    );
  };

  const getMonthStats = () => {
    const monthKey = viewMode === 'month' 
      ? currentMonth.toISOString().slice(0, 7)
      : `${selectedYear}`;
    
    // Filter workDays by selected job if not "all"
    // When filtering, show only days from selected job (both work and non-work days)
    const filteredWorkDays = selectedJobId !== 'all'
      ? workDays.filter(wd => wd.jobId === selectedJobId)
      : workDays.filter(wd => wd.jobId); // Exclude legacy days without jobId
    
    const monthWorkDays = viewMode === 'month'
      ? filteredWorkDays.filter(day => day.date.startsWith(monthKey))
      : filteredWorkDays.filter(day => day.date.startsWith(monthKey));

    const workDaysOnly = monthWorkDays.filter(day => day.type === 'work');
    const freeDays = monthWorkDays.filter(day => day.type === 'free');
    const vacationDays = monthWorkDays.filter(day => day.type === 'vacation');
    const sickDays = monthWorkDays.filter(day => day.type === 'sick');

    const totalDays = monthWorkDays.length;
    const totalHours = workDaysOnly.reduce((sum, day) => sum + day.hours, 0);
    // Calculate overtime hours using saved standard hours or default to 8
    const overtimeHours = workDaysOnly.reduce((sum, day) => {
      if (day.overtime) {
        const standardHours = day.standardHours || 8;
        const overtimeCalc = Math.max(0, day.hours - standardHours);
        
        console.log('📅 CalendarScreen - Day:', day.date);
        console.log('   Total hours:', day.hours);
        console.log('   Standard hours:', standardHours, '(saved:', day.standardHours, ')');
        console.log('   Overtime calc:', overtimeCalc);
        
        return sum + overtimeCalc;
      }
      return sum;
    }, 0);
    
    // Count unique work days only (multiple sessions on same day count as 1 day) - like ReportsScreen
    const uniqueWorkDates = new Set(workDaysOnly.map(day => day.date.split('T')[0]));
    const uniqueWorkDays = uniqueWorkDates.size;

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
      overtimeHours, 
      jobStats,
      workDays: uniqueWorkDays,
      freeDays: freeDays.length,
      vacationDays: vacationDays.length,
      sickDays: sickDays.length,
      period: viewMode === 'month' ? t('calendar.month') : t('calendar.year'),
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
        monthDays = monthDays.filter(day => day.jobId === selectedJobId);
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
        {!isLoadingJobs && jobs.length === 0 ? (
          <NoJobsWarning onCreateJob={handleCreateJob} />
        ) : (
          <>
        {/* Job selector */}
        {!isLoadingJobs && renderCompactJobSelector()}

        {/* Calendar Views with Pinch Gesture */}
        <GestureDetector gesture={pinchGesture}>
          <Reanimated.View style={animatedStyle}>
            {viewMode === 'month' ? (
              <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
            <BlurView 
              intensity={isDark ? 98 : 96} 
              tint={isDark ? "dark" : "light"} 
              style={[styles.calendar, { backgroundColor: isDark ? 'rgba(0, 123, 255, 0.04)' : 'rgba(64, 0, 255, 0.03)' }]}
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
            ) : (
              renderYearView()
            )}
          </Reanimated.View>
        </GestureDetector>

            <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        {!isLoadingJobs && (
                            <BlurView intensity={isDark ? 95 : 92} tint={isDark ? "dark" : "light"} style={{ padding: 4, borderRadius: 20 }}>
            <LinearGradient
              colors={isDark ? ['rgba(142, 142, 147, 0.08)', 'rgba(142, 142, 147, 0.11)'] : ['rgba(142, 142, 147, 0.08)', 'rgba(142, 142, 147, 0.01)']}
              style={[styles.legendCardGradient, { borderRadius: 20 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          <Text style={styles.legendTitle}>{t('calendar.day_types')}</Text>

            <View style={styles.dayTypeBreakdown}>
              {/* Primera fila - Días de trabajo */}
              <View style={styles.dayTypeGrid}>
                <View style={styles.dayTypeItem}>
                  <View style={[styles.dayTypeIconContainer, { backgroundColor: DAY_TYPES.work.color + '20' }]}>
                    <IconSymbol size={28} name="briefcase.fill" color={DAY_TYPES.work.color} />
                  </View>
                  <Text style={styles.dayTypeNumber}>{stats.workDays}</Text>
                  <Text style={styles.dayTypeLabel}>{t('reports.days')}</Text>
                </View>

                <View style={styles.dayTypeItem}>
                  <View style={[styles.dayTypeIconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <IconSymbol size={28} name="clock.fill" color={colors.primary} />
                  </View>
                  <Text style={styles.dayTypeNumber}>{stats.totalHours.toFixed(1)}</Text>
                  <Text style={styles.dayTypeLabel}>{t('reports.total_hours')}</Text>
                </View>

                <View style={styles.dayTypeItem}>
                  <View style={[styles.dayTypeIconContainer, { backgroundColor: colors.warning + '20' }]}>
                    <IconSymbol size={28} name="clock.arrow.circlepath" color={colors.warning} />
                  </View>
                  <Text style={styles.dayTypeNumber}>{stats.overtimeHours.toFixed(1)}</Text>
                  <Text style={styles.dayTypeLabel}>Overtime</Text>
                </View>
              </View>

              {/* Segunda fila - Otros tipos de días */}
              <View style={styles.dayTypeGrid}>
                <View style={styles.dayTypeItem}>
                  <View style={[styles.dayTypeIconContainer, { backgroundColor: DAY_TYPES.free.color + '20' }]}>
                    <IconSymbol size={28} name="house.fill" color={DAY_TYPES.free.color} />
                  </View>
                  <Text style={styles.dayTypeNumber}>{stats.freeDays}</Text>
                  <Text style={styles.dayTypeLabel}>{t('calendar.free_days')}</Text>
                </View>

                <View style={styles.dayTypeItem}>
                  <View style={[styles.dayTypeIconContainer, { backgroundColor: DAY_TYPES.vacation.color + '20' }]}>
                    <IconSymbol size={28} name="sun.max.fill" color={DAY_TYPES.vacation.color} />
                  </View>
                  <Text style={styles.dayTypeNumber}>{stats.vacationDays}</Text>
                  <Text style={styles.dayTypeLabel}>{t('calendar.vacation_days')}</Text>
                </View>

                <View style={styles.dayTypeItem}>
                  <View style={[styles.dayTypeIconContainer, { backgroundColor: DAY_TYPES.sick.color + '20' }]}>
                    <IconSymbol size={28} name="cross.case.fill" color={DAY_TYPES.sick.color} />
                  </View>
                  <Text style={styles.dayTypeNumber}>{stats.sickDays}</Text>
                  <Text style={styles.dayTypeLabel}>{t('calendar.sick_days')}</Text>
                </View>
              </View>
            </View>
            
          </BlurView>
        )}
        {!isLoadingJobs && (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSyncCalendar}
          >
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={[styles.actionButtonInner, styles.syncButton]}>
              <LinearGradient
                colors={['rgba(52, 199, 89, 0.1)', 'rgba(52, 199, 89, 0.05)']}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={[styles.actionButtonIconContainer, { backgroundColor: colors.success + '20' }]}>
                <IconSymbol size={24} name="calendar.badge.plus" color={colors.success} />
              </View>
              <Text style={[styles.actionButtonText, { color: colors.success }]}>{t('calendar.sync_to_phone')}</Text>
              <IconSymbol size={16} name="arrow.right" color={colors.success} />
            </BlurView>
          </TouchableOpacity>


          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearMonth}
          >
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={[styles.actionButtonInner, styles.clearButton]}>
              <LinearGradient
                colors={['rgba(255, 59, 48, 0.1)', 'rgba(255, 59, 48, 0.05)']}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={[styles.actionButtonIconContainer, { backgroundColor: colors.error + '20' }]}>
                <IconSymbol size={24} name="trash" color={colors.error} />
              </View>
              <Text style={[styles.actionButtonText, { color: colors.error }]}>{t('calendar.clear_month')}</Text>
              <IconSymbol size={16} name="arrow.right" color={colors.error} />
            </BlurView>
          </TouchableOpacity>
        </View>
        )}
        </Animated.View> 
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
