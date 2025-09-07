import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  Switch,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job, WorkDay } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import { useBackNavigation, useNavigation } from '../context/NavigationContext';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useTimeFormat as useTimeFormatHook } from '../hooks/useTimeFormat';
import { Calendar } from 'react-native-calendars';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import JobFormModal from '../components/JobFormModal';
import EditWorkDayModal from '../components/EditWorkDayModal';
import DeleteWorkDayModal from '../components/DeleteWorkDayModal';
import SubscriptionModal from '../components/SubscriptionModal';
import { useSubscription } from '../hooks/useSubscription';
import { OvertimeStatsModal } from '../components/OvertimeStatsModal';

interface ReportsScreenProps {
  onNavigate: (screen: string) => void;
}

interface PeriodStats {
  totalHours: number;
  totalDays: number;
  overtimeHours: number;
  avgHoursPerDay: number;
  jobBreakdown: {
    job: Job;
    hours: number;
    days: number;
    percentage: number;
  }[];
}

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  style?: any;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, duration = 1000, decimals = 0, suffix = '', style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const listener = animatedValue.addListener(({ value: animValue }) => {
      setDisplayValue(animValue);
    });

    Animated.spring(animatedValue, {
      toValue: value,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value, animatedValue]);

  const formatValue = (val: number) => {
    return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
  };

  return (
    <Text style={style}>
      {formatValue(displayValue)}{suffix}
    </Text>
  );
};

interface AnimatedIconProps {
  name: import('@/components/ui/IconSymbol').IconSymbolName;
  size: number;
  color: string;
}

const AnimatedIcon: React.FC<AnimatedIconProps> = ({ name, size, color }) => {
  const scaleValue = useRef(new Animated.Value(0)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.spring(rotateValue, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleValue, rotateValue]);

  const animatedStyle = {
    transform: [
      { scale: scaleValue },
      { 
        rotate: rotateValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        })
      },
    ],
  };

  return (
    <Animated.View style={animatedStyle}>
      <IconSymbol size={size} name={name} color={color} />
    </Animated.View>
  );
};

export default function ReportsScreen({ onNavigate }: ReportsScreenProps) {
  const { selectedJob, setSelectedJob, navigationParams, clearNavigationParams } = useNavigation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year' | 'custom'>('month');
  const [selectedJobId, setSelectedJobId] = useState<string | 'all'>(selectedJob?.id || 'all');
  const [periodStats, setPeriodStats] = useState<PeriodStats | null>(null);
  const [visibleRecentDays, setVisibleRecentDays] = useState<number>(4);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'from' | 'to'>('from');
  const [fromDate, setFromDate] = useState<Date>(new Date(new Date().setDate(1))); // First day of current month
  const [toDate, setToDate] = useState<Date>(new Date()); // Today
  const [tempFromDate, setTempFromDate] = useState<Date>(new Date(new Date().setDate(1)));
  const [tempToDate, setTempToDate] = useState<Date>(new Date());
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [includeBillingData, setIncludeBillingData] = useState(true);
  const [includeInvoiceDetails, setIncludeInvoiceDetails] = useState(true);
  const [includeSalaryCalculation, setIncludeSalaryCalculation] = useState(false);
  const [salaryPeriod, setSalaryPeriod] = useState<'hour' | 'week' | 'month'>('hour');
  const [showJobFormModal, setShowJobFormModal] = useState(false);
  const [editingJobForBilling, setEditingJobForBilling] = useState<Job | null>(null);
  const [useTimeFormat, setUseTimeFormat] = useState(true); // false = decimal (8.05h), true = time (8h 3m) - DEFAULT: HH:MM
  const [editWorkDayModal, setEditWorkDayModal] = useState(false);
  const [selectedWorkDay, setSelectedWorkDay] = useState<WorkDay | null>(null);
  const [deleteWorkDayModal, setDeleteWorkDayModal] = useState(false);
  const [deletingWorkDay, setDeletingWorkDay] = useState<WorkDay | null>(null);
  const [skipAnimations, setSkipAnimations] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showOvertimeStatsModal, setShowOvertimeStatsModal] = useState(false);
  
  const { handleBack } = useBackNavigation();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { triggerHaptic } = useHapticFeedback();
  const { formatTimeWithPreferences } = useTimeFormatHook();
  const { isSubscribed } = useSubscription();
  
  // Function to format time compactly for reports
  const formatTimeCompact = (time: string): string => {
    if (!time) return time;
    const formatted = formatTimeWithPreferences(time);
    // Make AM/PM more compact: "9:00 AM" -> "9:00a", "2:30 PM" -> "2:30p"
    return formatted
      .replace(' AM', 'a')
      .replace(' PM', 'p');
  };
  const styles = getStyles(colors, isDark);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadData();
    loadTimeFormatPreference();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: skipAnimations ? 0 : 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: skipAnimations ? 1000 : 50,
        friction: skipAnimations ? 20 : 7,
      }),
    ]).start();
    
    // Reload preference AND data when screen comes back into focus using AppState
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadTimeFormatPreference();
        loadData(); // Add this line to reload data when app becomes active
      }
    });
    
    return () => {
      appStateSubscription?.remove();
    };
  }, [fadeAnim, scaleAnim, skipAnimations]);

  // Handle animation updates when skipAnimations changes
  useEffect(() => {
    if (skipAnimations) {
      // Instantly set to final values when skipping animations
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, [skipAnimations]);

  useEffect(() => {
    if (workDays.length > 0) {
      // ALWAYS use the function based on getRecentWorkDays that works
      calculateStatsFromRecentActivity();
    }
  }, [workDays, jobs, selectedPeriod, selectedJobId, fromDate, toDate]);

  // Sync selectedJob from navigation context with local selectedJobId
  useEffect(() => {
    if (selectedJob?.id && selectedJob.id !== selectedJobId) {
      setSelectedJobId(selectedJob.id);
      // Clear selectedJob from context after using it
      setSelectedJob(null);
    }
  }, [selectedJob]);

  // Add navigation focus listener to reload data when coming back to this screen
  useEffect(() => {
    // Reload data when component mounts or becomes visible
    const reloadDataOnFocus = () => {
      console.log('📊 ReportScreen: Reloading data on focus');
      loadData();
    };

    // Set up a global handler for when user navigates to reports
    globalThis.reportsScreenFocusHandler = reloadDataOnFocus;

    // Also reload immediately when this effect runs
    reloadDataOnFocus();

    return () => {
      delete globalThis.reportsScreenFocusHandler;
    };
  }, []);

  // Listen for header export button press
  useEffect(() => {
    // Register the export handler globally
    globalThis.reportsScreenExportHandler = () => {
      showBillingDataModal();
    };

    // Cleanup on unmount
    return () => {
      delete globalThis.reportsScreenExportHandler;
    };
  }, []);

  const loadData = async () => {
    try {
      setIsLoadingJobs(true);
      const [loadedJobs, loadedWorkDays] = await Promise.all([
        JobService.getJobs(),
        JobService.getWorkDays(),
      ]);
      console.log('📊 ReportScreen loadData - Total workDays:', loadedWorkDays.length);
      console.log('📊 Recent workDays:', loadedWorkDays.slice(0, 5).map(d => ({ date: d.date, hours: d.hours, jobId: d.jobId, createdAt: d.createdAt })));
      
      // NO LONGER CLEANING FUTURE DATES - Users can add future work schedules
      // This was causing issues when users added scheduled days in CalendarScreen
      setJobs(loadedJobs);
      setWorkDays(loadedWorkDays);
      
      // Mark loading as complete immediately after data is set
      setIsLoadingJobs(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setIsLoadingJobs(false);
    }
  };

  const loadTimeFormatPreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('@time_format_preference');
      if (saved !== null) {
        setUseTimeFormat(saved === 'true');
      }
    } catch (error) {
      console.error('Error loading time format preference:', error);
    }
  };

  const toggleTimeFormat = async () => {
    const newValue = !useTimeFormat;
    setUseTimeFormat(newValue);
    try {
      await AsyncStorage.setItem('@time_format_preference', newValue.toString());
    } catch (error) {
      console.error('Error saving time format preference:', error);
    }
  };

  // Función para calcular horas netas (descontando pausas)
  const getNetHours = (workDay: WorkDay): number => {
    const totalHours = workDay.hours || 0;
    const breakHours = workDay.breakHours || 0;
    return Math.max(0, totalHours - breakHours);
  };

  const formatHoursForDisplay = (hours: number): string => {
    if (useTimeFormat) {
      // Time format: 8h 3m
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      if (h === 0) return `${m}m`;
      if (m === 0) return `${h}h`;
      return `${h}h ${m}m`;
    } else {
      // Decimal format: 8.05h
      return `${hours.toFixed(2)}h`;
    }
  };

  const calculateStatsFromRecentActivity = () => {
    
    // Step 1: Get the EXACT same data that getRecentWorkDays gets
    // BUT: if type doesn't exist, treat as 'work' (for old data)
    let baseWorkDays = workDays.filter(day => day.type === 'work' || !day.type);
    console.log('Step 1 - Work days after type filter:', baseWorkDays.length);
    console.log('Sample base work days:', baseWorkDays.slice(0, 2).map(d => ({ date: d.date, hours: d.hours, type: d.type })));
    
    // Step 2: Filter by selected job (same as getRecentWorkDays)
    if (selectedJobId !== 'all') {
      baseWorkDays = baseWorkDays.filter(day => day.jobId === selectedJobId);
    }
    console.log('Step 2 - After job filter:', baseWorkDays.length);
    
    // Step 3: Add date filtering for this month only
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
    
    const monthWorkDays = baseWorkDays.filter(day => {
      // Use same logic as MapLocation - compare month and year directly
      const dayDate = new Date(day.date);
      const dayMonth = dayDate.getMonth() + 1;
      const dayYear = dayDate.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      return dayMonth === currentMonth && dayYear === currentYear;
    });
    
    console.log('Step 3 - This month work days:', monthWorkDays.length);
    console.log('Month range:', startOfMonth.toDateString(), 'to', endOfMonth.toDateString());
    console.log('Sample month work days:', monthWorkDays.slice(0, 3).map(d => `${d.date}: ${getNetHours(d)}h (net)`));
    
    // Step 4: Calculate totals using the SAME data structure (con horas netas)
    const totalHours = monthWorkDays.reduce((sum, day) => sum + getNetHours(day), 0);
    // Count unique days only (multiple sessions on same day count as 1 day)
    const uniqueDates = new Set(monthWorkDays.map(day => day.date.split('T')[0]));
    const totalDays = uniqueDates.size;
    const overtimeHours = monthWorkDays.reduce((sum, day) => {
      if (day.overtime) {
        const standardHours = day.standardHours || 8;
        return sum + Math.max(0, getNetHours(day) - standardHours);
      }
      return sum;
    }, 0);
    const avgHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;
    
    console.log('🎉 FINAL NUMBERS:', { 
      totalHours, 
      totalDays, 
      avgHoursPerDay: avgHoursPerDay.toFixed(1),
      monthWorkDaysUsed: monthWorkDays.length
    });
    
    // Create job breakdown
    let jobStats: {
      job: Job;
      hours: number;
      days: number;
      percentage: number;
    }[] = [];
    
    if (selectedJobId === 'all') {
      jobStats = jobs.map(job => {
        const jobWorkDays = monthWorkDays.filter(day => day.jobId === job.id);
        const jobHours = jobWorkDays.reduce((sum, day) => sum + getNetHours(day), 0);
        // Count unique days for this job (multiple sessions same day = 1 day)
        const jobUniqueDates = new Set(jobWorkDays.map(day => day.date.split('T')[0]));
        const jobDays = jobUniqueDates.size;
        const percentage = totalHours > 0 ? (jobHours / totalHours) * 100 : 0;

        return {
          job,
          hours: jobHours,
          days: jobDays,
          percentage,
        };
      }).filter(stat => stat.hours > 0)
        .sort((a, b) => b.hours - a.hours);
    } else {
      const selectedJob = jobs.find(job => job.id === selectedJobId);
      if (selectedJob && totalHours > 0) {
        jobStats = [{
          job: selectedJob,
          hours: totalHours,
          days: totalDays,
          percentage: 100,
        }];
      }
    }
    
    setPeriodStats({
      totalHours,
      totalDays,
      overtimeHours,
      avgHoursPerDay,
      jobBreakdown: jobStats,
    });
  };

  const calculatePeriodStats = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (selectedPeriod) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        startDate = fromDate;
        endDate = toDate;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    console.log('🔍 DEBUG ReportsScreen calculatePeriodStats:');
    console.log('Total workDays loaded:', workDays.length);
    console.log('Selected period:', selectedPeriod);
    console.log('Date range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    console.log('First 3 workDays dates:', workDays.slice(0, 3).map(d => ({ date: d.date, type: d.type })));

    // Filter by date range
    let periodWorkDays = workDays.filter(day => {
      const dayDate = new Date(day.date);
      // Fix date comparison - add one day to endDate to include today
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDate.getDate() + 1);
      const isInRange = dayDate >= startDate && dayDate < endDatePlusOne;
      
      // Debug individual day filtering
      if (workDays.indexOf(day) < 5) { // Only log first 5 days to avoid spam
        console.log(`Day ${day.date}: dayDate=${dayDate.toISOString().split('T')[0]}, inRange=${isInRange}, type=${day.type}`);
      }
      
      return isInRange;
    });

    console.log('Period workDays after date filter:', periodWorkDays.length);
    console.log('Sample period workDays:', periodWorkDays.slice(0, 3));
    
    // Check what types we have
    const types = periodWorkDays.map(day => day.type);
    console.log('Types found in period workDays:', types);
    console.log('Unique types:', [...new Set(types)]);

    // Filter ONLY work days (like CalendarScreen does)
    const workDaysOnly = periodWorkDays.filter(day => day.type === 'work');
    
    // TEMP: Also try without type filter to compare
    const allPeriodDays = periodWorkDays; // All days regardless of type
    
    console.log('Work days only after type filter:', workDaysOnly.length);
    console.log('All period days (no type filter):', allPeriodDays.length);
    console.log('Sample work days:', workDaysOnly.slice(0, 3));
    console.log('Sample all days:', allPeriodDays.slice(0, 3));

    // Filter by selected job if not "all" 
    // TEMP: Use allPeriodDays instead of workDaysOnly to test
    let filteredWorkDays = allPeriodDays; // Changed from workDaysOnly
    if (selectedJobId !== 'all') {
      filteredWorkDays = allPeriodDays.filter(day => day.jobId === selectedJobId); // Changed from workDaysOnly
    }

    // Calculate totals
    const totalHours = filteredWorkDays.reduce((sum, day) => sum + getNetHours(day), 0);
    // Count unique days only (multiple sessions on same day count as 1 day)
    const uniqueDates = new Set(filteredWorkDays.map(day => day.date.split('T')[0]));
    const totalDays = uniqueDates.size;
    const overtimeHours = filteredWorkDays.reduce((sum, day) => {
      if (day.overtime) {
        const standardHours = day.standardHours || 8;
        return sum + Math.max(0, getNetHours(day) - standardHours);
      }
      return sum;
    }, 0);
    const avgHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;

    // Job breakdown
    let jobStats: {
      job: Job;
      hours: number;
      days: number;
      percentage: number;
    }[];
    
    if (selectedJobId === 'all') {
      jobStats = jobs.map(job => {
        const jobWorkDays = periodWorkDays.filter(day => day.jobId === job.id);
        const jobHours = jobWorkDays.reduce((sum, day) => sum + getNetHours(day), 0);
        // Count unique days for this job (multiple sessions same day = 1 day)
        const jobUniqueDates = new Set(jobWorkDays.map(day => day.date.split('T')[0]));
        const jobDays = jobUniqueDates.size;
        const percentage = totalHours > 0 ? (jobHours / totalHours) * 100 : 0;

        return {
          job,
          hours: jobHours,
          days: jobDays,
          percentage,
        };
      }).filter(stat => stat.hours > 0)
        .sort((a, b) => b.hours - a.hours);
    } else {
      // When filtering by specific job, show only that job with 100% percentage
      const selectedJob = jobs.find(job => job.id === selectedJobId);
      if (selectedJob && totalHours > 0) {
        jobStats = [{
          job: selectedJob,
          hours: totalHours,
          days: totalDays,
          percentage: 100,
        }];
      } else {
        jobStats = [];
      }
    }

    // TEMP DEBUG: Show what we calculated
    console.log('📊 FINAL CALCULATION RESULTS:');
    console.log('totalHours:', totalHours);
    console.log('totalDays:', totalDays);
    console.log('filteredWorkDays used for calculation:', filteredWorkDays.length);
    console.log('Sample filteredWorkDays:', filteredWorkDays.slice(0, 2));

    setPeriodStats({
      totalHours,
      totalDays,
      overtimeHours,
      avgHoursPerDay,
      jobBreakdown: jobStats,
    });
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'week':
        return t('reports.last_7_days');
      case 'month':
        return t('reports.this_month');
      case 'year':
        return t('reports.this_year');
      case 'custom':
        return t('reports.from_to_dates', {
          fromDate: fromDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          toDate: toDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        });
      default:
        return t('reports.this_month');
    }
  };

  const getRecentWorkDays = () => {
    console.log('🔍 getRecentWorkDays called with:', { 
      totalWorkDays: workDays.length, 
      selectedJobId,
      todayDate: new Date().toISOString().split('T')[0]
    });
    
    // Filter only work days first (include days without type for legacy data)
    let filteredWorkDays = workDays.filter(day => day.type === 'work' || !day.type);
    console.log('🔍 After work type filter:', filteredWorkDays.length);
    
    // Filter by selected job if not "all"
    if (selectedJobId !== 'all') {
      filteredWorkDays = filteredWorkDays.filter(day => day.jobId === selectedJobId);
      console.log('🔍 After job filter:', filteredWorkDays.length);
    }
    
    // DON'T consolidate sessions - show each individual session
    // This way every timer session appears separately
    const result = filteredWorkDays
      .sort((a, b) => {
        // Sort by created date descending (most recent first)
        const aTime = new Date(a.createdAt || a.date).getTime();
        const bTime = new Date(b.createdAt || b.date).getTime();
        return bTime - aTime;
      })
      .slice(0, visibleRecentDays);
    
    console.log('🔍 getRecentWorkDays final result (individual sessions):', result.map(d => ({ 
      date: d.date, 
      hours: d.hours, 
      id: d.id,
      createdAt: d.createdAt,
      actualStartTime: d.actualStartTime,
      actualEndTime: d.actualEndTime
    })));
    
    return result;
  };

  const getAllRecentWorkDays = () => {
    // Filter only work days first (include days without type for legacy data)
    let filteredWorkDays = workDays.filter(day => day.type === 'work' || !day.type);
    
    // Filter by selected job if not "all"
    if (selectedJobId !== 'all') {
      filteredWorkDays = filteredWorkDays.filter(day => day.jobId === selectedJobId);
    }
    
    // Group by date and job to consolidate multiple sessions (same logic as getRecentWorkDays)
    const consolidatedMap = new Map<string, WorkDay>();
    
    filteredWorkDays.forEach(day => {
      const dateKey = day.date.split('T')[0];
      const key = `${dateKey}_${day.jobId || 'no-job'}`;
      
      const existing = consolidatedMap.get(key);
      if (existing) {
        const updatedDay = { ...existing };
        updatedDay.hours = updatedDay.hours + day.hours;
        // Mantener breakHours separadas para el cálculo correcto
        if (day.breakHours) {
          updatedDay.breakHours = (updatedDay.breakHours || 0) + day.breakHours;
        }
        
        if (day.notes && updatedDay.notes) {
          updatedDay.notes = `${updatedDay.notes}\n---\n${day.notes}`;
        } else if (day.notes) {
          updatedDay.notes = day.notes;
        }
        
        if (day.actualStartTime && (!updatedDay.actualStartTime || day.actualStartTime < updatedDay.actualStartTime)) {
          updatedDay.actualStartTime = day.actualStartTime;
        }
        
        if (day.actualEndTime && (!updatedDay.actualEndTime || day.actualEndTime > updatedDay.actualEndTime)) {
          updatedDay.actualEndTime = day.actualEndTime;
        }
        
        updatedDay.overtime = getNetHours(updatedDay) > 8;
        consolidatedMap.set(key, updatedDay);
      } else {
        consolidatedMap.set(key, { ...day });
      }
    });
    
    return Array.from(consolidatedMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleLoadMore = () => {
    setVisibleRecentDays(prev => prev + 10);
  };

  const handleEditWorkDay = (workDay: WorkDay) => {
    setSelectedWorkDay(workDay);
    setEditWorkDayModal(true);
  };

  const handleWorkDayUpdate = async (updatedWorkDay: WorkDay) => {
    // Disable animations temporarily when returning from EditModal
    setSkipAnimations(true);
    
    // Close modal first
    setEditWorkDayModal(false);
    setSelectedWorkDay(null);
    
    // Update the local workDays state directly to avoid re-fetch
    setWorkDays(prevWorkDays => 
      prevWorkDays.map(wd => 
        wd.id === updatedWorkDay.id ? updatedWorkDay : wd
      )
    );
    
    // Only reload statistics without full re-render
    setTimeout(() => {
      calculateStatsFromRecentActivity();
      // Re-enable animations after update is complete
      setTimeout(() => {
        setSkipAnimations(false);
      }, 100);
    }, 50);
  };

  const handleDeleteWorkDay = (workDay: WorkDay) => {
    setDeletingWorkDay(workDay);
    setDeleteWorkDayModal(true);
  };

  const confirmDeleteWorkDay = async () => {
    if (!deletingWorkDay) return;

    try {
      console.log('🗑️ Deleting work day:', deletingWorkDay.id, deletingWorkDay.date);
      
      // IMMEDIATELY update local state to show changes in UI
      let filteredWorkDays: WorkDay[] = [];
      setWorkDays(prevWorkDays => {
        filteredWorkDays = prevWorkDays.filter(day => day.id !== deletingWorkDay.id);
        console.log('🔄 Immediately updated state, remaining work days:', filteredWorkDays.length);
        return filteredWorkDays;
      });
      
      // IMMEDIATE stats clearing - hide stats completely when no data
      setTimeout(() => {
        console.log('📊 Immediately hiding stats after deletion...');
        
        // Check if after deletion there are any work days left for the current period
        const hasRemainingData = filteredWorkDays.some(day => {
          if (day.type && day.type !== 'work') return false;
          if (selectedJobId !== 'all' && day.jobId !== selectedJobId) return false;
          
          const dayDate = new Date(day.date);
          const now = new Date();
          
          if (selectedPeriod === 'month') {
            return dayDate.getFullYear() === now.getFullYear() && dayDate.getMonth() === now.getMonth();
          } else if (selectedPeriod === 'year') {
            return dayDate.getFullYear() === now.getFullYear();
          } else if (selectedPeriod === 'custom') {
            return dayDate >= fromDate && dayDate <= toDate;
          }
          return false;
        });
        
        if (hasRemainingData) {
          // If there's still data, recalculate
          calculateStatsFromRecentActivity();
          console.log('📊 Recalculating stats with remaining data');
        } else {
          // If no data remains, hide stats completely
          setPeriodStats(null);
          console.log('📊 No data remaining - stats hidden completely');
        }
      }, 10);
      
      // Then do the actual deletion in background
      await JobService.deleteWorkDay(deletingWorkDay.id);
      
      // Final reload to ensure everything is in sync
      console.log('🔄 Final data reload after deletion...');
      await loadData();
      
    } catch (error) {
      console.error('Error deleting work day:', error);
      // If deletion failed, reload to restore correct state
      await loadData();
      Alert.alert(t('common.error'), t('reports.delete_work_day_error'));
    } finally {
      setDeleteWorkDayModal(false);
      setDeletingWorkDay(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === 'es' ? 'es-ES' : 
                   language === 'en' ? 'en-US' : 
                   language === 'de' ? 'de-DE' : 
                   language === 'fr' ? 'fr-FR' : 
                   language === 'it' ? 'it-IT' : 'es-ES';
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatHoursDisplay = (hours: number): string => {
    if (hours < 0.017) { // Less than 1 minute (0.017h = 1min)
      return '< 1 min';
    } else if (hours < 1) { // Less than 1 hour
      const minutes = Math.round(hours * 60);
      return `${minutes} min`;
    } else {
      // For 1 hour or more, show hours with max 1 decimal
      return `${hours.toFixed(1)}h`;
    }
  };

  const handleDatePickerConfirm = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'ios') {
      // En iOS, solo cerrar cuando se confirma
      if (event.type === 'set' && selectedDate) {
        if (datePickerMode === 'from') {
          setTempFromDate(selectedDate);
          setFromDate(selectedDate);
        } else {
          setTempToDate(selectedDate);
          setToDate(selectedDate);
        }
        setSelectedPeriod('custom');
      }
      setShowDatePicker(false);
    } else {
      // En Android
      setShowDatePicker(false);
      if (selectedDate) {
        if (datePickerMode === 'from') {
          setTempFromDate(selectedDate);
          setFromDate(selectedDate);
        } else {
          setTempToDate(selectedDate);
          setToDate(selectedDate);
        }
        setSelectedPeriod('custom');
      }
    }
  };
  
  const applyDateRange = () => {
    setFromDate(tempFromDate);
    setToDate(tempToDate);
    setSelectedPeriod('custom');
  };
  
  const openDatePicker = (mode: 'from' | 'to') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const showBillingDataModal = () => {
    if (!isSubscribed) {
      setShowSubscriptionModal(true);
      return;
    }
    setShowBillingModal(true);
  };

  const generatePDF = async () => {
    if (!periodStats) return;

    setIsGeneratingPDF(true);
    
    try {
      // Get filtered data for PDF
      const selectedJob = selectedJobId === 'all' ? null : jobs.find(job => job.id === selectedJobId);
      const jobName = selectedJob ? selectedJob.name : t('reports.all_jobs');
      
      // Generate HTML content
      const htmlContent = await generateHTMLReport(includeBillingData);
      
      // Create PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      // Share PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${t('reports.export_pdf')} - ${jobName}`
        });
      }

      Alert.alert('✅', t('reports.pdf_generated'));
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('❌', t('reports.pdf_error'));
    } finally {
      setIsGeneratingPDF(false);
      setShowBillingModal(false);
    }
  };

  const handleExportWithBillingData = () => {
    generatePDF();
  };

  const getBillingData = () => {
    // Get billing data from the first job that has billing enabled, or from selected job
    let jobWithBilling = null;
    
    console.log('🔍 [BILLING] Getting billing data, selectedJobId:', selectedJobId);
    console.log('🔍 [BILLING] Available jobs:', jobs.length);
    
    if (selectedJobId !== 'all') {
      const selectedJob = jobs.find(job => job.id === selectedJobId);
      console.log('🔍 [BILLING] Selected job found:', !!selectedJob);
      if (selectedJob?.billing?.enabled && selectedJob?.billing?.userData) {
        console.log('🔍 [BILLING] Selected job has billing data');
        jobWithBilling = selectedJob;
      }
    }
    
    // If no selected job or it doesn't have billing, find first job with billing data
    if (!jobWithBilling) {
      console.log('🔍 [BILLING] Looking for any job with billing data...');
      jobWithBilling = jobs.find(job => 
        job.billing?.enabled && 
        job.billing?.userData && 
        (job.billing.userData.name || job.billing.userData.companyName)
      );
      console.log('🔍 [BILLING] Found job with billing:', !!jobWithBilling);
    }
    
    const result = jobWithBilling?.billing?.userData || null;
    console.log('🔍 [BILLING] Final billing data:', {
      hasData: !!result,
      isCompany: result?.isCompany,
      companyName: result?.companyName,
      logoUrl: result?.logoUrl
    });
    
    return result;
  };

  const getSalaryData = () => {
    // Get salary data from the selected job
    let jobWithSalary = null;
    
    if (selectedJobId !== 'all') {
      const selectedJob = jobs.find(job => job.id === selectedJobId);
      if (selectedJob?.salary?.enabled) {
        jobWithSalary = selectedJob;
      }
    }
    
    // If no selected job or it doesn't have salary, find first job with salary data
    if (!jobWithSalary) {
      jobWithSalary = jobs.find(job => 
        job.salary?.enabled && 
        job.salary?.amount > 0
      );
    }
    
    return jobWithSalary?.salary || null;
  };

  const calculateSalaryTotal = () => {
    const salaryData = getSalaryData();
    if (!salaryData || !periodStats) return null;

    const totalHours = periodStats.totalHours;

    switch (salaryPeriod) {
      case 'hour':
        // If salary type is hourly, use amount directly
        if (salaryData.type === 'hourly') {
          return {
            amount: totalHours * salaryData.amount,
            currency: salaryData.currency || 'EUR',
            period: t('reports.per_worked_hours') || 'por horas trabajadas',
            rate: salaryData.amount > 0 ? `${salaryData.amount} ${salaryData.currency || 'EUR'}/h` : 'No configurado',
            hours: totalHours
          };
        }
        // If not hourly, use hourly rate from job
        const job = jobs.find(j => j.salary === salaryData);
        const hourlyRate = job?.hourlyRate || 0;
        return {
          amount: totalHours * hourlyRate,
          currency: salaryData.currency || 'EUR',
          period: t('reports.per_worked_hours') || 'por horas trabajadas',
          rate: hourlyRate > 0 ? `${hourlyRate} ${salaryData.currency || 'EUR'}/h` : 'No configurado',
          hours: totalHours
        };

      case 'week':
        // Calculate weekly rate
        let weeklyRate = 0;
        if (salaryData.type === 'hourly') {
          // Assume 40 hours per week for hourly workers
          weeklyRate = salaryData.amount * 40;
        } else if (salaryData.type === 'monthly') {
          // Convert monthly to weekly (4.33 weeks per month)
          weeklyRate = salaryData.amount / 4.33;
        } else if (salaryData.type === 'annual') {
          // Convert annual to weekly (52 weeks per year)
          weeklyRate = salaryData.amount / 52;
        }
        
        const weeksWorked = totalHours / 40; // Assuming 40 hours per week
        return {
          amount: weeksWorked * weeklyRate,
          currency: salaryData.currency || 'EUR',
          period: t('reports.per_worked_weeks') || 'por semanas trabajadas',
          rate: weeklyRate > 0 ? `${weeklyRate.toFixed(2)} ${salaryData.currency || 'EUR'}/semana` : 'No configurado',
          weeks: weeksWorked
        };

      case 'month':
        // Calculate monthly rate
        let monthlyRate = 0;
        if (salaryData.type === 'monthly') {
          monthlyRate = salaryData.amount;
        } else if (salaryData.type === 'hourly') {
          // Assume 173.33 hours per month (40 hours * 4.33 weeks)
          monthlyRate = salaryData.amount * 173.33;
        } else if (salaryData.type === 'annual') {
          monthlyRate = salaryData.amount / 12;
        }
        
        const monthsWorked = totalHours / 173.33; // Assuming 173.33 hours per month
        return {
          amount: monthsWorked * monthlyRate,
          currency: salaryData.currency || 'EUR',
          period: t('reports.proportional_month') || 'proporcional al mes',
          rate: monthlyRate > 0 ? `${monthlyRate.toFixed(2)} ${salaryData.currency || 'EUR'}/mes` : 'No configurado',
          months: monthsWorked
        };

      default:
        return null;
    }
  };

  const openSalaryConfiguration = () => {
    setShowBillingModal(false);
    
    // Use selected job or first job for salary configuration
    let jobToEdit = null;
    if (selectedJobId !== 'all') {
      jobToEdit = jobs.find(job => job.id === selectedJobId);
    } else {
      jobToEdit = jobs[0]; // Use first job if all jobs selected
    }
    
    if (jobToEdit) {
      setEditingJobForBilling(jobToEdit);
      setShowJobFormModal(true);
    }
  };

  const openBillingConfiguration = () => {
    setShowBillingModal(false);
    
    // Use selected job or first job for billing configuration
    let jobToEdit = null;
    if (selectedJobId !== 'all') {
      jobToEdit = jobs.find(job => job.id === selectedJobId);
    } else {
      jobToEdit = jobs[0]; // Use first job if all jobs selected
    }
    
    if (jobToEdit) {
      setEditingJobForBilling(jobToEdit);
      setShowJobFormModal(true);
    }
  };


  const generateInvoiceNumber = () => {
    const billingData = getBillingData();
    const prefix = billingData?.isCompany ? 
      (billingData?.companyName?.substring(0, 3).toUpperCase() || 'EMP') : 
      'USR';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    
    return `${prefix}-${year}${month}${day}-${random}`;
  };

  const convertImageToBase64 = async (uri: string): Promise<string | null> => {
    try {
      console.log('🔄 [BASE64] Converting image to base64:', uri);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('✅ [BASE64] Image converted successfully');
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('❌ [BASE64] Error converting image:', error);
      return null;
    }
  };

  const generateHTMLReport = async (includeBilling: boolean = false) => {
    if (!periodStats) return '';

    const selectedJob = selectedJobId === 'all' ? null : jobs.find(job => job.id === selectedJobId);
    const jobName = selectedJob ? selectedJob.name : t('reports.all_jobs');
    const periodLabel = getPeriodLabel();
    
    // Get recent activity for PDF
    const recentDays = getAllRecentWorkDays().slice(0, 10); // Max 10 recent days
    
    // Get billing data if needed
    const billingData = includeBilling ? getBillingData() : null;
    
    // Debug logs for logo
    if (billingData) {
      console.log('🖼️ [PDF] Billing data found:', {
        isCompany: billingData.isCompany,
        companyName: billingData.companyName,
        hasLogoUrl: !!billingData.logoUrl,
        logoUrl: billingData.logoUrl
      });
    } else {
      console.log('❌ [PDF] No billing data found');
    }
    
    // Convert logo to base64 if available
    let logoBase64 = null;
    if (billingData?.isCompany && billingData?.logoUrl) {
      console.log('🔄 [PDF] Converting logo to base64...');
      logoBase64 = await convertImageToBase64(billingData.logoUrl);
      console.log('🖼️ [PDF] Logo base64 result:', logoBase64 ? 'Success' : 'Failed');
    }
    
    // Get salary calculation if needed
    const salaryTotal = includeSalaryCalculation ? calculateSalaryTotal() : null;
    
    // Generate invoice details if needed
    const invoiceNumber = includeInvoiceDetails ? generateInvoiceNumber() : null;
    const invoiceDate = includeInvoiceDetails ? new Date().toLocaleDateString(language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : language === 'it' ? 'it-IT' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : null;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${t('reports.pdf_title')} - ${jobName}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 40px;
          color: #1C1C1E;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #007AFF;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
          color: #007AFF;
          margin-bottom: 10px;
        }
        .subtitle {
          font-size: 18px;
          color: #8E8E93;
        }
        .period {
          font-size: 16px;
          color: #1C1C1E;
          margin-top: 10px;
        }
        .stats-grid {
          display: flex;
          justify-content: space-around;
          margin: 30px 0;
          background-color: #F2F2F7;
          padding: 20px;
          border-radius: 16px;
        }
        .stat-item {
          text-align: center;
          padding: 10px;
        }
        .stat-number {
          font-size: 32px;
          font-weight: bold;
          color: #007AFF;
          margin-bottom: 5px;
        }
        .stat-label {
          font-size: 14px;
          color: #8E8E93;
          text-transform: uppercase;
          font-weight: 600;
        }
        .section {
          margin: 30px 0;
        }
        .section-title {
          font-size: 20px;
          font-weight: bold;
          color: #1C1C1E;
          margin-bottom: 15px;
          border-left: 4px solid #007AFF;
          padding-left: 15px;
        }
        .job-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border-bottom: 1px solid #E5E5EA;
        }
        .job-name {
          font-weight: 600;
          color: #1C1C1E;
        }
        .job-stats {
          font-size: 14px;
          color: #8E8E93;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          color: #8E8E93;
          font-size: 12px;
          border-top: 1px solid #E5E5EA;
          padding-top: 20px;
        }
        .overtime {
          background-color: #FFF3CD;
          color: #856404;
          padding: 10px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
          font-weight: 600;
        }
        .activity-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 15px;
          border-bottom: 1px solid #E5E5EA;
          background-color: #F9F9F9;
          margin-bottom: 4px;
          border-radius: 6px;
        }
        .activity-date {
          font-weight: 600;
          color: #1C1C1E;
          margin-bottom: 2px;
        }
        .activity-job {
          font-size: 12px;
          color: #8E8E93;
        }
        .activity-hours {
          font-weight: 600;
          color: #007AFF;
        }
        .activity-overtime {
          background-color: #FF9500;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          margin-left: 4px;
        }
        .activity-schedule {
          font-size: 11px;
          color: #666;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${t('reports.pdf_title')}</div>
        <div class="subtitle">${jobName}</div>
        <div class="period">${periodLabel}</div>
      </div>

      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-number">${formatHoursDisplay(periodStats.totalHours)}</div>
          <div class="stat-label">${t('reports.total_hours')}</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${periodStats.totalDays}</div>
          <div class="stat-label">${t('reports.worked_days')}</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${formatHoursDisplay(periodStats.avgHoursPerDay)}</div>
          <div class="stat-label">${t('reports.average_per_day')}</div>
        </div>
      </div>


      ${periodStats.jobBreakdown.length > 1 ? `
        <div class="section">
          <div class="section-title">${t('reports.job_distribution')}</div>
          ${periodStats.jobBreakdown.map(stat => `
            <div class="job-item">
              <div>
                <div class="job-name">${stat.job.name}</div>
                <div class="job-stats">${formatHoursDisplay(stat.hours)} • ${stat.days} ${t('reports.days')} • ${stat.percentage.toFixed(1)}%</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${recentDays.length > 0 ? `
        <div class="section">
          <div class="section-title">${t('reports.recent_activity')}</div>
          ${recentDays.map(day => {
            const job = jobs.find(j => j.id === day.jobId);
            const formattedDate = new Date(day.date).toLocaleDateString(language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US', {
              weekday: 'short',
              month: 'short', 
              day: 'numeric'
            });
            // Format times for PDF
            const actualStart = day.actualStartTime ? formatTimeCompact(day.actualStartTime.substring(0, 5)) : '';
            const actualEnd = day.actualEndTime ? formatTimeCompact(day.actualEndTime.substring(0, 5)) : '';
            const scheduledStart = day.startTime ? formatTimeCompact(day.startTime) : '';
            const scheduledEnd = day.endTime ? formatTimeCompact(day.endTime) : '';
            const secondStart = day.secondStartTime ? formatTimeCompact(day.secondStartTime) : '';
            const secondEnd = day.secondEndTime ? formatTimeCompact(day.secondEndTime) : '';
            
            return `
              <div class="activity-item">
                <div>
                  <div class="activity-date">${formattedDate}</div>
                  <div class="activity-job">${job?.name || t('reports.work')}</div>
                </div>
                <div>
                  <span class="activity-hours">${formatHoursDisplay(getNetHours(day))}</span>
                  ${(actualStart && actualEnd) ? 
                    `<br><span class="activity-schedule">${actualStart}-${actualEnd}</span>` : 
                    (scheduledStart && scheduledEnd) ? 
                    `<br><span class="activity-schedule">${scheduledStart}-${scheduledEnd}${secondStart && secondEnd ? `, ${secondStart}-${secondEnd}` : ''}</span>` : ''}
                  ${day.overtime ? '<span class="activity-overtime">OT</span>' : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      ${billingData ? `
        <div style="page-break-before: always; margin-top: 40px;">
          <div style="border: 2px solid #007AFF; border-radius: 12px; padding: 30px; background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);">
            <div style="text-align: center; margin-bottom: 25px;">
              <h2 style="color: #007AFF; font-size: 24px; margin: 0; font-weight: 700;">💼 ${t('reports.invoice_title') || 'FACTURA / INVOICE'}</h2>
              ${invoiceNumber ? `<div style="color: #666; font-size: 16px; margin-top: 8px; font-weight: 600;">📄 ${invoiceNumber}</div>` : ''}
              ${invoiceDate ? `<div style="color: #666; font-size: 14px; margin-top: 4px;">📅 ${invoiceDate}</div>` : ''}
              <div style="height: 3px; background: linear-gradient(90deg, #007AFF, #00D4FF); margin: 10px auto; width: 150px; border-radius: 2px;"></div>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
              <div style="flex: 1;">
                <div style="display: flex; align-items: flex-start; gap: 20px; margin-bottom: 20px;">
                  <div style="flex: 1;">
                    <h3 style="color: #333; font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid #007AFF; padding-bottom: 5px;">${t('reports.provider_data') || 'DATOS DEL PROVEEDOR / PROVIDER'}</h3>
                    ${billingData.isCompany ? `
                      <div style="margin-bottom: 10px; font-size: 18px; font-weight: 700; color: #007AFF;">${billingData.companyName || 'Empresa'}</div>
                      <div style="margin-bottom: 8px; color: #666; font-weight: 600;">${billingData.taxId ? 'CIF/VAT: ' + billingData.taxId : 'CIF/VAT: N/A'}</div>
                    ` : `
                      <div style="margin-bottom: 10px; font-size: 18px; font-weight: 700; color: #007AFF;">${billingData.name || 'Usuario'}</div>
                    `}
                    ${billingData.address ? `<div style="margin-bottom: 8px; color: #555;">${billingData.address}</div>` : ''}
                    ${billingData.phone ? `<div style="margin-bottom: 8px; color: #555;">Tel: ${billingData.phone}</div>` : ''}
                    ${billingData.email ? `<div style="margin-bottom: 8px; color: #555;">Email: ${billingData.email}</div>` : ''}
                    ${billingData.website ? `<div style="margin-bottom: 8px; color: #007AFF;">Web: ${billingData.website}</div>` : ''}
                  </div>
                  ${(() => {
                    console.log('🔍 [PDF] Logo check:', {
                      isCompany: billingData.isCompany,
                      hasOriginalLogoUrl: !!billingData.logoUrl,
                      hasBase64Logo: !!logoBase64,
                      willShowLogo: billingData.isCompany && logoBase64
                    });
                    
                    if (billingData.isCompany && logoBase64) {
                      console.log('✅ [PDF] Adding base64 logo to HTML');
                      return `
                        <div style="min-width: 120px; max-width: 120px;">
                          <img src="${logoBase64}" alt="Logo de empresa" style="max-width: 100%; height: auto; max-height: 80px; border-radius: 8px; border: 2px solid #E5E5EA; object-fit: contain; background: white; padding: 8px;" />
                        </div>
                      `;
                    } else {
                      console.log('❌ [PDF] No logo will be shown (missing base64 or not company)');
                      return '';
                    }
                  })()}
                </div>
              </div>
              
              <div style="flex: 1; margin-left: 30px;">
                <h3 style="color: #333; font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid #28a745; padding-bottom: 5px;">💰 ${t('reports.summary') || 'RESUMEN / SUMMARY'}</h3>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
                  <div style="margin-bottom: 8px;"><strong>📊 ${t('reports.total_hours')}: ${formatHoursDisplay(periodStats.totalHours)}</strong></div>
                  <div style="margin-bottom: 8px;"><strong>📅 ${t('reports.worked_days')}: ${periodStats.totalDays}</strong></div>
                  <div style="margin-bottom: 8px;"><strong>⏱️ ${t('reports.average_per_day')}: ${formatHoursDisplay(periodStats.avgHoursPerDay)}</strong></div>
                  ${periodStats.overtimeHours > 0 ? `<div style="color: #ff6b35;"><strong>⏰ Overtime: ${formatHoursDisplay(periodStats.overtimeHours)}</strong></div>` : ''}
                </div>
              </div>
            </div>

            ${billingData.bankAccount || billingData.bankName || billingData.swiftCode ? `
              <div style="margin-top: 25px; padding: 20px; background: #e3f2fd; border-radius: 8px; border: 1px solid #2196f3;">
                <h3 style="color: #1976d2; font-size: 16px; margin-bottom: 15px;">${t('reports.banking_details') || 'DATOS BANCARIOS / BANKING DETAILS'}</h3>
                ${billingData.bankAccount ? `<div style="margin-bottom: 8px; font-weight: 600;"><strong>${t('reports.account') || 'Cuenta/Account'}:</strong> ${billingData.bankAccount}</div>` : ''}
                ${billingData.bankName ? `<div style="margin-bottom: 8px;"><strong>${t('reports.bank') || 'Banco/Bank'}:</strong> ${billingData.bankName}</div>` : ''}
                ${billingData.swiftCode ? `<div style="margin-bottom: 8px;"><strong>SWIFT/BIC:</strong> ${billingData.swiftCode}</div>` : ''}
              </div>
            ` : ''}

            <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px;">
              <div style="text-align: center; color: #856404;">
                <strong>${t('reports.billing_period') || 'Período facturado / Billing Period'}: ${periodLabel}</strong><br>
                <small>${t('reports.generated_on') || 'Generado el / Generated on'}: ${new Date().toLocaleDateString()}</small>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      ${salaryTotal ? `
        <div style="page-break-before: avoid; margin-top: 40px;">
          <div style="border: 2px solid #28a745; border-radius: 12px; padding: 30px; background: linear-gradient(135deg, #f8fff8 0%, #ffffff 100%);">
            <div style="text-align: center; margin-bottom: 25px;">
              <h2 style="color: #28a745; font-size: 24px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(40, 167, 69, 0.2);">
                💰 ${t('reports.salary_calculation') || 'CÁLCULO SALARIAL / SALARY CALCULATION'}
              </h2>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div style="flex: 1;">
                <h3 style="color: #333; font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid #28a745; padding-bottom: 5px;">📊 ${t('reports.calculation_details') || 'DETALLES DE CÁLCULO / CALCULATION DETAILS'}</h3>
                <div style="margin-bottom: 10px; font-size: 16px; color: #555;">
                  <strong>⏱️ ${t('reports.rate') || 'Tarifa'}:</strong> ${salaryTotal.rate}
                </div>
                <div style="margin-bottom: 10px; font-size: 16px; color: #555;">
                  <strong>📅 ${t('reports.period') || 'Período'}:</strong> ${salaryTotal.period}
                </div>
                ${salaryTotal.hours ? `<div style="margin-bottom: 10px; font-size: 16px; color: #555;"><strong>🕐 ${t('reports.worked_hours') || 'Horas trabajadas'}:</strong> ${salaryTotal.hours.toFixed(2)}h</div>` : ''}
                ${salaryTotal.weeks ? `<div style="margin-bottom: 10px; font-size: 16px; color: #555;"><strong>📊 ${t('reports.worked_weeks') || 'Semanas trabajadas'}:</strong> ${salaryTotal.weeks.toFixed(2)}</div>` : ''}
                ${salaryTotal.months ? `<div style="margin-bottom: 10px; font-size: 16px; color: #555;"><strong>📊 ${t('reports.worked_months') || 'Meses trabajados'}:</strong> ${salaryTotal.months.toFixed(2)}</div>` : ''}
              </div>
              
              <div style="flex: 1; margin-left: 30px; text-align: right;">
                <div style="background: #28a745; color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
                  <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; opacity: 0.9;">${t('reports.total_to_pay') || 'TOTAL A PAGAR / TOTAL TO PAY'}</div>
                  <div style="font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                    ${salaryTotal.amount.toFixed(2)} ${salaryTotal.currency}
                  </div>
                </div>
              </div>
            </div>
            
            <div style="margin-top: 25px; padding: 20px; background: #e8f5e8; border-radius: 8px; border: 1px solid #28a745;">
              <div style="text-align: center; color: #155724; font-size: 14px;">
                <strong>💡 ${t('reports.note') || 'Nota'}:</strong> ${t('reports.salary_note') || 'Este cálculo se basa en las horas registradas y la configuración salarial del trabajo.'}
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="footer">
        ${t('reports.analysis_date')}: ${new Date().toLocaleDateString(language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </body>
    </html>
    `;
  };

  const renderCompactJobSelector = () => {
    // Don't show selector if there are no jobs or only one job
    if (jobs.length <= 1) {
      // Auto-select the single job if exists
      if (jobs.length === 1 && selectedJobId === 'all') {
        setSelectedJobId(jobs[0].id);
      }
      return null;
    }
    
    // Only show "All" option when there are multiple jobs
    const allOptions = [{ id: 'all', name: t('reports.all_jobs'), color: colors.primary }].concat(jobs);
    
    if (allOptions.length <= 4) {
      // Para hasta 4 opciones (incluyendo "Todos"), mostrar como pestañas
      return (
        <Animated.View style={[styles.compactJobSelector, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.compactJobSelectorTitle}>{t('reports.filter_by_job')}</Text>
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
            <Text style={styles.compactJobSelectorTitle}>{t('reports.filter_by_job')}</Text>
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

  const renderCompactPeriodSelector = () => {
    const periods = [
      { key: 'week', label: t('reports.week') },
      { key: 'month', label: t('reports.month') },
      { key: 'year', label: t('reports.year') },
      { key: 'custom', label: t('reports.custom_range') }
    ] as const;

    return (
      <View style={styles.compactPeriodSelector}>

        <View style={styles.compactPeriodTabs}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.compactPeriodTab,
                selectedPeriod === period.key && styles.compactPeriodTabActive
              ]}
              onPress={() => {
                triggerHaptic('light');
                setSelectedPeriod(period.key);
              }}
            >
              <Text 
                style={[
                  styles.compactPeriodTabText,
                  selectedPeriod === period.key && styles.compactPeriodTabTextActive
                ]}
                numberOfLines={1}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Handle navigation parameters - auto-open last session modal if requested
  useEffect(() => {
    if (navigationParams?.openLastSession && workDays.length > 0) {
      console.log('📊 Auto-opening last session modal');
      
      // Get the most recent work session
      const recentWorkDays = getRecentWorkDays();
      if (recentWorkDays.length > 0) {
        const lastSession = recentWorkDays[0];
        console.log('📊 Opening modal for last session:', lastSession);
        
        // Open the modal with the last session
        setSelectedWorkDay(lastSession);
        setEditWorkDayModal(true);
      }
      
      // Clear the navigation parameter after using it
      clearNavigationParams();
    }
  }, [navigationParams, workDays, getRecentWorkDays, clearNavigationParams, setSelectedWorkDay, setEditWorkDayModal]);

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Job selector */}
        {!isLoadingJobs && renderCompactJobSelector()}

        {/* Period selector */}
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {!isLoadingJobs && renderCompactPeriodSelector()}
          
          {/* Custom Date Range Picker - SOLO cuando Custom range está seleccionado */}
          {selectedPeriod === 'custom' && (
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.dateRangeSelector}>
              <View style={styles.dateRangeContainer}>
                <View style={styles.dateRangeRow}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => openDatePicker('from')}
                  >
                    <Text style={styles.dateButtonLabel}>{t('reports.from_date')}</Text>
                    <Text style={styles.dateButtonValue}>
                      {tempFromDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                  
                  <View style={styles.dateSeparator}>
                    <IconSymbol size={16} name="arrow.right" color={colors.textSecondary} />
                  </View>
                  
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => openDatePicker('to')}
                  >
                    <Text style={styles.dateButtonLabel}>{t('reports.to_date')}</Text>
                    <Text style={styles.dateButtonValue}>
                      {tempToDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={styles.applyRangeButton}
                  onPress={applyDateRange}
                >
                  <Text style={styles.applyRangeButtonText}>{t('reports.apply_range')}</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          )}
        </Animated.View>

        {/* Main stats */}
        {periodStats && (
          <Animated.View style={[{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <BlurView intensity={98} tint={isDark ? "dark" : "light"} style={styles.modernStatsCard}>
              <LinearGradient
                colors={isDark ? ['rgba(0, 122, 255, 0.15)', 'rgba(0, 122, 255, 0.05)'] : ['rgba(255, 162, 0, 0.1)', 'rgba(255, 162, 0, 0.1)']}
                style={styles.modernStatsCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
      
              <View style={styles.statsGrid}>
                <View style={styles.modernStatItem}>
                  <View style={styles.statIconContainer}>
                    <AnimatedIcon size={32} name="clock.fill" color={colors.success} />
                  </View>
                  <Text style={styles.modernStatNumber}>
                    {formatHoursForDisplay(periodStats.totalHours)}
                  </Text>
                  <Text style={styles.modernStatLabel}>{t('reports.total_hours')}</Text>
                </View>
                <View style={styles.modernStatItem}>
                  <View style={styles.statIconContainer}>
                    <AnimatedIcon size={32} name="calendar" color={colors.primary} />
                  </View>
                  <AnimatedNumber 
                    value={periodStats.totalDays} 
                    style={styles.modernStatNumber}
                    duration={1000}
                  />
                  <Text style={styles.modernStatLabel}>{t('reports.worked_days')}</Text>
                </View>
                <View style={styles.modernStatItem}>
                  <View style={styles.statIconContainer}>
                    <AnimatedIcon size={32} name="chart.bar.fill" color={colors.warning} />
                  </View>
                  <Text style={styles.modernStatNumber}>
                    {formatHoursForDisplay(periodStats.avgHoursPerDay)}
                  </Text>
                  <Text style={styles.modernStatLabel}>{t('reports.average_per_day')}</Text>
                </View>
              </View>
              {periodStats && periodStats.overtimeHours > 0 && (
                <Animated.View style={[styles.overtimeInfo, { opacity: fadeAnim }]}>
                  <TouchableOpacity 
                    style={styles.overtimeButton} 
                    onPress={() => setShowOvertimeStatsModal(true)}
                    activeOpacity={0.7}
                  >
                    <AnimatedIcon size={24} name="clock.fill" color={colors.warning} />
                    <Text style={styles.overtimeText}>
                      {t('reports.overtime_hours', { hours: periodStats.overtimeHours.toFixed(1) })}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </BlurView>
          </Animated.View>
        )}

        {/* Recent activity */}
         <Animated.View style={[styles.compactJobSelectore, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <BlurView intensity={98} tint={isDark ? "dark" : "light"} style={styles.recentCard}>
          <LinearGradient
            colors={isDark ? ['rgba(142, 142, 147, 0.1)', 'rgba(142, 142, 147, 0.03)'] : ['rgba(142, 142, 147, 0.06)', 'rgba(142, 142, 147, 0.02)']}
            style={styles.recentCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.cardHeader}>
            <IconSymbol size={24} name="clock.fill" color={colors.primary} />
            <Text style={styles.cardTitle}>{t('reports.recent_activity')}</Text>
          </View>
          {!isLoadingJobs && getRecentWorkDays().length > 0 ? (
            <>
              {getRecentWorkDays().map((day) => {
                const job = jobs.find(j => j.id === day.jobId);
                return (
                  <TouchableOpacity 
                    key={day.id} 
                    style={styles.modernRecentItem}
                    onPress={() => handleEditWorkDay(day)}
                    activeOpacity={0.8}
                  >
                    <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.recentItemBlur}>
                      <View style={styles.recentItemContent}>
                        <View style={styles.recentLeft}>
                          <View style={[styles.modernJobIndicator, { backgroundColor: job?.color || colors.primary }]}>
                            <IconSymbol size={16} name="building.2" color="white" />
                          </View>
                          <View style={styles.recentInfo}>
                            <Text style={styles.recentDate}>{formatDate(day.date)}</Text>
                            <Text style={styles.recentJob}>{job?.name || 'Trabajo'}</Text>
                            {/* Show actual times if available, otherwise scheduled times */}
                            {(day.actualStartTime && day.actualEndTime) ? (
                              <Text style={[styles.recentSchedule, { color: colors.primary }]}>
                                <IconSymbol size={12} name="clock" color={colors.primary} />
                                {' '}{formatTimeCompact(day.actualStartTime)}-{formatTimeCompact(day.actualEndTime)}
                              </Text>
                            ) : (day.startTime && day.endTime) ? (
                              <Text style={[styles.recentSchedule, { color: colors.textSecondary }]}>
                                <IconSymbol size={12} name="clock" color={colors.textSecondary} />
                                {' '}{formatTimeCompact(day.startTime)}-{formatTimeCompact(day.endTime)}
                                {day.secondStartTime && day.secondEndTime && (
                                  `, ${formatTimeCompact(day.secondStartTime)}-${formatTimeCompact(day.secondEndTime)}`
                                )}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        <View style={styles.recentRight}>
                          <View style={styles.hoursContainer}>
                            <Text style={styles.recentHours}>
                              {formatHoursForDisplay(getNetHours(day))}
                            </Text>
                            {day.overtime && (
                              <View style={styles.overtimeChip}>
                                <Text style={styles.overtimeChipText}>OT</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.actionButtons}>
                            {day.notes && (
                              <TouchableOpacity 
                                style={styles.noteButton}
                                onPress={() => handleEditWorkDay(day)}
                              >
                                <IconSymbol size={16} name="paperclip" color={colors.warning} />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                              style={styles.editButton}
                              onPress={() => handleEditWorkDay(day)}
                            >
                              <IconSymbol size={16} name="pencil" color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.deleteButton}
                              onPress={() => handleDeleteWorkDay(day)}
                            >
                              <IconSymbol size={16} name="trash" color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                );
              })}
              {(() => {
                const allRecentDays = getAllRecentWorkDays();
                const totalDays = allRecentDays.length;
                const currentlyShowing = getRecentWorkDays().length;
                const shouldShow = totalDays > currentlyShowing;
                console.log('🔍 LoadMore button check:', { 
                  totalDays, 
                  currentlyShowing, 
                  visibleRecentDays, 
                  shouldShow,
                  selectedJobId 
                });
                return shouldShow;
              })() && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={handleLoadMore}
                >
                  <Text style={styles.loadMoreText}>
                    {t('reports.load_more', { remaining: getAllRecentWorkDays().length - getRecentWorkDays().length })}
                  </Text>
                  <IconSymbol size={16} name="chevron.down" color={colors.primary} />
                </TouchableOpacity>
              )}
            </>
          ) : !isLoadingJobs ? (
            <View style={styles.emptyState}>
              <IconSymbol size={48} name="calendar.badge.clock" color={colors.textSecondary} />
              <Text style={styles.emptyText}>{t('reports.no_records')}</Text>
              <Text style={styles.emptySubtext}>Comienza a registrar tu tiempo de trabajo</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => onNavigate('calendar')}
              >
                <IconSymbol size={16} name="plus" color="white" />
                <Text style={styles.addButtonText}>{t('reports.add_time')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </BlurView>
</Animated.View>
        {/* Action Buttons - Only show when there is data to export */}
        {!isLoadingJobs && periodStats && periodStats.totalDays > 0 && (
        <View style={styles.actionButtonsContainer}>


          <TouchableOpacity
            style={styles.actionButton}
            onPress={showBillingDataModal}
          >
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={[styles.actionButtonInner, styles.calendarButton]}>
              <LinearGradient
                colors={['rgba(0, 123, 255, 0.14)', 'rgba(0, 123, 255, 0.21)']}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={[styles.actionButtonIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <IconSymbol size={24} name="square.and.arrow.up" color={colors.primary} />
              </View>
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>{t('reports.export_pdf')}</Text>
              <IconSymbol size={16} name="arrow.right" color={colors.primary} />
            </BlurView>
          </TouchableOpacity>

 
        </View>
        )}
      </ScrollView>
      
      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.modalButtonText}>{t('reports.cancel')}</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {datePickerMode === 'from' ? t('reports.from_date') : t('reports.to_date')}
                </Text>
                <View style={styles.modalButton} />
              </View>
              
              <View style={styles.pickerContainer}>
                <Calendar
                  style={styles.calendar}
                  onDayPress={(day: any) => {
                    const selectedDate = new Date(day.timestamp);
                    if (datePickerMode === 'from') {
                      setTempFromDate(selectedDate);
                      setFromDate(selectedDate);
                    } else {
                      setTempToDate(selectedDate);
                      setToDate(selectedDate);
                    }
                    setSelectedPeriod('custom');
                    setShowDatePicker(false);
                  }}
                  markedDates={{
                    [(datePickerMode === 'from' ? tempFromDate : tempToDate).toISOString().split('T')[0]]: {
                      selected: true,
                      selectedColor: colors.primary,
                    }
                  }}
                  theme={{
                    backgroundColor: colors.surface,
                    calendarBackground: colors.surface,
                    textSectionTitleColor: colors.textSecondary,
                    selectedDayBackgroundColor: colors.primary,
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: colors.primary,
                    dayTextColor: colors.text,
                    textDisabledColor: colors.textSecondary,
                    dotColor: colors.primary,
                    selectedDotColor: '#ffffff',
                    arrowColor: colors.primary,
                    monthTextColor: colors.text,
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Billing Data Modal */}
      {showBillingModal && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showBillingModal}
          onRequestClose={() => setShowBillingModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.billingModal}>
              <View style={styles.modalHeader}>
                <View style={{width: 40}} />
                <Text style={styles.modalTitle}>
                  {t('reports.export_options') || 'Opciones de Exportación'}
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowBillingModal(false)}
                >
                  <IconSymbol size={20} name="xmark" color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.billingModalContent}>
                {getBillingData() ? (
                  <>
                    <View style={styles.billingDataSection}>
                      <Text style={styles.billingDataTitle}>
                        📄 {t('job_form.billing.user_data.title')}
                      </Text>
                      <View style={styles.billingDataCard}>
                        {getBillingData()?.isCompany ? (
                          <>
                            <Text style={styles.billingDataItem}>
                              🏢 <Text style={styles.billingDataValue}>{getBillingData()?.companyName}</Text>
                            </Text>
                            <Text style={styles.billingDataItem}>
                              🏷️ <Text style={styles.billingDataValue}>{getBillingData()?.taxId}</Text>
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.billingDataItem}>
                            👤 <Text style={styles.billingDataValue}>{getBillingData()?.name}</Text>
                          </Text>
                        )}
                        {getBillingData()?.address && (
                          <Text style={styles.billingDataItem}>
                            📍 <Text style={styles.billingDataValue}>{getBillingData()?.address}</Text>
                          </Text>
                        )}
                        {getBillingData()?.phone && (
                          <Text style={styles.billingDataItem}>
                            📞 <Text style={styles.billingDataValue}>{getBillingData()?.phone}</Text>
                          </Text>
                        )}
                        {getBillingData()?.email && (
                          <Text style={styles.billingDataItem}>
                            ✉️ <Text style={styles.billingDataValue}>{getBillingData()?.email}</Text>
                          </Text>
                        )}
                        {getBillingData()?.website && (
                          <Text style={styles.billingDataItem}>
                            🌐 <Text style={styles.billingDataValue}>{getBillingData()?.website}</Text>
                          </Text>
                        )}
                        
                        {/* Banking Section */}
                        {(getBillingData()?.bankAccount || getBillingData()?.bankName || getBillingData()?.swiftCode) && (
                          <>
                            <View style={{height: 1, backgroundColor: colors.separator, marginVertical: 12}} />
                    
                            {getBillingData()?.bankAccount && (
                              <Text style={styles.billingDataItem}>
                                💳 <Text style={styles.billingDataValue}>{getBillingData()?.bankAccount}</Text>
                              </Text>
                            )}
                            {getBillingData()?.bankName && (
                              <Text style={styles.billingDataItem}>
                                🏦 <Text style={styles.billingDataValue}>{getBillingData()?.bankName}</Text>
                              </Text>
                            )}
                            {getBillingData()?.swiftCode && (
                              <Text style={styles.billingDataItem}>
                                🔗 <Text style={styles.billingDataValue}>SWIFT: {getBillingData()?.swiftCode}</Text>
                              </Text>
                            )}
                          </>
                        )}
                      </View>
                    </View>

                    <View style={styles.switchSection}>
                      <View style={styles.switchRow}>
                        <View style={styles.switchContent}>
                          <Text style={styles.switchLabel}>
                            {t('reports.include_billing_data') || 'Añadir datos al PDF'}
                          </Text>
                          <Text style={styles.switchDescription}>
                            {t('reports.include_billing_desc') || 'Incluir información de facturación en el reporte PDF'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.switch, includeBillingData && styles.switchActive]}
                          onPress={() => setIncludeBillingData(!includeBillingData)}
                        >
                          <View style={[styles.switchThumb, includeBillingData && styles.switchThumbActive]} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.switchSection}>
                      <View style={styles.switchRow}>
                        <View style={styles.switchContent}>
                          <Text style={styles.switchLabel}>
                            {t('reports.include_invoice_details') || 'Añadir fecha y número de factura'}
                          </Text>
                          <Text style={styles.switchDescription}>
                            {t('reports.include_invoice_details_desc') || 'Generar automáticamente número de factura y fecha actual'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.switch, includeInvoiceDetails && styles.switchActive]}
                          onPress={() => setIncludeInvoiceDetails(!includeInvoiceDetails)}
                        >
                          <View style={[styles.switchThumb, includeInvoiceDetails && styles.switchThumbActive]} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.noBillingDataSection}>
                    <IconSymbol size={48} name="doc.text" color={colors.textSecondary} />
                    <Text style={styles.noBillingDataTitle}>
                      {t('reports.no_billing_data') || 'Sin datos de facturación'}
                    </Text>
                    <Text style={styles.noBillingDataMessage}>
                      {t('reports.no_billing_data_desc') || 'Configura los datos de facturación para incluirlos en tus reportes PDF'}
                    </Text>
                    
                    <TouchableOpacity
                      style={styles.configureBillingButton}
                      onPress={openBillingConfiguration}
                    >
                      <IconSymbol size={20} name="gear" color="#FFFFFF" />
                      <Text style={styles.configureBillingButtonText}>
                        {t('reports.configure_billing') || 'Añadir datos de facturación al PDF'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Salary Calculation Section */}
                <View style={styles.salarySection}>
                  <Text style={styles.salarySectionTitle}>
                   
                  </Text>
                  
                  {getSalaryData() ? (
                    <>
                      <View style={styles.switchSection}>
                        <View style={styles.switchRow}>
                          <View style={styles.switchContent}>
                            <Text style={styles.switchLabel}>
                              {t('reports.include_salary_calculation')}
                            </Text>
                            <Text style={styles.switchDescription}>
                              {t('reports.include_salary_calculation_desc')}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.switch, includeSalaryCalculation && styles.switchActive]}
                            onPress={() => setIncludeSalaryCalculation(!includeSalaryCalculation)}
                          >
                            <View style={[styles.switchThumb, includeSalaryCalculation && styles.switchThumbActive]} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {includeSalaryCalculation && (
                        <>
                          <View style={styles.periodSelectorSection}>
                            <Text style={styles.periodSelectorLabel}>{t('reports.billing_period')}</Text>
                            <View style={styles.salaryPeriodSelector}>
                              {[
                                { key: 'hour', label: t('reports.billing_per_hour') },
                                { key: 'week', label: t('reports.billing_per_week') },
                                { key: 'month', label: t('reports.billing_per_month') },
                              ].map((option) => (
                                <TouchableOpacity
                                  key={option.key}
                                  style={[
                                    styles.periodOption,
                                    salaryPeriod === option.key && styles.periodOptionActive,
                                  ]}
                                  onPress={() => setSalaryPeriod(option.key as 'hour' | 'week' | 'month')}
                                >
                                  <Text
                                    style={[
                                      styles.periodOptionText,
                                      salaryPeriod === option.key && styles.periodOptionTextActive,
                                    ]}
                                  >
                                    {option.label}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          {calculateSalaryTotal() && (
                            <View style={styles.salaryCalculationPreview}>
                              <Text style={styles.salaryPreviewTitle}>{t('reports.calculation_preview')}</Text>
                              <View style={styles.salaryPreviewCard}>
                                <Text style={styles.salaryPreviewItem}>
                                  📊 {t('reports.preview_rate')} <Text style={styles.salaryPreviewValue}>{calculateSalaryTotal()?.rate}</Text>
                                </Text>
                                <Text style={styles.salaryPreviewItem}>
                                  ⏱️ {t('reports.preview_period')} <Text style={styles.salaryPreviewValue}>{calculateSalaryTotal()?.period}</Text>
                                </Text>
                                <Text style={styles.salaryPreviewTotal}>
                                  💰 {t('reports.preview_total')} <Text style={styles.salaryPreviewTotalValue}>
                                    {(() => {
                                      const total = calculateSalaryTotal();
                                      return total?.amount && total.amount > 0 
                                        ? `${total.amount.toFixed(2)} ${total.currency}`
                                        : t('reports.configure_amounts_message');
                                    })()}
                                  </Text>
                                </Text>
                              </View>
                            </View>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <View style={styles.noSalaryDataSection}>
                      <IconSymbol size={48} name="dollarsign.circle" color={colors.textSecondary} />
                      <Text style={styles.noSalaryDataTitle}>
                        {t('reports.no_salary_config')}
                      </Text>
                      <Text style={styles.noSalaryDataMessage}>
                        {t('reports.no_salary_config_desc')}
                      </Text>
                      
                      <TouchableOpacity
                        style={styles.configureSalaryButton}
                        onPress={openSalaryConfiguration}
                      >
                        <IconSymbol size={20} name="gear" color="#FFFFFF" />
                        <Text style={styles.configureSalaryButtonText}>
                          {t('reports.activate_salary_config')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.exportButton}
                    onPress={handleExportWithBillingData}
                    disabled={isGeneratingPDF}
                  >
                    {isGeneratingPDF ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <IconSymbol size={20} name="square.and.arrow.up" color="#FFFFFF" />
                    )}
                    <Text style={styles.exportButtonText}>
                      {isGeneratingPDF 
                        ? (t('reports.generating_pdf') || 'Generando...')
                        : (t('reports.export_pdf') || 'Exportar PDF')
                      }
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Job Form Modal for Billing Configuration */}
      {showJobFormModal && editingJobForBilling && (
        <JobFormModal
          visible={showJobFormModal}
          onClose={() => {
            setShowJobFormModal(false);
            setEditingJobForBilling(null);
          }}
          editingJob={editingJobForBilling}
          onSave={() => {
            // Reload jobs to get updated billing data
            const loadJobs = async () => {
              try {
                const loadedJobs = await JobService.getJobs();
                setJobs(loadedJobs);
              } catch (error) {
                console.error('Error reloading jobs:', error);
              }
            };
            loadJobs();
          }}
          initialTab="billing"
          onNavigateToSubscription={() => onNavigate('subscription')}
        />
      )}
      
      {/* Edit Work Day Modal */}
      <EditWorkDayModal
        visible={editWorkDayModal}
        onClose={() => setEditWorkDayModal(false)}
        workDay={selectedWorkDay}
        job={selectedWorkDay ? jobs.find(j => j.id === selectedWorkDay.jobId) || null : null}
        onSave={handleWorkDayUpdate}
      />

      {/* Delete Work Day Modal */}
      <DeleteWorkDayModal
        visible={deleteWorkDayModal}
        onClose={() => {
          setDeleteWorkDayModal(false);
          setDeletingWorkDay(null);
        }}
        onConfirm={confirmDeleteWorkDay}
        workDay={deletingWorkDay}
        jobName={deletingWorkDay ? jobs.find(j => j.id === deletingWorkDay.jobId)?.name || '' : ''}
        formatDate={formatDate}
      />
      
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        feature={t('reports.export_pdf')}
      />
      
      <OvertimeStatsModal
        visible={showOvertimeStatsModal}
        onClose={() => setShowOvertimeStatsModal(false)}
        onEditSalary={() => {
          setShowOvertimeStatsModal(false);
          setShowJobFormModal(true);
        }}
        job={jobs.find(j => j.id === selectedJobId) || jobs[0]}
        monthlyOvertime={periodStats?.overtimeHours || 0}
        onDataChange={loadData}
      />
    </SafeAreaView>
  );
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  jobSelector: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 20,
    backgroundColor: colors.surface,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
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
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  compactJobSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
    marginTop:6,
  },
  compactJobTabs: {
    flexDirection: 'row',
    backgroundColor: colors.separator + '40',
    borderRadius: 12,
    padding: 4,
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
    flex: 1,
  },
  compactJobTabTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  compactJobScrollContainer: {
    maxHeight: 60,
  },
  compactPeriodSelector: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  compactPeriodSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  compactPeriodTabs: {
    flexDirection: 'row',
    backgroundColor: colors.separator + '40',
    borderRadius: 12,
    padding: 4,
  },
  compactPeriodTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  compactPeriodTabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactPeriodTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  compactPeriodTabTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  dateRangeSelector: {
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.surface,
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 4,
  },
  periodSelector: {
    marginVertical: 16,
    borderRadius: 16,
    padding: 20,
    backgroundColor: colors.surface,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  selectorTitle: {
    fontSize: 16, fontWeight: "600",
    marginBottom: 16,
    textAlign: 'center',
    color: colors.text,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  periodButton: {
    minWidth: '22%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonBorder: {
    borderColor: colors.separator,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  periodButtonTextColor: {
    color: colors.text,
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  statsCard: {
    marginVertical: 16,
    borderRadius: 16,
    padding: 20,
    backgroundColor: colors.surface,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  modernStatsCard: {
    marginVertical: 20,
    borderRadius: 28,
    padding: 32,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,

    overflow: 'hidden',
  },
  modernStatsCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  statsTitle: {
    fontSize: 20, fontWeight: "600",
    marginBottom: 16,
    textAlign: 'center',
    color: colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  modernStatItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  statIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
    color: colors.text,
  },
  modernStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    color: colors.text,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  modernStatLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: colors.textSecondary,
    fontWeight: '500',
  },
  overtimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  overtimeText: {
    fontSize: 16,
    marginLeft: 4,
    fontWeight: '600',
    color: colors.warning,
  },
  overtimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: `${colors.warning}15`,
    borderWidth: 1,
    borderColor: `${colors.warning}25`,
  },
  jobBreakdownCard: {
    marginVertical: 20,
    borderRadius: 24,
    padding: 28,
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
  },
  jobBreakdownCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  cardTitle: {
    fontSize: 16, fontWeight: "600",
    marginBottom: 16,
    color: colors.text,
  },
  jobStatRow: {
    marginBottom: 16,
  },
  jobStatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobColorBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 8,
  },
  jobStatDetails: {
    flex: 1,
  },
  jobStatName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    color: colors.text,
  },
  jobStatHours: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  recentCard: {
    marginVertical: 20,
    borderRadius: 24,
    padding: 28,
    shadowColor: colors.textSecondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    // overflow: 'hidden', // Temporarily removed to debug
  },
  recentCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  recentDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'capitalize',
    color: colors.text,
  },
  recentJob: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  recentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recentHours: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  recentSchedule: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 2,
  },
  recentOvertime: {
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    color: colors.warning,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 16,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  modernRecentItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  recentItemBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
  },
  recentItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  modernJobIndicator: {
    width: 26,
    height: 26,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  recentInfo: {
    flex: 1,
  },
  hoursContainer: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  overtimeChip: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  overtimeChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warning,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noteButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255, 159, 10, 0.1)' : 'rgba(255, 159, 10, 0.08)',
  },
  editButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255, 69, 58, 0.15)' : 'rgba(255, 69, 58, 0.1)',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.primary,
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
    gap: 6,

  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  actionButtonsContainer: {
    marginBottom: 70,
    gap: 12,
    marginTop: 16,
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
  exportButton: {

    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 46,
  },
  calendarButton: {
    backgroundColor: 'transparent',
  },
  timerButton: {
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  
  // Date Range Picker Styles
  dateRangeContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateButton: {
    flex: 1,
    padding: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    alignItems: 'center',
  },
  dateButtonLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  dateButtonValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  dateSeparator: {
    paddingHorizontal: 12,
  },
  applyRangeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyRangeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    margin: 20,
    width: '90%',
    maxHeight: '60%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    flex: 1,
  },
  modalButton: {
    minWidth: 60,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
  },
  pickerContainer: {
    padding: 20,
    backgroundColor: colors.surface,
  },
  calendar: {
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  
  // Export Button Styles
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonTextDisabled: {
    color: colors.textSecondary,
  },

  // Billing Modal Styles
  billingModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    margin: 20,
    width: '90%',
    maxHeight: '85%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  billingModalContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  billingDataSection: {
    marginBottom: 24,
  },
  billingDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  billingDataCard: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  billingDataItem: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  billingDataValue: {
    fontWeight: '600',
  },
  switchSection: {
    marginBottom: 24,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchContent: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.separator,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  noBillingDataSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noBillingDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noBillingDataMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  configureBillingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  configureBillingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalActions: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },

  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Salary calculation styles
  salarySection: {
    marginTop: -40,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  salarySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  periodSelectorSection: {
    marginTop: 16,
  },
  periodSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  salaryPeriodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 4,
  },
  periodOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodOptionActive: {
    backgroundColor: colors.primary,
  },
  periodOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  periodOptionTextActive: {
    color: '#FFFFFF',
  },
  salaryCalculationPreview: {
    marginTop: 16,
  },
  salaryPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  salaryPreviewCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  salaryPreviewItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  salaryPreviewValue: {
    fontWeight: '600',
    color: colors.text,
  },
  salaryPreviewTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  salaryPreviewTotalValue: {
    color: colors.primary,
    fontSize: 18,
  },
  noSalaryDataSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noSalaryDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noSalaryDataMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  configureSalaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  configureSalaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  compactJobSelectore: {

  },
});