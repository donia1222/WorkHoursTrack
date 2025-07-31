import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { Job } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import JobFormModal from '../components/JobFormModal';
import JobActionModal from '../components/JobActionModal';
import { JobCardsSwiper } from '../components/JobCardsSwiperNoslocation';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  onNavigate?: (screen: string, options?: any) => void;
}

export default function NoLocationMapView({ onNavigate }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showJobCardsModal, setShowJobCardsModal] = useState(false);
  const [wasJobCardsModalOpen, setWasJobCardsModalOpen] = useState(false);
  const [miniCalendarData, setMiniCalendarData] = useState<any[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const button1Opacity = React.useRef(new Animated.Value(1)).current; // Ver trabajos
  const button2Opacity = React.useRef(new Animated.Value(1)).current; // Estadísticas  
  const button3Opacity = React.useRef(new Animated.Value(1)).current; // Chat IA

  // Debug state changes
  React.useEffect(() => {
    console.log('🔴 NoLocationMapView: showActionModal changed to:', showActionModal, 'selectedJob:', selectedJob?.name);
  }, [showActionModal, selectedJob]);
  
  React.useEffect(() => {
    console.log('🟡 NoLocationMapView: showJobForm changed to:', showJobForm, 'editingJob:', editingJob?.name);
  }, [showJobForm, editingJob]);
  
  React.useEffect(() => {
    console.log('🟢 NoLocationMapView: showJobCardsModal changed to:', showJobCardsModal);
  }, [showJobCardsModal]);
  const [jobStatistics, setJobStatistics] = useState<Map<string, { thisMonthHours: number; thisMonthDays: number }>>(new Map());

  // Animación escalonada de opacidad para los botones
  React.useEffect(() => {
    if (showJobCardsModal) {
      // Cuando se abre el modal, ocultar todos los botones rápidamente
      Animated.parallel([
        Animated.timing(button1Opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(button2Opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(button3Opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      // Cuando se cierra el modal, mostrar botones uno por uno con retraso
      Animated.sequence([
        Animated.timing(button1Opacity, { 
          toValue: 1, 
          duration: 400, 
          useNativeDriver: true 
        }),
        Animated.timing(button2Opacity, { 
          toValue: 1, 
          duration: 400, 
          useNativeDriver: true 
        }),
        Animated.timing(button3Opacity, { 
          toValue: 1, 
          duration: 400, 
          useNativeDriver: true 
        }),
      ]).start();
    }
  }, [showJobCardsModal]);

  useEffect(() => {
    loadJobs();
    loadJobStatistics();
    loadMiniCalendarData();
  }, []);

  useEffect(() => {
    loadMiniCalendarData();
  }, [currentWeekStart, jobs]);

  const loadMiniCalendarData = async () => {
    try {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      
      // Get work days for current month and adjacent months to handle cross-month weeks
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      
      const [currentMonthWorkDays, prevMonthWorkDays, nextMonthWorkDays] = await Promise.all([
        JobService.getWorkDaysForMonth(currentYear, currentMonth),
        JobService.getWorkDaysForMonth(prevYear, prevMonth),
        JobService.getWorkDaysForMonth(nextYear, nextMonth)
      ]);
      
      const allWorkDays = [...prevMonthWorkDays, ...currentMonthWorkDays, ...nextMonthWorkDays];
      
      // Create array of 7 days for the current week (Monday to Sunday)
      const calendarDays = [];
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(currentWeekStart);
        dayDate.setDate(currentWeekStart.getDate() + i);
        
        const dateStr = `${dayDate.getFullYear()}-${(dayDate.getMonth() + 1).toString().padStart(2, '0')}-${dayDate.getDate().toString().padStart(2, '0')}`;
        
        // Find work day for this date
        const workDay = allWorkDays.find(wd => wd.date === dateStr);
        const job = workDay ? jobs.find(j => j.id === workDay.jobId) : null;
        
        const isToday = dayDate.toDateString() === today.toDateString();
        
        if (workDay) {
          console.log('📅 NoLocationMapView workDay found:', dateStr, 'type:', workDay.type, 'job:', job?.name);
        }
        
        calendarDays.push({
          date: dayDate,
          day: dayDate.getDate(),
          isToday,
          workDay,
          job,
          dayOfWeek: i // 0 = Monday, 6 = Sunday
        });
      }
      
      setMiniCalendarData(calendarDays);
    } catch (error) {
      console.error('Error loading mini calendar data:', error);
    }
  };

  const loadJobStatistics = async () => {
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const workDays = await JobService.getWorkDaysForMonth(year, month);
      
      const statsMap = new Map();
      
      for (const job of jobs) {
        const jobWorkDays = workDays.filter(wd => wd.jobId === job.id);
        const thisMonthHours = jobWorkDays.reduce((total, wd) => total + (wd.hours || 0), 0);
        const thisMonthDays = jobWorkDays.length;
        
        statsMap.set(job.id, { thisMonthHours, thisMonthDays });
      }
      
      setJobStatistics(statsMap);
    } catch (error) {
      console.error('Error loading job statistics:', error);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    const offset = direction === 'next' ? 7 : -7;
    newWeekStart.setDate(currentWeekStart.getDate() + offset);
    setCurrentWeekStart(newWeekStart);
  };

  const loadJobs = async () => {
    try {
      const jobsData = await JobService.getJobs();
      console.log('📋 NoLocationMapView: Loaded jobs:', jobsData);
      
      // Filter out any invalid jobs (jobs without required fields)
      const validJobs = jobsData.filter(job => 
        job && 
        job.id && 
        job.name && 
        job.name.trim() !== ''
      );
      
      console.log('📋 NoLocationMapView: Valid jobs after filtering:', validJobs);
      setJobs(validJobs);
      // Recargar datos del calendario miniatura cuando cambien los trabajos
      setTimeout(() => loadMiniCalendarData(), 100);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const handleSaveJob = async (jobData: any) => {
    try {
      console.log('💾 NoLocationMapView: Saving job data:', jobData);
      console.log('💾 NoLocationMapView: Is editing?', !!editingJob);
      
      const wasEditing = !!editingJob;
      
      if (editingJob) {
        console.log('💾 NoLocationMapView: Updating job:', editingJob.id);
        await JobService.updateJob(editingJob.id, jobData);
      } else {
        console.log('💾 NoLocationMapView: Adding new job');
        const newJob = await JobService.addJob(jobData);
        console.log('💾 NoLocationMapView: New job created:', newJob);
      }
      setShowJobForm(false);
      setEditingJob(null);
      await loadJobs();
      await loadJobStatistics();
      
      // If we were editing a job and the modal was open, reopen it
      if (wasEditing && wasJobCardsModalOpen) {
        setTimeout(() => {
          setShowJobCardsModal(true);
          setWasJobCardsModalOpen(false);
        }, 100);
      }
    } catch (error) {
      console.error('Error saving job:', error);
      Alert.alert('Error', 'No se pudo guardar el trabajo');
    }
  };

  const handleEditJob = (job: Job) => {
    console.log('🟡 NoLocationMapView: handleEditJob called for job:', job.name);
    console.log('🟡 NoLocationMapView: showJobCardsModal was:', showJobCardsModal);
    
    setEditingJob(job);
    setShowJobForm(true);
    // Remember if job cards modal was open and close it
    setWasJobCardsModalOpen(showJobCardsModal);
    setShowJobCardsModal(false);
    
    console.log('🟡 NoLocationMapView: States after handleEditJob - showJobForm: true, showJobCardsModal: false');
  };

  const handleDeleteJob = async (job: Job) => {
    Alert.alert(
      t('maps.delete_confirm_title'),
      t('maps.delete_confirm_message', { jobName: job.name }),
      [
        { text: t('maps.cancel'), style: 'cancel' },
        {
          text: t('maps.delete_confirm_button'),
          style: 'destructive',
          onPress: async () => {
            try {
              await JobService.deleteJob(job.id);
              await loadJobs();
              await loadJobStatistics();
            } catch (error) {
              console.error('Error deleting job:', error);
              Alert.alert('Error', t('maps.delete_error'));
            }
          },
        },
      ]
    );
  };

  // Functions for JobCardsSwiper

  const isJobCurrentlyActive = (_job: Job) => {
    // In no-location mode, no jobs are currently active
    return false;
  };

  const getJobScheduleStatus = (_job: Job) => {
    // In no-location mode, return null since we don't have location-based status
    return null;
  };

  const getJobStatistics = (job: Job) => {
    return jobStatistics.get(job.id) || { thisMonthHours: 0, thisMonthDays: 0 };
  };

  const hasJobAddress = (job: Job) => {
    return !!(job.address?.trim() || 
              job.street?.trim() || 
              job.city?.trim() || 
              job.postalCode?.trim());
  };

  const handleAutoTimerToggle = async (job: Job, value: boolean) => {
    try {
      const updatedJob = {
        ...job,
        autoTimer: {
          ...job.autoTimer,
          enabled: value,
          geofenceRadius: job.autoTimer?.geofenceRadius || 100,
          delayStart: job.autoTimer?.delayStart || 2,
          delayStop: job.autoTimer?.delayStop || 2,
          notifications: job.autoTimer?.notifications !== false,
        }
      };

      await JobService.updateJob(job.id, updatedJob);
      await loadJobs();
      await loadJobStatistics();
      
    } catch (error) {
      console.error('Error updating auto-timer:', error);
      Alert.alert(
        'Error',
        'No se pudo actualizar la configuración del timer automático.'
      );
    }
  };

  const handleModalAction = (action: string) => {
    setShowActionModal(false);
    
    switch (action) {
      case 'timer':
        onNavigate?.('timer');
        break;
      case 'calendar':
        onNavigate?.('calendar');
        break;
      case 'statistics':
        onNavigate?.('reports');
        break;
      case 'map':
        // En modo sin ubicación, no hay mapa para navegar
        console.log('Map action not available in no-location mode');
        break;
      case 'edit':
        if (selectedJob) {
          handleEditJob(selectedJob);
        }
        break;
      case 'delete':
        if (selectedJob) {
          handleDeleteJob(selectedJob);
        }
        break;
    }
    
    setSelectedJob(null);
  };

  const handleCloseModal = () => {
    setShowActionModal(false);
    setSelectedJob(null);
  };

  const styles = getStyles(colors, isDark);

  return (
    <View style={styles.container}>
      {/* Beautiful gradient background */}
      <LinearGradient
        colors={isDark 
          ? ['#2c3e50', '#34495e', '#4a6741', '#5d6d7e'] 
          : ['#f8faff', '#e3f2fd', '#81c7f5', '#4a90e2']
        }
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Subtle overlay pattern */}
      <View style={styles.backgroundOverlay} />
      
                  <BlurView intensity={85} tint={isDark ? "dark" : "light"} style={styles.infoCardInner}>

            <View style={styles.infoContent}>
              <View style={styles.infoIconContainer}>
                <IconSymbol size={20} name="info.circle" color={colors.primary} />
              </View>
              <Text style={styles.infoText}>
                {jobs.length === 0 ? t('maps.add_job_desc') : 'Modo sin ubicación - funcionalidad limitada'}
              </Text>
            </View>
            
          </BlurView>
 

      {/* Quick Access Section */}
      <View style={styles.quickAccessSection}>
        
        {/* Mini Calendar - Siempre visible */}
        <GestureDetector gesture={Gesture.Pan()
          .onEnd((event) => {
            const { velocityX } = event;
            if (Math.abs(velocityX) > 500) {
              if (velocityX > 0) {
                runOnJS(navigateWeek)('prev');
              } else {
                runOnJS(navigateWeek)('next');
              }
            }
          })}>
          <View style={styles.miniCalendarContainer}>
            <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={styles.miniCalendarBlur}>
            <View style={styles.miniCalendarHeader}>
              <TouchableOpacity onPress={() => navigateWeek('prev')} style={styles.miniCalendarArrow}>
                <IconSymbol size={16} name="chevron.left" color={colors.primary} />
              </TouchableOpacity>
              <View style={styles.miniCalendarTitleContainer}>
                <IconSymbol size={16} name="calendar" color={colors.primary} />
                <Text style={styles.miniCalendarTitle}>{t('calendar.title')}</Text>
              </View>
              <TouchableOpacity onPress={() => navigateWeek('next')} style={styles.miniCalendarArrow}>
                <IconSymbol size={16} name="chevron.right" color={colors.primary} />
              </TouchableOpacity>
            </View>
            
            {/* Day labels */}
            <View style={styles.miniCalendarDayLabels}>
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day, index) => (
                <Text key={index} style={styles.miniCalendarDayLabel}>
                  {t(`calendar.days_short.${day}`)}
                </Text>
              ))}
            </View>
            
            <View style={styles.miniCalendarGrid}>
              {miniCalendarData.map((dayData, i) => {
                // Determinar color del badge basado en el tipo de día de trabajo
                let badgeColor = null;
                let badgeText = '';
                let timeText = '';
                
                if (dayData.workDay) {
                  console.log('📅 Badge rendering for day', dayData.day, 'type:', dayData.workDay.type);
                  switch (dayData.workDay.type) {
                    case 'work':
                      badgeColor = '#10B981'; // Verde para días de trabajo
                      badgeText = 'W';
                      // Mostrar horario si existe
                      if (dayData.workDay.startTime && dayData.workDay.endTime) {
                        timeText = `${dayData.workDay.startTime}\n${dayData.workDay.endTime}`;
                        // Si hay turno partido, agregar segundo horario
                        if (dayData.workDay.secondStartTime && dayData.workDay.secondEndTime) {
                          timeText += `\n${dayData.workDay.secondStartTime}\n${dayData.workDay.secondEndTime}`;
                        }
                      }
                      break;
                    case 'free':
                      badgeColor = '#3B82F6'; // Azul para días libres
                      badgeText = 'F';
                      break;
                    case 'vacation':
                      badgeColor = '#F59E0B'; // Amarillo para vacaciones
                      badgeText = 'V';
                      break;
                    case 'sick':
                      badgeColor = '#EF4444'; // Rojo para enfermedad
                      badgeText = 'S';
                      break;
                    default:
                      console.log('⚠️ Unknown workDay type:', dayData.workDay.type);
                      break;
                  }
                }
                
                return (
                  <View key={i} style={[
                    styles.miniCalendarDay,
                    dayData.isToday && styles.miniCalendarDayToday
                  ]}>
                    <Text style={[
                      styles.miniCalendarDayText, 
                      { 
                        color: dayData.isToday ? colors.primary : colors.textSecondary,
                        fontWeight: dayData.isToday ? '700' : '500'
                      }
                    ]}>
                      {dayData.day}
                    </Text>
                    {badgeColor && (
                      <View style={{ alignItems: 'center' }}>
                        <View style={[styles.miniCalendarBadge, { backgroundColor: badgeColor }]}>
                          <Text style={styles.miniCalendarBadgeText}>{badgeText}</Text>
                        </View>
                        {timeText && (
                          <Text style={styles.miniCalendarTimeText}>
                            {timeText}
                          </Text>
                        )}
                      </View>
                    )}
                    {dayData.isToday && !badgeColor && (
                      <View style={[styles.miniCalendarDot, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                );
              })}
            </View>
            <TouchableOpacity 
              style={styles.miniCalendarButton}
              onPress={() => onNavigate?.('calendar')}
              activeOpacity={0.8}
            >
              <Text style={styles.miniCalendarButtonText}>{t('maps.view_calendar')}</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
        </GestureDetector>

        {/* Ver Trabajos Button - Solo mostrar si hay trabajos */}
        {jobs.length > 0 && (
          <Animated.View style={{ opacity: button1Opacity }}>
            <TouchableOpacity
              style={styles.viewJobsButton}
              onPress={() => setShowJobCardsModal(true)}
              activeOpacity={0.8}
              disabled={showJobCardsModal}
            >
            <LinearGradient
              colors={[colors.primary + '40', colors.primary + '20', colors.primary + '10']}
              style={styles.viewJobsButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.viewJobsButtonContent}>
                <View style={styles.viewJobsIcon}>
                  <IconSymbol size={24} name="list.bullet" color={colors.primary} />
                </View>
                <View style={styles.viewJobsTextContainer}>
                  <Text style={styles.viewJobsButtonTitle}>Ver trabajos ({jobs.length})</Text>
                  <Text style={styles.viewJobsButtonSubtitle}>Gestionar tus trabajos</Text>
                </View>
                <IconSymbol size={16} name="chevron.right" color={colors.primary} />
              </View>
            </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Chat IA Button */}
        <Animated.View style={{ opacity: button2Opacity }}>
          <TouchableOpacity
            style={styles.chatIAButton}
            onPress={() => onNavigate?.('chatbot')}
            activeOpacity={0.8}
            disabled={showJobCardsModal}
          >
          <LinearGradient
            colors={[colors.primary, '#4A90E2', '#81C7F5']}
            style={styles.chatIAButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.chatIAButtonContent}>
              <View style={styles.chatIAIcon}>
                <IconSymbol size={24} name="brain.head.profile" color="#FFFFFF" />
              </View>
              <View style={styles.chatIATextContainer}>
                <Text style={styles.chatIAButtonTitle}>{t('side_menu.menu_items.chatbot.title')}</Text>
                <Text style={styles.chatIAButtonSubtitle}>{t('side_menu.menu_items.chatbot.description')}</Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color="#FFFFFF" />
            </View>
          </LinearGradient>
          </TouchableOpacity>
        </Animated.View>


        {/* Estadísticas Button */}
        <Animated.View style={{ opacity: button3Opacity }}>
          <TouchableOpacity
            style={styles.statsButton}
            onPress={() => onNavigate?.('reports')}
            activeOpacity={0.8}
            disabled={showJobCardsModal}
          >
          <LinearGradient
            colors={['#1E3A8A', '#1E40AF', '#3B82F6']}
            style={styles.statsButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            
            <View style={styles.statsButtonContent}>
              <View style={styles.statsIcon}>
                <IconSymbol size={24} name="chart.bar.fill" color="#FFFFFF" />
              </View>
              <View style={styles.statsTextContainer}>
                <Text style={styles.statsButtonTitle}>Estadísticas</Text>
                <Text style={styles.statsButtonSubtitle}>Ver reportes y métricas</Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color="#FFFFFF" />
            </View>
          </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>



      {/* Job Cards or Empty State */}
      {jobs.length === 0 ? (
        // No jobs state with enhanced design
        <View style={styles.emptyState}>
  

      
             
              <Text style={styles.emptyTitle}>{t('maps.add_job')}</Text>
              <Text style={styles.emptySubtitle}>{t('maps.add_job_desc')}</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowJobForm(true)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primary + 'DD']}
                  style={styles.addButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <IconSymbol size={20} name="plus" color="#FFFFFF" />
                  <Text style={styles.addButtonText}>{t('maps.add_job')}</Text>
                </LinearGradient>
              </TouchableOpacity>
      
    
        </View>
      ) : (
        // Job Cards Swiper


        <JobCardsSwiper
          jobs={jobs}
          visible={showJobCardsModal}
          onClose={() => setShowJobCardsModal(false)}
          isJobCurrentlyActive={isJobCurrentlyActive}
          getJobScheduleStatus={getJobScheduleStatus}
          getJobStatistics={getJobStatistics}
          onAction={(action, job) => {
            console.log('🔴 NoLocationMapView: onAction called with:', { action, jobName: job.name });
            switch (action) {
              case 'edit':
                handleEditJob(job);
                break;
              case 'timer':
                onNavigate?.('timer');
                break;
              case 'calendar':
                onNavigate?.('calendar');
                break;
              case 'statistics':
                onNavigate?.('reports');
                break;
              default:
                console.log('🔴 NoLocationMapView: Unknown action:', action);
                break;
            }
          }}
          showAutoTimer={true}
          autoTimerEnabled={false}
          onAutoTimerToggle={handleAutoTimerToggle}
          onNavigateToSubscription={() => onNavigate?.('subscription')}
          t={t}
        />
      )}



      {/* Job form modal - Only render when needed */}
      {showJobForm && (
        <JobFormModal
          visible={showJobForm}
          onClose={() => {
            console.log('🟡 NoLocationMapView: JobFormModal closing');
            setShowJobForm(false);
            setEditingJob(null);
            // If the modal was open before editing, reopen it
            if (wasJobCardsModalOpen) {
              setTimeout(() => {
                setShowJobCardsModal(true);
                setWasJobCardsModalOpen(false);
              }, 100);
            }
          }}
          onSave={handleSaveJob}
          editingJob={editingJob}
          isLocationEnabled={false}
          onNavigateToSubscription={() => onNavigate?.('subscription')}
        />
      )}

      {/* Action Modal - Only render when needed */}
      {showActionModal && selectedJob && (
        <JobActionModal
          visible={showActionModal}
          job={selectedJob}
          onClose={handleCloseModal}
          onAction={handleModalAction}
          showAutoTimer={hasJobAddress(selectedJob)}
          autoTimerEnabled={selectedJob?.autoTimer?.enabled || false}
          onAutoTimerToggle={(value) => handleAutoTimerToggle(selectedJob, value)}
        />
      )}
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
   
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

  },
  backgroundOverlay: {

    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.8,
  },
  headerInfo: {
    padding: 16,
  },
  infoCard: {
    borderRadius: 20,
 
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  infoCardInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,

  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    
    
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 38,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  showJobsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  showJobsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  quickAccessSection: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 20,
    gap: 16,
    marginTop: -10,
  },
  miniCalendarContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  miniCalendarBlur: {
    padding: 16,
  },
  miniCalendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  miniCalendarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniCalendarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  miniCalendarArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
  },
  miniCalendarDayLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  miniCalendarDayLabel: {
    width: '13.5%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    opacity: 0.7,
  },
  miniCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  miniCalendarDay: {
    width: '13.5%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 12,
    position: 'relative',
    marginBottom: 6,
    paddingTop: 4,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
  },
  miniCalendarDayToday: {
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  miniCalendarDayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  miniCalendarDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  miniCalendarBadge: {
    width: 14,
    height: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  miniCalendarBadgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '700',
  },
  miniCalendarTimeText: {
    fontSize: 6,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 1,
    lineHeight: 7,
    opacity: 0.8,
    maxWidth: '100%',
  },
  miniCalendarButton: {
    backgroundColor: colors.primary + '20',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  miniCalendarButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  chatIAButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  chatIAButtonGradient: {
    padding: 18,
  },
  chatIAButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatIAIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatIATextContainer: {
    flex: 1,
  },
  chatIAButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  chatIAButtonSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  viewJobsButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  viewJobsButtonGradient: {
    padding: 18,
  },
  viewJobsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewJobsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  viewJobsTextContainer: {
    flex: 1,
  },
  viewJobsButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  viewJobsButtonSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statsButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  statsButtonGradient: {
    padding: 18,
  },
  statsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsTextContainer: {
    flex: 1,
  },
  statsButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statsButtonSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 200, // Space for job cards
  },
  addJobSection: {
    paddingTop: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  
  },
  emptyCard: {
    borderRadius: 32,
   
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    maxWidth: 320,
    width: '100%',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    
  },
  emptyCardInner: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 32,
  },
  emptyIconContainer: {
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  emptyIconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  addButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  jobsSection: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
    marginTop: 12,
    textAlign: 'center',
    textShadowColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  jobDetails: {
    flex: 1,
  },
  jobName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  jobCompany: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  jobAddress: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  jobActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  addJobButton: {
    marginBottom: 24,
  },
  addJobCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
  },
  addJobCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 10,
    borderRadius: 20,
  },
  addJobIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addJobText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  quickActions: {
    paddingBottom: 32,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '47%',
    marginBottom: 4,
  },
  quickActionCard: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  quickActionCardInner: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
    borderRadius: 24,
  },
  quickActionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  quickActionText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});