import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import WorkDayModal from '../components/WorkDayModal';
import NoJobsWarning from '../components/NoJobsWarning';
import { Job, WorkDay, WorkDayWithJob, DAY_TYPES } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import { useBackNavigation, useNavigation } from '../context/NavigationContext';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface CalendarScreenProps {
  onNavigate?: (screen: string, options?: any) => void;
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
  calendar: {
    marginVertical: 20,
    borderRadius: 16,
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 4,
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
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
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
    borderRadius: 16,
    padding: 20,
    backgroundColor: colors.surface,
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 4, 
    elevation: 2,
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
    marginVertical: 20,
    marginBottom: 24,
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
  const { t } = useLanguage();
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showWorkDayModal, setShowWorkDayModal] = useState(false);
  const [editingWorkDay, setEditingWorkDay] = useState<WorkDay | undefined>();
  const [preselectedJobId, setPreselectedJobId] = useState<string | undefined>();
  const [selectedJobId, setSelectedJobId] = useState<string | 'all'>('all');
  const { handleBack } = useBackNavigation();
  const { selectedJob, setSelectedJob } = useNavigation();
  
  const styles = getStyles(colors, isDark);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-select job if coming from map
  useEffect(() => {
    if (selectedJob) {
      setPreselectedJobId(selectedJob.id);
      setSelectedJobId(selectedJob.id);
      // Clear the selected job after using it
      setSelectedJob(null);
    }
  }, [selectedJob]);

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

  const handleDayPress = (day: DateData) => {
    const dateString = day.dateString;
    setSelectedDate(dateString);
    
    const existingWorkDay = workDays.find(wd => wd.date === dateString);
    setEditingWorkDay(existingWorkDay);
    setShowWorkDayModal(true);
  };

  const handleSaveWorkDay = async (workDayData: Omit<WorkDay, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingWorkDay) {
        await JobService.updateWorkDay(editingWorkDay.id, workDayData);
      } else {
        await JobService.addWorkDay(workDayData);
      }
      await loadData();
    } catch (error) {
      console.error('Error saving work day:', error);
      Alert.alert('Error', t('calendar.save_workday_error'));
    }
  };

  const handleDeleteWorkDay = async () => {
    if (editingWorkDay) {
      try {
        await JobService.deleteWorkDay(editingWorkDay.id);
        await loadData();
      } catch (error) {
        console.error('Error deleting work day:', error);
        Alert.alert('Error', t('calendar.delete_workday_error'));
      }
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};

    // Filter workDays by selected job if not "all"
    // When filtering, show only work days from selected job + all non-work days
    const filteredWorkDays = selectedJobId !== 'all'
      ? workDays.filter(wd => {
          if (wd.type === 'work') {
            return wd.jobId === selectedJobId;
          }
          // Always show non-work days (free, vacation, sick)
          return true;
        })
      : workDays;

    filteredWorkDays.forEach(workDay => {
      let color: string;
      
      // Safety check for undefined or null type
      if (!workDay.type) {
        color = '#000000'; // Black for undefined/null types
      } else if (workDay.type === 'work') {
        color = '#30D158'; // Green for work days
      } else if (workDay.type === 'free') {
        color = '#007AFF'; // Blue for free days
      } else if (workDay.type === 'vacation') {
        color = '#FF9500'; // Yellow for vacation
      } else if (workDay.type === 'sick') {
        color = '#FF3B30'; // Red for sick days
      } else {
        color = '#000000'; // Black for others
      }

      marked[workDay.date] = {
        marked: true,
        dotColor: color,
        selectedColor: color,
        selectedTextColor: '#FFFFFF',
      };
    });

    return marked;
  };

  const getMonthStats = () => {
    const monthKey = currentMonth.toISOString().slice(0, 7);
    
    // Filter workDays by selected job if not "all"
    // When filtering, show only work days from selected job + all non-work days
    const filteredWorkDays = selectedJobId !== 'all'
      ? workDays.filter(wd => {
          if (wd.type === 'work') {
            return wd.jobId === selectedJobId;
          }
          // Always show non-work days (free, vacation, sick)
          return true;
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.placeholder} />
          <View style={styles.headerText}>
            <View style={styles.titleContainer}>
              <IconSymbol size={26} name="calendar" color={colors.primary} />
              <Text style={styles.headerTitle}>
                {selectedJobId !== 'all' 
                  ? t('calendar.title_filtered', { jobName: jobs.find(j => j.id === selectedJobId)?.name })
                  : t('calendar.title')
                }
              </Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {selectedJobId !== 'all' 
                ? t('calendar.subtitle_filtered', { jobName: jobs.find(j => j.id === selectedJobId)?.name })
                : t('calendar.subtitle')
              }
            </Text>
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
            <Text style={styles.selectorTitle}>{t('calendar.filter_by_job')}</Text>
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
                    {t('calendar.all_jobs')}
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

        <Calendar
          style={styles.calendar}
          onDayPress={handleDayPress}
          onMonthChange={(month: any) => setCurrentMonth(new Date(month.timestamp))}
          markedDates={getMarkedDates()}
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
            indicatorColor: colors.primary,
            textDayFontFamily: 'System',
            textMonthFontFamily: 'System',
            textDayHeaderFontFamily: 'System',
            textDayFontWeight: '400',
            textMonthFontWeight: '600',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14,
            dotStyle: {
              width: 8,
              height: 8,
              borderRadius: 4,
            },
          }}
        />

        <BlurView 
          intensity={95} 
          tint={isDark ? "dark" : "light"} 
          style={styles.statsCard}
        >
          <Text style={styles.statsTitle}>{t('calendar.month_stats')}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <IconSymbol size={24} name="clock.fill" color={colors.success} />
              <Text style={styles.statNumber}>{stats.workDays}</Text>
              <Text style={styles.statLabel}>{t('calendar.worked_days')}</Text>
            </View>
            <View style={styles.statItem}>
              <IconSymbol size={24} name="clock.fill" color={colors.success} />
              <Text style={styles.statNumber}>{stats.totalHours}h</Text>
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

        {/* Jobs breakdown */}
        {Object.keys(stats.jobStats).length > 0 && selectedJobId === 'all' && (
          <BlurView 
            intensity={95} 
            tint={isDark ? "dark" : "light"} 
            style={styles.jobsStatsCard}
          >
            <Text style={styles.statsTitle}>{t('calendar.by_job')}</Text>
            {Object.values(stats.jobStats).map(({ job, days, hours }) => (
              <View key={job.id} style={styles.jobStatRow}>
                <View style={styles.jobStatInfo}>
                  <View style={[styles.jobStatColor, { backgroundColor: job.color }]} />
                  <View style={styles.jobStatText}>
                    <Text style={styles.jobStatName}>{job.name}</Text>
                    <Text style={styles.jobStatDetails}>{days} días • {hours}h</Text>
                  </View>
                </View>
              </View>
            ))}
          </BlurView>
        )}

        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.legendCard}>
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

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onNavigate && onNavigate('reports')}
        >
          <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.actionButtonInner}>
            <IconSymbol size={24} name="chart.bar.fill" color={colors.primary} />
            <Text style={styles.actionButtonText}>{t('calendar.view_detailed_reports')}</Text>
            <IconSymbol size={16} name="arrow.right" color={colors.primary} />
          </BlurView>
        </TouchableOpacity>
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

