import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  LineChart,
  BarChart,
  PieChart,
  ContributionGraph,
  StackedBarChart
} from 'react-native-chart-kit';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring,
  FadeIn,
  SlideInUp
} from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import NoJobsWarning from '../components/NoJobsWarning';
import { Job, WorkDay } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import { useBackNavigation } from '../context/NavigationContext';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ReportsScreenProps {
  onNavigate: (screen: string, options?: any) => void;
}

interface PeriodStats {
  totalHours: number;
  totalDays: number;
  overtimeHours: number;
  avgHoursPerDay: number;
  jobBreakdown: Array<{
    job: Job;
    hours: number;
    days: number;
    percentage: number;
  }>;
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
    fontSize: 16, 
    fontWeight: "600",
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
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 4,
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
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 4,
  },
  selectorTitle: {
    fontSize: 16, 
    fontWeight: "600",
    marginBottom: 16,
    textAlign: 'center',
    color: colors.text,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
  },
  periodButtonBorder: {
    borderColor: colors.separator,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
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
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 4,
  },
  statsTitle: {
    fontSize: 20, 
    fontWeight: "600",
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
  statNumber: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
    color: colors.text,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.textSecondary,
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
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16, 
    fontWeight: "600",
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
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(128, 128, 128, 0.2)',
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
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 4,
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
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 4, 
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 16,
    color: colors.text,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailedBreakdown: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
});

export default function ReportsScreen({ onNavigate }: ReportsScreenProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [selectedJobId, setSelectedJobId] = useState<string | 'all'>('all');
  const [periodStats, setPeriodStats] = useState<PeriodStats | null>(null);
  const [visibleRecentDays, setVisibleRecentDays] = useState<number>(6);
  const { handleBack } = useBackNavigation();
  
  const styles = getStyles(colors, isDark);

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (workDays.length > 0 && jobs.length > 0) {
      calculatePeriodStats();
    }
  }, [workDays, jobs, selectedPeriod, selectedJobId]);

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

  // Preparar datos para el gráfico de torta
  const preparePieChartData = () => {
    if (!periodStats || periodStats.jobBreakdown.length === 0) return [];
    
    return periodStats.jobBreakdown.map((stat) => ({
      name: stat.job.name.length > 10 ? stat.job.name.substring(0, 10) + '...' : stat.job.name,
      population: stat.hours,
      color: stat.job.color,
      legendFontColor: colors.text,
      legendFontSize: 12,
    }));
  };

  // Configuración del gráfico
  const chartConfig = {
    backgroundColor: colors.background,
    backgroundGradientFrom: colors.background,
    backgroundGradientTo: colors.background,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(81, 150, 244, ${opacity})`,
    labelColor: (opacity = 1) => colors.text,
    style: {
      borderRadius: 16,
    },
  };

  const calculatePeriodStats = () => {
    const now = new Date();
    let startDate: Date;

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
    }

    let periodWorkDays = workDays.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate >= startDate && dayDate <= now;
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
    let jobStats: Array<{
      job: Job;
      hours: number;
      days: number;
      percentage: number;
    }>;
    
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
        {jobs.length === 0 ? (
          <NoJobsWarning onCreateJob={handleCreateJob} />
        ) : (
          <>
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
        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.periodSelector}>
          <Text style={styles.selectorTitle}>{t('reports.analysis_period')}</Text>
          <View style={styles.periodButtons}>
            {(['week', 'month', 'year'] as const).map((period) => (
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
                  {period === 'week' ? t('reports.week') : period === 'month' ? t('reports.month') : t('reports.year')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </BlurView>

        {/* Main stats */}
        {periodStats && (
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.statsCard}>
            <Text style={styles.statsTitle}>{getPeriodLabel()}</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <IconSymbol size={24} name="clock.fill" color={colors.success} />
                <Text style={styles.statNumber}>{periodStats.totalHours.toFixed(1)}h</Text>
                <Text style={styles.statLabel}>{t('reports.total_hours')}</Text>
              </View>
              <View style={styles.statItem}>
                <IconSymbol size={24} name="calendar" color={colors.primary} />
                <Text style={styles.statNumber}>{periodStats.totalDays}</Text>
                <Text style={styles.statLabel}>{t('reports.worked_days')}</Text>
              </View>
              <View style={styles.statItem}>
                <IconSymbol size={24} name="chart.bar.fill" color={colors.warning} />
                <Text style={styles.statNumber}>{periodStats.avgHoursPerDay.toFixed(1)}h</Text>
                <Text style={styles.statLabel}>{t('reports.average_per_day')}</Text>
              </View>
            </View>
            {periodStats.overtimeHours > 0 && (
              <View style={styles.overtimeInfo}>
                <IconSymbol size={20} name="clock.fill" color={colors.warning} />
                <Text style={styles.overtimeText}>
                  {t('reports.overtime_hours', { hours: periodStats.overtimeHours.toFixed(1) })}
                </Text>
              </View>
            )}
          </BlurView>
        )}

        {/* Job breakdown with animated pie chart */}
        {periodStats && periodStats.jobBreakdown.length > 0 && (
          <Animated.View 
            entering={FadeIn.duration(600).delay(300)}
            style={{ marginVertical: 16 }}
          >
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.jobBreakdownCard}>
              <Text style={styles.cardTitle}>{t('reports.job_distribution')}</Text>
              
              {/* Pie Chart */}
              {preparePieChartData().length > 0 && (
                <Animated.View 
                  entering={SlideInUp.duration(800).delay(500)}
                  style={styles.chartContainer}
                >
                  <PieChart
                    data={preparePieChartData()}
                    width={Dimensions.get('window').width - 60}
                    height={220}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    center={[10, 10]}
                    hasLegend={true}
                  />
                </Animated.View>
              )}

              {/* Detailed breakdown */}
              <View style={styles.detailedBreakdown}>
                {periodStats.jobBreakdown.map((stat, index) => (
                  <Animated.View 
                    key={stat.job.id} 
                    entering={FadeIn.duration(400).delay(700 + index * 100)}
                    style={styles.jobStatRow}
                  >
                    <View style={styles.jobStatInfo}>
                      <View style={[styles.jobColorBar, { backgroundColor: stat.job.color }]} />
                      <View style={styles.jobStatDetails}>
                        <Text style={styles.jobStatName}>{stat.job.name}</Text>
                        <Text style={styles.jobStatHours}>
                          {stat.hours.toFixed(1)}h • {stat.days} días • {stat.percentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                    <Animated.View 
                      entering={SlideInUp.duration(500).delay(800 + index * 100)}
                      style={styles.progressBarContainer}
                    >
                      <View 
                        style={[
                          styles.progressBar, 
                          { 
                            width: `${stat.percentage}%`,
                            backgroundColor: stat.job.color,
                          }
                        ]} 
                      />
                    </Animated.View>
                  </Animated.View>
                ))}
              </View>
            </BlurView>
          </Animated.View>
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
                        <Text style={styles.recentJob}>{job?.name || t('settings.jobs.title')}</Text>
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

