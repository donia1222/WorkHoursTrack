import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { BlurView } from 'expo-blur';
import HourSelector from './HourSelector';
import JobSelector from './JobSelector';
import JobStatisticsModal from './JobStatisticsModal';
import { Job, WorkDay } from '../types/WorkTypes';
import { CalendarSyncService } from '../services/CalendarSyncService';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface WorkDayModalProps {
  visible: boolean;
  onClose: () => void;
  date: string;
  existingWorkDay?: WorkDay;
  jobs: Job[];
  preselectedJobId?: string;
  onSave: (workDay: Omit<WorkDay, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
}

export default function WorkDayModal({
  visible,
  onClose,
  date,
  existingWorkDay,
  jobs,
  preselectedJobId,
  onSave,
  onDelete,
}: WorkDayModalProps) {
  const { t, language } = useLanguage();
  const { colors } = useTheme();
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [hours, setHours] = useState<number>(8);
  const [notes, setNotes] = useState<string>('');
  const [dayType, setDayType] = useState<'work' | 'free' | 'vacation' | 'sick'>('work');
  const [showStatistics, setShowStatistics] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'job' | 'custom' | 'manual'>('job');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [hasSplitShift, setHasSplitShift] = useState<boolean>(false);
  const [secondStartTime, setSecondStartTime] = useState<string>('14:00');
  const [secondEndTime, setSecondEndTime] = useState<string>('18:00');

  // Dynamic day types with translations
  const getDayTypes = () => ({
    work: {
      label: t('calendar.work_day'),
      color: '#30D158',
      icon: 'clock.fill',
    },
    free: {
      label: t('calendar.free_day'),
      color: '#007AFF',
      icon: 'calendar',
    },
    vacation: {
      label: t('calendar.vacation_day'),
      color: '#FF9500',
      icon: 'sun.max.fill',
    },
    sick: {
      label: t('calendar.sick_day'),
      color: '#FF3B30',
      icon: 'cross.fill',
    },
  });

  // Function to calculate hours from time range
  const calculateHoursFromTime = (start: string, end: string, secondStart?: string, secondEnd?: string): number => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    
    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    
    let totalMinutes = endMinutes - startMinutes;
    
    // Add second shift if split shift is enabled
    if (secondStart && secondEnd) {
      const [secondStartHour, secondStartMin] = secondStart.split(':').map(Number);
      const [secondEndHour, secondEndMin] = secondEnd.split(':').map(Number);
      
      const secondStartMinutes = secondStartHour * 60 + secondStartMin;
      let secondEndMinutes = secondEndHour * 60 + secondEndMin;
      
      // Handle overnight for second shift
      if (secondEndMinutes <= secondStartMinutes) {
        secondEndMinutes += 24 * 60;
      }
      
      totalMinutes += (secondEndMinutes - secondStartMinutes);
    }
    
    return Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimal places
  };

  // Update hours when schedule mode or times change
  useEffect(() => {
    if (dayType === 'work' && scheduleMode !== 'manual') {
      const selectedJob = jobs.find(job => job.id === selectedJobId);
      
      if (scheduleMode === 'job' && selectedJob?.schedule) {
        const secondStart = selectedJob.schedule.hasSplitShift ? selectedJob.schedule.secondStartTime : undefined;
        const secondEnd = selectedJob.schedule.hasSplitShift ? selectedJob.schedule.secondEndTime : undefined;
        
        const jobHours = calculateHoursFromTime(
          selectedJob.schedule.startTime, 
          selectedJob.schedule.endTime,
          secondStart,
          secondEnd
        );
        setHours(jobHours);
        setStartTime(selectedJob.schedule.startTime);
        setEndTime(selectedJob.schedule.endTime);
        setHasSplitShift(selectedJob.schedule.hasSplitShift || false);
        if (selectedJob.schedule.secondStartTime) setSecondStartTime(selectedJob.schedule.secondStartTime);
        if (selectedJob.schedule.secondEndTime) setSecondEndTime(selectedJob.schedule.secondEndTime);
      } else if (scheduleMode === 'custom') {
        const secondStart = hasSplitShift ? secondStartTime : undefined;
        const secondEnd = hasSplitShift ? secondEndTime : undefined;
        const customHours = calculateHoursFromTime(startTime, endTime, secondStart, secondEnd);
        setHours(customHours);
      }
    }
  }, [scheduleMode, startTime, endTime, secondStartTime, secondEndTime, hasSplitShift, selectedJobId, dayType, jobs]);

  useEffect(() => {
    if (existingWorkDay) {
      setSelectedJobId(existingWorkDay.jobId || '');
      setHours(existingWorkDay.hours);
      setNotes(existingWorkDay.notes || '');
      setDayType(existingWorkDay.type);
      
      // Set schedule mode and times based on existing data
      if (existingWorkDay.startTime && existingWorkDay.endTime) {
        setStartTime(existingWorkDay.startTime);
        setEndTime(existingWorkDay.endTime);
        
        // Handle split shift data
        const hasSplit = !!(existingWorkDay.secondStartTime && existingWorkDay.secondEndTime);
        setHasSplitShift(hasSplit);
        if (hasSplit) {
          setSecondStartTime(existingWorkDay.secondStartTime!);
          setSecondEndTime(existingWorkDay.secondEndTime!);
        }
        
        // Check if it matches job schedule
        const job = jobs.find(j => j.id === existingWorkDay.jobId);
        if (job?.schedule && 
            job.schedule.startTime === existingWorkDay.startTime && 
            job.schedule.endTime === existingWorkDay.endTime &&
            job.schedule.hasSplitShift === hasSplit) {
          setScheduleMode('job');
        } else {
          setScheduleMode('custom');
        }
      } else {
        setScheduleMode('manual');
      }
    } else {
      // Set preselected job if provided, otherwise use default
      if (preselectedJobId) {
        const preselectedJob = jobs.find(job => job.id === preselectedJobId);
        if (preselectedJob) {
          setSelectedJobId(preselectedJob.id);
          setHours(preselectedJob.defaultHours);
          
          // Use job schedule if available
          if (preselectedJob.schedule) {
            setScheduleMode('job');
            setStartTime(preselectedJob.schedule.startTime);
            setEndTime(preselectedJob.schedule.endTime);
          } else {
            setScheduleMode('manual');
          }
        }
      } else {
        // Set default job and hours
        const defaultJob = jobs.find(job => job.isActive) || jobs[0];
        if (defaultJob) {
          setSelectedJobId(defaultJob.id);
          setHours(defaultJob.defaultHours);
          
          // Use job schedule if available
          if (defaultJob.schedule) {
            setScheduleMode('job');
            setStartTime(defaultJob.schedule.startTime);
            setEndTime(defaultJob.schedule.endTime);
          } else {
            setScheduleMode('manual');
          }
        }
      }
      setNotes('');
      setDayType('work');
    }
  }, [existingWorkDay, jobs, visible, preselectedJobId]);

  const handleSave = () => {
    if (dayType === 'work' && !selectedJobId) {
      Alert.alert('Error', t('calendar.select_job_error'));
      return;
    }

    const workDay: Omit<WorkDay, 'id' | 'createdAt' | 'updatedAt'> = {
      date,
      jobId: dayType === 'work' ? selectedJobId : undefined,
      hours: dayType === 'work' ? hours : 0,
      notes: notes.trim(),
      overtime: dayType === 'work' && hours > 8,
      type: dayType,
      startTime: dayType === 'work' && scheduleMode !== 'manual' ? startTime : undefined,
      endTime: dayType === 'work' && scheduleMode !== 'manual' ? endTime : undefined,
      secondStartTime: dayType === 'work' && scheduleMode !== 'manual' && hasSplitShift ? secondStartTime : undefined,
      secondEndTime: dayType === 'work' && scheduleMode !== 'manual' && hasSplitShift ? secondEndTime : undefined,
    };

    onSave(workDay);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      t('calendar.delete_workday_title'),
      t('calendar.delete_workday_message'),
      [
        { text: t('calendar.cancel'), style: 'cancel' },
        { 
          text: t('calendar.delete'), 
          style: 'destructive',
          onPress: () => {
            onDelete?.();
            onClose();
          }
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Get current language for locale formatting
    const localeMap: { [key: string]: string } = {
      'es': 'es-ES',
      'en': 'en-US', 
      'de': 'de-DE',
      'fr': 'fr-FR',
      'it': 'it-IT',
    };
    const locale = localeMap[language] || 'en-US';
    
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const selectedJob = jobs.find(job => job.id === selectedJobId);

  const handleSyncToCalendar = async () => {
    if (dayType !== 'work' || !selectedJob) {
      Alert.alert('Error', t('calendar.calendar_sync_error'));
      return;
    }

    const tempWorkDay: WorkDay = {
      id: 'temp',
      date,
      jobId: selectedJobId,
      hours,
      notes: notes.trim(),
      overtime: hours > 8,
      type: dayType,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    Alert.alert(
      t('calendar.sync_options_title'),
      t('calendar.sync_options_message'),
      [
        { text: t('calendar.cancel'), style: 'cancel' },
        {
          text: t('calendar.native_calendar'),
          onPress: () => CalendarSyncService.syncWorkDayToCalendar(tempWorkDay, selectedJob)
        },
        {
          text: t('calendar.ics_file'),
          onPress: () => CalendarSyncService.shareICSFile(tempWorkDay, selectedJob)
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <BlurView intensity={95} tint="light" style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={handleSave}
              style={styles.saveButton}
            >
              <IconSymbol size={20} name="checkmark" color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <View style={styles.titleContainer}>
                <IconSymbol size={20} name="calendar" color={Theme.colors.primary} />
                <Text style={styles.headerTitle}>
                  {existingWorkDay ? t('calendar.edit_day') : t('calendar.register_day')}
                </Text>
              </View>
              <Text style={styles.headerSubtitle}>
                {formatDate(date)}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.backButton}
            >
              <IconSymbol size={24} name="xmark" color={Theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </BlurView>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Day type selector */}
          <View style={styles.section}>
            <BlurView intensity={95} tint="light" style={styles.dayTypeContainer}>
              <Text style={styles.dayTypeTitle}>{t('calendar.day_types_title')}</Text>
              <View style={styles.dayTypeButtons}>
                {(Object.keys(getDayTypes()) as (keyof ReturnType<typeof getDayTypes>)[]).map((type) => {
                  const dayTypes = getDayTypes();
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.dayTypeButton,
                        dayType === type && [styles.dayTypeButtonActive, { backgroundColor: dayTypes[type].color }]
                      ]}
                      onPress={() => setDayType(type)}
                    >
                      <IconSymbol 
                        size={20} 
                        name={dayTypes[type].icon as any}
                        color={dayType === type ? '#FFFFFF' : dayTypes[type].color} 
                      />
                      <Text 
                        style={[
                          styles.dayTypeButtonText,
                          dayType === type && styles.dayTypeButtonTextActive
                        ]}
                      >
                        {dayTypes[type].label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </BlurView>
          </View>

          {/* Compact job selector - only for work days */}
          {dayType === 'work' && jobs.length > 1 && (
            <View style={styles.section}>
              <BlurView intensity={95} tint="light" style={styles.compactJobSelector}>
                <Text style={styles.compactJobTitle}>{t('job_selector.title')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.jobTabsScroll}>
                  <View style={styles.jobTabs}>
                    {jobs.filter(job => job.isActive).map((job) => (
                      <TouchableOpacity
                        key={job.id}
                        style={[
                          styles.jobTab,
                          selectedJobId === job.id && [styles.jobTabActive, { borderBottomColor: job.color }]
                        ]}
                        onPress={() => setSelectedJobId(job.id)}
                      >
                        <View style={[styles.jobTabDot, { backgroundColor: job.color }]} />
                        <Text 
                          style={[
                            styles.jobTabText,
                            selectedJobId === job.id && styles.jobTabTextActive
                          ]}
                        >
                          {job.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </BlurView>
            </View>
          )}
          
          {/* Single job display - when only one job exists */}
          {dayType === 'work' && jobs.length === 1 && (
            <View style={styles.section}>
              <BlurView intensity={95} tint="light" style={styles.singleJobDisplay}>
                <View style={styles.singleJobContent}>
                  <View style={[styles.jobTabDot, { backgroundColor: jobs[0].color }]} />
                  <Text style={styles.singleJobText}>{jobs[0].name}</Text>
                  <IconSymbol size={16} name="checkmark.circle.fill" color={colors.success} />
                </View>
              </BlurView>
            </View>
          )}

          {/* Schedule mode selector - only for work days */}
          {dayType === 'work' && (
            <View style={styles.section}>
              <BlurView intensity={95} tint="light" style={styles.scheduleModeContainer}>
                <Text style={styles.scheduleModeTitle}>{t('calendar.schedule_mode')}</Text>
                
                {/* Schedule Mode Buttons */}
                <View style={styles.scheduleModeButtons}>
                  {/* Use Job Schedule */}
                  {jobs.find(j => j.id === selectedJobId)?.schedule && (
                    <TouchableOpacity
                      style={[
                        styles.scheduleModeButton,
                        scheduleMode === 'job' && styles.scheduleModeButtonActive
                      ]}
                      onPress={() => setScheduleMode('job')}
                    >
                      <IconSymbol 
                        size={20} 
                        name="clock.fill"
                        color={scheduleMode === 'job' ? '#FFFFFF' : Theme.colors.primary} 
                      />
                      <Text 
                        style={[
                          styles.scheduleModeButtonText,
                          scheduleMode === 'job' && styles.scheduleModeButtonTextActive
                        ]}
                      >
                        {t('calendar.use_job_schedule')}
                      </Text>
                      {scheduleMode === 'job' && (
                        <Text style={styles.scheduleTimeText}>
                          {jobs.find(j => j.id === selectedJobId)?.schedule?.startTime} - {jobs.find(j => j.id === selectedJobId)?.schedule?.endTime}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                  
                  {/* Custom Schedule */}
                  <TouchableOpacity
                    style={[
                      styles.scheduleModeButton,
                      scheduleMode === 'custom' && styles.scheduleModeButtonActive
                    ]}
                    onPress={() => setScheduleMode('custom')}
                  >
                    <IconSymbol 
                      size={20} 
                      name="clock"
                      color={scheduleMode === 'custom' ? '#FFFFFF' : Theme.colors.primary} 
                    />
                    <Text 
                      style={[
                        styles.scheduleModeButtonText,
                        scheduleMode === 'custom' && styles.scheduleModeButtonTextActive
                      ]}
                    >
                      {t('calendar.custom_schedule')}
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Manual Hours */}
                  <TouchableOpacity
                    style={[
                      styles.scheduleModeButton,
                      scheduleMode === 'manual' && styles.scheduleModeButtonActive
                    ]}
                    onPress={() => setScheduleMode('manual')}
                  >
                    <IconSymbol 
                      size={20} 
                      name="textformat.123"
                      color={scheduleMode === 'manual' ? '#FFFFFF' : Theme.colors.primary} 
                    />
                    <Text 
                      style={[
                        styles.scheduleModeButtonText,
                        scheduleMode === 'manual' && styles.scheduleModeButtonTextActive
                      ]}
                    >
                      {t('calendar.or_manual_hours')}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* Custom time inputs */}
                {scheduleMode === 'custom' && (
                  <>
                    <View style={styles.timeInputsContainer}>
                      <View style={styles.timeInputGroup}>
                        <Text style={styles.timeLabel}>{t('calendar.start_time')}</Text>
                        <TextInput
                          style={styles.timeInput}
                          value={startTime}
                          onChangeText={setStartTime}
                          placeholder="09:00"
                          placeholderTextColor={Theme.colors.textTertiary}
                        />
                      </View>
                      <View style={styles.timeInputGroup}>
                        <Text style={styles.timeLabel}>{t('calendar.end_time')}</Text>
                        <TextInput
                          style={styles.timeInput}
                          value={endTime}
                          onChangeText={setEndTime}
                          placeholder="17:00"
                          placeholderTextColor={Theme.colors.textTertiary}
                        />
                      </View>
                    </View>
                    
                    {/* Split shift toggle */}
                    <View style={styles.splitShiftContainer}>
                      <View style={styles.switchContent}>
                        <Text style={styles.switchLabel}>{t('calendar.split_shift')}</Text>
                        <Text style={styles.switchDescription}>{t('calendar.split_shift_desc')}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.switch, hasSplitShift && styles.switchActive]}  
                        onPress={() => setHasSplitShift(!hasSplitShift)}
                      >
                        <View style={[styles.switchThumb, hasSplitShift && styles.switchThumbActive]} />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Second shift times - only show if split shift is enabled */}
                    {hasSplitShift && (
                      <View style={styles.timeInputsContainer}>
                        <View style={styles.timeInputGroup}>
                          <Text style={styles.timeLabel}>{t('calendar.second_start_time')}</Text>
                          <TextInput
                            style={styles.timeInput}
                            value={secondStartTime}
                            onChangeText={setSecondStartTime}
                            placeholder="14:00"
                            placeholderTextColor={Theme.colors.textTertiary}
                          />
                        </View>
                        <View style={styles.timeInputGroup}>
                          <Text style={styles.timeLabel}>{t('calendar.second_end_time')}</Text>
                          <TextInput
                            style={styles.timeInput}
                            value={secondEndTime}
                            onChangeText={setSecondEndTime}
                            placeholder="18:00"
                            placeholderTextColor={Theme.colors.textTertiary}
                          />
                        </View>
                      </View>
                    )}
                  </>
                )}
              </BlurView>
            </View>
          )}

          {/* Hour selector - only for work days with manual mode */}
          {dayType === 'work' && scheduleMode === 'manual' && (
            <View style={styles.section}>
              <HourSelector
                hours={hours}
                onHoursChange={setHours}
              />
            </View>
          )}

          <View style={styles.section}>
            <BlurView intensity={95} tint="light" style={styles.notesContainer}>
              <Text style={styles.notesLabel}>{t('calendar.notes_label')}</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('calendar.notes_placeholder')}
                placeholderTextColor={Theme.colors.textTertiary}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.characterCount}>
                {t('calendar.characters_count', { count: notes.length })}
              </Text>
            </BlurView>
          </View>

          <View style={styles.section}>
            <BlurView intensity={95} tint="light" style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>{t('calendar.summary_title')}</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('calendar.summary_type')}</Text>
                <View style={styles.summaryJobInfo}>
                  <View 
                    style={[
                      styles.summaryJobColor, 
                      { backgroundColor: getDayTypes()[dayType]?.color || '#000000' }
                    ]} 
                  />
                  <Text style={styles.summaryValue}>{getDayTypes()[dayType]?.label || 'Unknown'}</Text>
                </View>
              </View>
              {dayType === 'work' && selectedJob && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('calendar.summary_job')}</Text>
                  <View style={styles.jobSummaryRow}>
                    <Text style={styles.summaryValue}>{selectedJob.name}</Text>
                    <TouchableOpacity 
                      style={styles.statsButton}
                      onPress={() => setShowStatistics(true)}
                    >
                      <IconSymbol size={16} name="chart.bar.fill" color={Theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {dayType === 'work' && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('calendar.summary_hours')}</Text>
                  <Text style={styles.summaryValue}>
                    {hours}h {hours > 8 && t('calendar.with_overtime')}
                  </Text>
                </View>
              )}
              {dayType === 'work' && scheduleMode !== 'manual' && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('calendar.schedule_mode')}</Text>
                  <Text style={styles.summaryValue}>
                    {startTime} - {endTime}
                    {hasSplitShift && ` | ${secondStartTime} - ${secondEndTime}`}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('calendar.summary_date')}</Text>
                <Text style={styles.summaryValue}>
                  {formatDate(date)}
                </Text>
              </View>
            </BlurView>
          </View>

          {dayType === 'work' && selectedJob && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.syncButton}
                onPress={handleSyncToCalendar}
              >
                <BlurView intensity={90} tint="light" style={styles.syncButtonInner}>
                  <IconSymbol size={20} name="calendar.badge.plus" color={Theme.colors.success} />
                  <Text style={styles.syncButtonText}>{t('calendar.sync_to_calendar')}</Text>
                </BlurView>
              </TouchableOpacity>
            </View>
          )}

          {existingWorkDay && onDelete && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <BlurView intensity={90} tint="light" style={styles.deleteButtonInner}>
                  <IconSymbol size={20} name="xmark" color={Theme.colors.error} />
                  <Text style={styles.deleteButtonText}>{t('calendar.delete_workday')}</Text>
                </BlurView>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      
      <JobStatisticsModal
        visible={showStatistics}
        onClose={() => setShowStatistics(false)}
        job={selectedJob || null}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.separator,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
  },
  backButton: {
    padding: Theme.spacing.sm,
    marginRight: -Theme.spacing.sm,
  },
  headerText: {
    flex: 1,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  headerTitle: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...Theme.typography.footnote,
    color: Theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  saveButton: {
    padding: 8,
    marginRight: 16,
    backgroundColor: Theme.colors.primary,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
  },
  section: {
    marginVertical: Theme.spacing.md,
  },
  notesContainer: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.medium,
  },
  notesLabel: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
  },
  notesInput: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Theme.colors.separator,
  },
  characterCount: {
    ...Theme.typography.caption2,
    color: Theme.colors.textTertiary,
    textAlign: 'right',
    marginTop: Theme.spacing.xs,
  },
  summaryContainer: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.medium,
  },
  summaryTitle: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  summaryLabel: {
    ...Theme.typography.callout,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    ...Theme.typography.callout,
    color: Theme.colors.text,
    fontWeight: '600',
  },
  summaryJobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryJobColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Theme.spacing.xs,
  },
  syncButton: {
    marginBottom: Theme.spacing.sm,
  },
  syncButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: `${Theme.colors.success}30`,
  },
  syncButtonText: {
    ...Theme.typography.callout,
    color: Theme.colors.success,
    marginLeft: Theme.spacing.sm,
    fontWeight: '600',
  },
  deleteButton: {
    marginBottom: Theme.spacing.xl,
  },
  deleteButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: `${Theme.colors.error}30`,
  },
  deleteButtonText: {
    ...Theme.typography.callout,
    color: Theme.colors.error,
    marginLeft: Theme.spacing.sm,
    fontWeight: '600',
  },
  dayTypeContainer: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.medium,
  },
  dayTypeTitle: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  dayTypeButtons: {
    gap: Theme.spacing.sm,
  },
  dayTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 2,
    borderColor: Theme.colors.separator,
  },
  dayTypeButtonActive: {
    borderColor: 'transparent',
  },
  dayTypeButtonText: {
    ...Theme.typography.callout,
    color: Theme.colors.text,
    marginLeft: Theme.spacing.sm,
    fontWeight: '600',
  },
  dayTypeButtonTextActive: {
    color: '#FFFFFF',
  },
  jobSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  statsButton: {
    padding: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  scheduleModeContainer: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.medium,
  },
  scheduleModeTitle: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  scheduleModeButtons: {
    gap: Theme.spacing.sm,
  },
  scheduleModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 2,
    borderColor: Theme.colors.separator,
  },
  scheduleModeButtonActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  scheduleModeButtonText: {
    ...Theme.typography.callout,
    color: Theme.colors.text,
    marginLeft: Theme.spacing.sm,
    fontWeight: '600',
    flex: 1,
  },
  scheduleModeButtonTextActive: {
    color: '#FFFFFF',
  },
  scheduleTimeText: {
    ...Theme.typography.caption,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  timeInputsContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.md,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeLabel: {
    ...Theme.typography.callout,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
    fontWeight: '600',
  },
  timeInput: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.separator,
    textAlign: 'center',
  },
  splitShiftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  switchContent: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  switchLabel: {
    ...Theme.typography.callout,
    color: Theme.colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  switchDescription: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.separator,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: Theme.colors.primary,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  compactJobSelector: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    ...Theme.shadows.medium,
  },
  compactJobTitle: {
    ...Theme.typography.callout,
    color: Theme.colors.text,
    fontWeight: '600',
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  jobTabsScroll: {
    marginHorizontal: -4,
  },
  jobTabs: {
    flexDirection: 'row',
    gap: Theme.spacing.xs,
    paddingHorizontal: 4,
  },
  jobTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: Theme.spacing.xs,
  },
  jobTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomWidth: 2,
  },
  jobTabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  jobTabText: {
    ...Theme.typography.footnote,
    color: Theme.colors.text,
    fontWeight: '500',
  },
  jobTabTextActive: {
    fontWeight: '600',
    color: Theme.colors.text,
  },
  singleJobDisplay: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    ...Theme.shadows.medium,
  },
  singleJobContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  singleJobText: {
    ...Theme.typography.callout,
    color: Theme.colors.text,
    fontWeight: '600',
  },
});