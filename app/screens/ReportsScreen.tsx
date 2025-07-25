import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Job, WorkDay } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import { useBackNavigation } from '../context/NavigationContext';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { Calendar } from 'react-native-calendars';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year' | 'custom'>('month');
  const [selectedJobId, setSelectedJobId] = useState<string | 'all'>('all');
  const [periodStats, setPeriodStats] = useState<PeriodStats | null>(null);
  const [visibleRecentDays, setVisibleRecentDays] = useState<number>(6);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'from' | 'to'>('from');
  const [fromDate, setFromDate] = useState<Date>(new Date(new Date().setDate(1))); // First day of current month
  const [toDate, setToDate] = useState<Date>(new Date()); // Today
  const [tempFromDate, setTempFromDate] = useState<Date>(new Date(new Date().setDate(1)));
  const [tempToDate, setTempToDate] = useState<Date>(new Date());
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const { handleBack } = useBackNavigation();
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { triggerHaptic } = useHapticFeedback();
  const styles = getStyles(colors, isDark);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadData();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);


  useEffect(() => {
    if (workDays.length > 0) {
      // ALWAYS use the function based on getRecentWorkDays that works
      calculateStatsFromRecentActivity();
    }
  }, [workDays, jobs, selectedPeriod, selectedJobId, fromDate, toDate]);

  const loadData = async () => {
    try {
      const [loadedJobs, loadedWorkDays] = await Promise.all([
        JobService.getJobs(),
        JobService.getWorkDays(),
      ]);
      setJobs(loadedJobs);
      setWorkDays(loadedWorkDays);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const calculateStatsFromRecentActivity = () => {
    console.log('🎯 Using getRecentWorkDays logic that WORKS!');
    console.log('Raw workDays loaded:', workDays.length);
    console.log('Sample raw workDays:', workDays.slice(0, 2).map(d => ({ date: d.date, hours: d.hours, type: d.type, jobId: d.jobId })));
    
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
      const dayDate = new Date(day.date);
      return dayDate >= startOfMonth && dayDate <= endOfMonth;
    });
    
    console.log('Step 3 - This month work days:', monthWorkDays.length);
    console.log('Month range:', startOfMonth.toDateString(), 'to', endOfMonth.toDateString());
    console.log('Sample month work days:', monthWorkDays.slice(0, 3).map(d => `${d.date}: ${d.hours}h`));
    
    // Step 4: Calculate totals using the SAME data structure
    const totalHours = monthWorkDays.reduce((sum, day) => sum + (day.hours || 0), 0);
    const totalDays = monthWorkDays.length;
    const overtimeHours = monthWorkDays.reduce((sum, day) => 
      sum + (day.overtime ? Math.max(0, (day.hours || 0) - 8) : 0), 0);
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
        const jobHours = jobWorkDays.reduce((sum, day) => sum + (day.hours || 0), 0);
        const jobDays = jobWorkDays.length;
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
    const totalHours = filteredWorkDays.reduce((sum, day) => sum + day.hours, 0);
    const totalDays = filteredWorkDays.length;
    const overtimeHours = filteredWorkDays.reduce((sum, day) => 
      sum + (day.overtime ? day.hours - 8 : 0), 0);
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
        const jobHours = jobWorkDays.reduce((sum, day) => sum + day.hours, 0);
        const jobDays = jobWorkDays.length;
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
    // Filter only work days first (like CalendarScreen)
    let filteredWorkDays = workDays.filter(day => day.type === 'work');
    
    // Filter by selected job if not "all"
    if (selectedJobId !== 'all') {
      filteredWorkDays = filteredWorkDays.filter(day => day.jobId === selectedJobId);
    }
    
    return filteredWorkDays
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, visibleRecentDays);
  };

  const getAllRecentWorkDays = () => {
    // Filter only work days first (like CalendarScreen)
    let filteredWorkDays = workDays.filter(day => day.type === 'work');
    
    // Filter by selected job if not "all"
    if (selectedJobId !== 'all') {
      filteredWorkDays = filteredWorkDays.filter(day => day.jobId === selectedJobId);
    }
    
    return filteredWorkDays
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleLoadMore = () => {
    setVisibleRecentDays(prev => prev + 6);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
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

  const generatePDF = async () => {
    if (!periodStats) return;

    setIsGeneratingPDF(true);
    
    try {
      // Get filtered data for PDF
      const selectedJob = selectedJobId === 'all' ? null : jobs.find(job => job.id === selectedJobId);
      const jobName = selectedJob ? selectedJob.name : t('reports.all_jobs');
      
      // Generate HTML content
      const htmlContent = generateHTMLReport();
      
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
    }
  };

  const generateHTMLReport = () => {
    if (!periodStats) return '';

    const selectedJob = selectedJobId === 'all' ? null : jobs.find(job => job.id === selectedJobId);
    const jobName = selectedJob ? selectedJob.name : t('reports.all_jobs');
    const periodLabel = getPeriodLabel();
    
    // Get recent activity for PDF
    const recentDays = getAllRecentWorkDays().slice(0, 10); // Max 10 recent days

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
        <div class="title">📊 ${t('reports.pdf_title')}</div>
        <div class="subtitle">${jobName}</div>
        <div class="period">${periodLabel}</div>
      </div>

      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-number">${periodStats.totalHours.toFixed(1)}h</div>
          <div class="stat-label">${t('reports.total_hours')}</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${periodStats.totalDays}</div>
          <div class="stat-label">${t('reports.worked_days')}</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${periodStats.avgHoursPerDay.toFixed(1)}h</div>
          <div class="stat-label">${t('reports.average_per_day')}</div>
        </div>
      </div>

      ${periodStats.overtimeHours > 0 ? `
        <div class="overtime">
          ⏰ ${t('reports.overtime_hours', { hours: periodStats.overtimeHours.toFixed(1) })}
        </div>
      ` : ''}

      ${periodStats.jobBreakdown.length > 1 ? `
        <div class="section">
          <div class="section-title">${t('reports.job_distribution')}</div>
          ${periodStats.jobBreakdown.map(stat => `
            <div class="job-item">
              <div>
                <div class="job-name">${stat.job.name}</div>
                <div class="job-stats">${stat.hours.toFixed(1)}h • ${stat.days} ${t('reports.days')} • ${stat.percentage.toFixed(1)}%</div>
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
            return `
              <div class="activity-item">
                <div>
                  <div class="activity-date">${formattedDate}</div>
                  <div class="activity-job">${job?.name || t('reports.work')}</div>
                </div>
                <div>
                  <span class="activity-hours">${day.hours}h</span>
                  ${(day.startTime && day.endTime) ? `<br><span class="activity-schedule">${day.startTime}-${day.endTime}${day.secondStartTime && day.secondEndTime ? `, ${day.secondStartTime}-${day.secondEndTime}` : ''}</span>` : ''}
                  ${day.overtime ? '<span class="activity-overtime">OT</span>' : ''}
                </div>
              </div>
            `;
          }).join('')}
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
    if (jobs.length === 0) return null;
    
    // Always show "All" option + available jobs
    const allOptions = [{ id: 'all', name: t('reports.all_jobs'), color: colors.primary }].concat(jobs);
    
    if (allOptions.length <= 4) {
      // Para hasta 4 opciones (incluyendo "Todos"), mostrar como pestañas
      return (
        <View style={styles.compactJobSelector}>
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
        </View>
      );
    } else {
      // Para más opciones, mostrar como scroll horizontal
      return (
        <View style={styles.compactJobSelector}>
          <Text style={styles.compactJobSelectorTitle}>{t('reports.filter_by_job')}</Text>
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
        </View>
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
        <Text style={styles.compactPeriodSelectorTitle}>{t('reports.analysis_period')}</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.placeholder} />
          <View style={styles.headerText}>
            <View style={styles.titleContainer}>
              <IconSymbol size={26} name="doc.text.fill" color={colors.primary} />
              <Text style={styles.headerTitle}>{t('reports.title')}</Text>
            </View>
            <Text style={styles.headerSubtitle}>{t('reports.subtitle')}</Text>
          </View>
          <TouchableOpacity 
            onPress={handleBack}
            style={styles.backButton}
          >
            <IconSymbol size={24} name="xmark" color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Job selector */}
        {renderCompactJobSelector()}

        {/* Period selector */}
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {renderCompactPeriodSelector()}
          
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
          <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <BlurView intensity={98} tint={isDark ? "dark" : "light"} style={styles.modernStatsCard}>
              <LinearGradient
                colors={isDark ? ['rgba(0, 122, 255, 0.15)', 'rgba(0, 122, 255, 0.05)'] : ['rgba(0, 122, 255, 0.1)', 'rgba(0, 122, 255, 0.03)']}
                style={styles.modernStatsCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.statsTitle}>{getPeriodLabel()}</Text>
              <View style={styles.statsGrid}>
                <View style={styles.modernStatItem}>
                  <View style={styles.statIconContainer}>
                    <AnimatedIcon size={32} name="clock.fill" color={colors.success} />
                  </View>
                  <AnimatedNumber 
                    value={periodStats.totalHours} 
                    decimals={1} 
                    suffix="h" 
                    style={styles.modernStatNumber}
                    duration={1200}
                  />
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
                  <AnimatedNumber 
                    value={periodStats.avgHoursPerDay} 
                    decimals={1} 
                    suffix="h" 
                    style={styles.modernStatNumber}
                    duration={1400}
                  />
                  <Text style={styles.modernStatLabel}>{t('reports.average_per_day')}</Text>
                </View>
              </View>
              {periodStats.overtimeHours > 0 && (
                <Animated.View style={[styles.overtimeInfo, { opacity: fadeAnim }]}>
                  <AnimatedIcon size={24} name="clock.fill" color={colors.warning} />
                  <Text style={styles.overtimeText}>
                    {t('reports.overtime_hours', { hours: periodStats.overtimeHours.toFixed(1) })}
                  </Text>
                </Animated.View>
              )}
            </BlurView>
          </Animated.View>
        )}

        {/* Job breakdown */}
        {periodStats && periodStats.jobBreakdown.length > 0 && (
          <BlurView intensity={98} tint={isDark ? "dark" : "light"} style={styles.jobBreakdownCard}>
            <LinearGradient
              colors={isDark ? ['rgba(255, 149, 0, 0.12)', 'rgba(255, 149, 0, 0.04)'] : ['rgba(255, 149, 0, 0.08)', 'rgba(255, 149, 0, 0.02)']}
              style={styles.jobBreakdownCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Text style={styles.cardTitle}>{t('reports.job_distribution')}</Text>
            {periodStats.jobBreakdown.map((stat) => (
              <View key={stat.job.id} style={styles.jobStatRow}>
                <View style={styles.jobStatInfo}>
                  <View style={[styles.jobColorBar, { backgroundColor: stat.job.color }]} />
                  <View style={styles.jobStatDetails}>
                    <Text style={styles.jobStatName}>{stat.job.name}</Text>
                    <Text style={styles.jobStatHours}>
                      {stat.hours.toFixed(1)}h • {stat.days} días • {stat.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${stat.percentage}%`,
                        backgroundColor: stat.job.color,
                      }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </BlurView>
        )}

        {/* Recent activity */}
        <BlurView intensity={98} tint={isDark ? "dark" : "light"} style={styles.recentCard}>
          <LinearGradient
            colors={isDark ? ['rgba(142, 142, 147, 0.1)', 'rgba(142, 142, 147, 0.03)'] : ['rgba(142, 142, 147, 0.06)', 'rgba(142, 142, 147, 0.02)']}
            style={styles.recentCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.cardTitle}>{t('reports.recent_activity')}</Text>
          {getRecentWorkDays().length > 0 ? (
            <>
              {getRecentWorkDays().map((day) => {
                const job = jobs.find(j => j.id === day.jobId);
                return (
                  <View key={day.id} style={styles.recentItem}>
                    <View style={styles.recentLeft}>
                      <View style={[styles.recentDot, { backgroundColor: job?.color || colors.primary }]} />
                      <View>
                        <Text style={styles.recentDate}>{formatDate(day.date)}</Text>
                        <Text style={styles.recentJob}>{job?.name || 'Trabajo'}</Text>
                      </View>
                    </View>
                    <View style={styles.recentRight}>
                      <Text style={styles.recentHours}>{day.hours}h</Text>
                      {/* Show specific schedule if available */}
                      {(day.startTime && day.endTime) && (
                        <Text style={styles.recentSchedule}>
                          {day.startTime}-{day.endTime}
                          {day.secondStartTime && day.secondEndTime && (
                            `, ${day.secondStartTime}-${day.secondEndTime}`
                          )}
                        </Text>
                      )}
                      {day.overtime && (
                        <Text style={styles.recentOvertime}>{t('reports.ot')}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
              {getAllRecentWorkDays().length > visibleRecentDays && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={handleLoadMore}
                >
                  <Text style={styles.loadMoreText}>
                    {t('reports.load_more', { remaining: getAllRecentWorkDays().length - visibleRecentDays })}
                  </Text>
                  <IconSymbol size={16} name="chevron.down" color={colors.primary} />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol size={32} name="calendar" color={colors.textSecondary} />
              <Text style={styles.emptyText}>{t('reports.no_records')}</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => onNavigate('calendar')}
              >
                <Text style={styles.addButtonText}>{t('reports.add_time')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </BlurView>

        {/* Quick actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onNavigate('calendar')}
          >
            <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.actionButtonInner}>
              <IconSymbol size={24} name="calendar" color={colors.primary} />
              <Text style={styles.actionButtonText}>{t('reports.view_calendar')}</Text>
              <IconSymbol size={16} name="arrow.right" color={colors.primary} />
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onNavigate('timer')}
          >
            <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.actionButtonInner}>
              <IconSymbol size={24} name="clock.fill" color={colors.success} />
              <Text style={styles.actionButtonText}>{t('reports.start_timer')}</Text>
              <IconSymbol size={16} name="arrow.right" color={colors.success} />
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* PDF Export Button */}
        {periodStats && (
          <TouchableOpacity
            style={[styles.actionButton, isGeneratingPDF && styles.exportButtonDisabled]}
            onPress={generatePDF}
            disabled={isGeneratingPDF}
          >
            <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.actionButtonInner}>
              {isGeneratingPDF ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <IconSymbol size={24} name="square.and.arrow.up" color={colors.primary} />
              )}
              <Text style={[styles.actionButtonText, isGeneratingPDF && styles.exportButtonTextDisabled]}>
                {isGeneratingPDF 
                  ? t('reports.generating_pdf')
                  : selectedJobId === 'all'
                    ? t('reports.export_all_jobs') 
                    : t('reports.export_job', { jobName: jobs.find(j => j.id === selectedJobId)?.name || '' })
                }
              </Text>
              {!isGeneratingPDF && (
                <IconSymbol size={16} name="arrow.right" color={colors.primary} />
              )}
            </BlurView>
          </TouchableOpacity>
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
    </SafeAreaView>
  );
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
    paddingVertical: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
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
    fontSize: 16, fontWeight: "600",
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
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
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
    fontSize: 28,
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
    overflow: 'hidden',
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
  addButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primary,
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
  actionsContainer: {
    marginVertical: 20,
    marginBottom: 24,
    gap: 16,
  },
  actionButton: {
    marginVertical: 4,
  },
  actionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 16,
    color: colors.text,
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
  },
  modalButton: {
    minWidth: 60,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
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
});