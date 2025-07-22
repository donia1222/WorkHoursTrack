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
import { Job, WorkDay } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import { useBackNavigation } from '../context/NavigationContext';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
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
  const { t } = useLanguage();
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
    if (workDays.length > 0 && jobs.length > 0) {
      calculatePeriodStats();
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

    let periodWorkDays = workDays.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate >= startDate && dayDate <= endDate;
    });

    // Filter by selected job if not "all"
    if (selectedJobId !== 'all') {
      periodWorkDays = periodWorkDays.filter(day => day.jobId === selectedJobId);
    }

    const totalHours = periodWorkDays.reduce((sum, day) => sum + day.hours, 0);
    const totalDays = periodWorkDays.length;
    const overtimeHours = periodWorkDays.reduce((sum, day) => 
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
    let filteredWorkDays = workDays;
    
    // Filter by selected job if not "all"
    if (selectedJobId !== 'all') {
      filteredWorkDays = workDays.filter(day => day.jobId === selectedJobId);
    }
    
    return filteredWorkDays
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, visibleRecentDays);
  };

  const getAllRecentWorkDays = () => {
    let filteredWorkDays = workDays;
    
    // Filter by selected job if not "all"
    if (selectedJobId !== 'all') {
      filteredWorkDays = workDays.filter(day => day.jobId === selectedJobId);
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
    const jobName = selectedJob ? selectedJob.name : 'Todos los trabajos';
    const periodLabel = getPeriodLabel();

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reporte de Tiempo - ${jobName}</title>
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
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">📊 Reporte de Tiempo</div>
        <div class="subtitle">${jobName}</div>
        <div class="period">${periodLabel}</div>
      </div>

      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-number">${periodStats.totalHours.toFixed(1)}h</div>
          <div class="stat-label">Total Horas</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${periodStats.totalDays}</div>
          <div class="stat-label">Días Trabajados</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${periodStats.avgHoursPerDay.toFixed(1)}h</div>
          <div class="stat-label">Promedio/Día</div>
        </div>
      </div>

      ${periodStats.overtimeHours > 0 ? `
        <div class="overtime">
          ⏰ ${periodStats.overtimeHours.toFixed(1)} horas de overtime
        </div>
      ` : ''}

      ${periodStats.jobBreakdown.length > 1 ? `
        <div class="section">
          <div class="section-title">Distribución por Trabajo</div>
          ${periodStats.jobBreakdown.map(stat => `
            <div class="job-item">
              <div>
                <div class="job-name">${stat.job.name}</div>
                <div class="job-stats">${stat.hours.toFixed(1)}h • ${stat.days} días • ${stat.percentage.toFixed(1)}%</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="footer">
        Generado el ${new Date().toLocaleDateString('es-ES', { 
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.placeholder} />
          <View style={styles.headerText}>
            <View style={styles.titleContainer}>
              <IconSymbol size={20} name="doc.text.fill" color={colors.primary} />
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
        {jobs.length > 1 && (
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.jobSelector}>
            <Text style={styles.selectorTitle}>{t('reports.filter_by_job')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.jobScrollView}>
              <View style={styles.jobButtons}>
                <TouchableOpacity
                  style={[
                    styles.jobButton,
                    selectedJobId === 'all' && styles.jobButtonActive,
                  ]}
                  onPress={() => setSelectedJobId('all')}
                >
                  <Text
                    style={[
                      styles.jobButtonText,
                      selectedJobId === 'all' && styles.jobButtonTextActive,
                    ]}
                  >
                    {t('reports.all_jobs')}
                  </Text>
                </TouchableOpacity>
                {jobs.map((job) => (
                  <TouchableOpacity
                    key={job.id}
                    style={[
                      styles.jobButton,
                      selectedJobId === job.id && styles.jobButtonActive,
                    ]}
                    onPress={() => setSelectedJobId(job.id)}
                  >
                    <View style={[styles.jobButtonDot, { backgroundColor: job.color }]} />
                    <Text
                      style={[
                        styles.jobButtonText,
                        selectedJobId === job.id && styles.jobButtonTextActive,
                      ]}
                    >
                      {job.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </BlurView>
        )}

        {/* Period selector */}
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.periodSelector}>
            <Text style={styles.selectorTitle}>{t('reports.analysis_period')}</Text>
            <View style={styles.periodButtons}>
              {(['week', 'month', 'year', 'custom'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    styles.periodButtonBorder,
                    selectedPeriod === period && styles.periodButtonActive,
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      styles.periodButtonTextColor,
                      selectedPeriod === period && styles.periodButtonTextActive,
                    ]}
                  >
                    {period === 'custom' ? t('reports.custom_range') : t(`reports.${period}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Custom Date Range Picker - SOLO cuando Custom range está seleccionado */}
            {selectedPeriod === 'custom' && (
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
            )}
          </BlurView>
        </Animated.View>

        {/* Main stats */}
        {periodStats && (
          <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.modernStatsCard}>
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
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.jobBreakdownCard}>
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
        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.recentCard}>
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
    marginVertical: 16,
    borderRadius: 24,
    padding: 24,
    backgroundColor: colors.surface,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
    marginVertical: 16,
    borderRadius: 16,
    padding: 20,
    backgroundColor: colors.surface,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
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
    marginVertical: 16,
    borderRadius: 16,
    padding: 20,
    backgroundColor: colors.surface,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
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