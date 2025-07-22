import React, { useState, useEffect, useRef } from 'react';
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Job } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import JobFormModal from '../components/JobFormModal';
import JobStatisticsModal from '../components/JobStatisticsModal';
import { useNavigation } from '../context/NavigationContext';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

// Dark mode map style
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#181818"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1b1b1b"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#2c2c2c"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8a8a8a"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#373737"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3c3c3c"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#4e4e4e"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3d3d3d"
      }
    ]
  }
];

type Props = {
  location: {
    latitude: number;
    longitude: number;
  };
  onNavigate?: (screen: string) => void;
};

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  centeredContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  mainActionCard: {
    width: 280,
    pointerEvents: 'auto',
  },
  mainActionCardInner: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  mainActionCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  mainActionIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
    shadowColor: colors.success,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  mainActionTitle: {
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  mainActionDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  mainActionBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainActionBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  infoOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    pointerEvents: 'none',
  },
  infoCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  jobButtonsOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    bottom: 120,
  },
  jobButtonsContainer: {
    gap: 12,
  },
  jobButton: {
    marginBottom: 8,
  },
  jobButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: isDark ? 0.1 : 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  jobButtonColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 16,
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
  jobButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  jobButtonActive: {
    transform: [{ scale: 1.02 }],
  },
  jobButtonContent: {
    flex: 1,
  },
  jobButtonTextActive: {
    color: colors.success,
  },
  jobStatusText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  jobsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  jobsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: colors.surface,
  },
  jobsTitle: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '600',
  },
  closeOverlayButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  jobsList: {
    maxHeight: '60%',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.surface,
  },
  jobMapCard: {
    marginBottom: 12,
  },
  jobMapCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  jobMapInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobMapActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  jobMapEditButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  jobMapColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  jobMapDetails: {
    flex: 1,
  },
  jobMapName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  jobMapCompany: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  jobMapAddress: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  actionModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  actionModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
    elevation: 999,
  },
  actionModalContent: {
    borderRadius: 28,
    margin: 20,
    padding: 24,
    backgroundColor: colors.surface,
    minWidth: 300,
    zIndex: 1001,
    elevation: 1001,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
  },
  actionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  actionModalColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  actionModalInfo: {
    flex: 1,
  },
  actionModalTitle: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionModalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionModalButtons: {
    gap: 12,
    marginBottom: 16,
  },
  actionModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionModalButtonText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '600',
    color: colors.text,
  },
  actionModalCancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  actionModalCancelText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 72,
    height: 72,
    borderRadius: 36,
    elevation: 12,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  floatingAddButtonInner: {
    flex: 1,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
    overflow: 'hidden',
  },
  fabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 36,
  },
  successIconBg: {
    backgroundColor: 'rgba(52, 199, 89, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  successButtonBg: {
    backgroundColor: 'rgba(52, 199, 89, 0.18)',
    borderColor: 'rgba(52, 199, 89, 0.25)',
  },
  primaryButtonBg: {
    backgroundColor: 'rgba(0, 122, 255, 0.18)',
    borderColor: 'rgba(0, 122, 255, 0.25)',
  },
  warningButtonBg: {
    backgroundColor: 'rgba(255, 149, 0, 0.18)',
    borderColor: 'rgba(255, 149, 0, 0.25)',
  },
  secondaryButtonBg: {
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
    borderColor: 'rgba(142, 142, 147, 0.2)',
  },
  errorButtonBg: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
});


export default function MapLocation({ location, onNavigate }: Props) {
  const { colors, isDark } = useTheme();
  const { navigateTo } = useNavigation();
  const { t } = useLanguage();
  const { triggerHaptic } = useHapticFeedback();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [showStatistics, setShowStatistics] = useState(false);
  const [selectedJobForStats, setSelectedJobForStats] = useState<Job | null>(null);
  const [activeTimerJobId, setActiveTimerJobId] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  
  const styles = getStyles(colors, isDark);

  useEffect(() => {
    loadJobs();
    checkActiveTimer();
    
    // Check active timer every 30 seconds
    const interval = setInterval(checkActiveTimer, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    try {
      const loadedJobs = await JobService.getJobs();
      setJobs(loadedJobs.filter(job => job.isActive));
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const checkActiveTimer = async () => {
    try {
      const activeSession = await JobService.getActiveSession();
      setActiveTimerJobId(activeSession?.jobId || null);
    } catch (error) {
      console.error('Error checking active timer:', error);
    }
  };

  const isJobCurrentlyActive = (job: Job): boolean => {
    return activeTimerJobId === job.id;
  };

  const getJobScheduleStatus = (job: Job): string | null => {
    if (!job.schedule || !job.schedule.workDays?.length) return null;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const workDays = job.schedule.workDays;
    const startTime = job.schedule.startTime;
    const endTime = job.schedule.endTime;
    const secondStartTime = job.schedule.secondStartTime;
    const secondEndTime = job.schedule.secondEndTime;

    // Check if currently in work hours (don't show next shift if currently working)
    if (workDays.includes(currentDay)) {
      if (startTime && endTime && isTimeInRange(currentTime, startTime, endTime)) {
        return null; // Currently should be working
      }
      if (job.schedule.hasSplitShift && secondStartTime && secondEndTime && 
          isTimeInRange(currentTime, secondStartTime, secondEndTime)) {
        return null; // Currently should be working (second shift)
      }
    }

    // Find the next work shift (could be today or future days)
    const nextShift = findNextWorkShift(workDays, startTime, secondStartTime, job.schedule.hasSplitShift);
    
    if (nextShift) {
      if (nextShift.isToday) {
        return `${t('maps.next_shift')} ${nextShift.time}`;
      } else {
        return `${t('maps.next_shift')} ${getDayName(nextShift.day)} ${nextShift.time}`;
      }
    }

    return null;
  };

  const isTimeInRange = (currentTime: string, startTime: string, endTime: string): boolean => {
    return currentTime >= startTime && currentTime <= endTime;
  };

  const findNextWorkShift = (workDays: number[], startTime?: string, secondStartTime?: string, hasSplitShift?: boolean): {
    day: number;
    time: string;
    isToday: boolean;
  } | null => {
    const now = new Date();
    const today = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);
    
    // First, check if there are upcoming shifts TODAY
    if (workDays.includes(today)) {
      // Check main shift
      if (startTime && currentTime < startTime) {
        return {
          day: today,
          time: startTime,
          isToday: true
        };
      }
      
      // Check second shift (if split shift is enabled)
      if (hasSplitShift && secondStartTime && currentTime < secondStartTime) {
        return {
          day: today,
          time: secondStartTime,
          isToday: true
        };
      }
    }
    
    // Find next work day (tomorrow onwards)
    for (let i = 1; i <= 7; i++) {
      const nextDay = (today + i) % 7;
      if (workDays.includes(nextDay)) {
        // Return the main start time for the next work day
        const nextTime = startTime || '09:00';
        return {
          day: nextDay,
          time: nextTime,
          isToday: false
        };
      }
    }
    
    return null;
  };

  const findNextWorkDay = (workDays: number[]): number | null => {
    const today = new Date().getDay();
    
    // Find next work day in the same week
    for (let i = 1; i <= 7; i++) {
      const nextDay = (today + i) % 7;
      if (workDays.includes(nextDay)) {
        return nextDay;
      }
    }
    return null;
  };

  const getDayName = (dayNumber: number): string => {
    const days = t('maps.days') as unknown as string[];
    return days[dayNumber] || '';
  };


  const handleAddJob = () => {
    setEditingJob(null);
    setShowJobForm(true);
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setShowJobForm(true);
    setSelectedJob(null);
  };

  const handleJobAction = (job: Job, action: 'timer' | 'calendar' | 'edit' | 'statistics' | 'delete') => {
    if (action === 'statistics') {
      setSelectedJobForStats(job);
      setShowStatistics(true);
      setSelectedJob(null);
      return;
    }

    if (action === 'delete') {
      if (!job) {
        Alert.alert(t('maps.error'), t('maps.no_job_selected'));
        return;
      }
      
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
                setSelectedJob(null);
                Alert.alert(t('maps.success'), t('maps.delete_success'));
              } catch (error) {
                console.error('Error deleting job:', error);
                Alert.alert('Error', t('maps.delete_error'));
              }
            },
          },
        ]
      );
      return;
    }
    
    switch (action) {
      case 'timer':
        setSelectedJob(null);
        navigateTo('timer', job);
        break;
      case 'calendar':
        navigateTo('calendar', job);
        setSelectedJob(null);
        break;
      case 'edit':
        setSelectedJob(null);
        handleEditJob(job);
        break;
    }
  };

  const handleJobFormSave = async () => {
    await loadJobs();
    setShowJobForm(false);
    setEditingJob(null);
  };

  const handleJobPress = (job: Job) => {
    // Navigate to job location if it has coordinates
    if (job.location?.latitude && job.location?.longitude && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: job.location.latitude,
        longitude: job.location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
    
    // Open action modal
    setSelectedJob(job);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        customMapStyle={isDark ? darkMapStyle : undefined}
      >
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          title={t('maps.you_are_here')}
          pinColor={colors.primary}
        />
        
        {/* Job location markers */}
        {jobs.map((job) => 
          job.location?.latitude && job.location?.longitude ? (
            <Marker
              key={job.id}
              coordinate={{
                latitude: job.location.latitude,
                longitude: job.location.longitude,
              }}
              title={job.name}
              description={job.location.address}
              pinColor={job.color}
              onPress={() => handleJobPress(job)}
            />
          ) : null
        )}
        
      </MapView>

      {/* Simple info overlay */}
      {jobs.length === 0 && (
        <View style={styles.overlay}>
          <View style={styles.centeredContent}>
            <TouchableOpacity
              style={styles.mainActionCard}
              onPress={handleAddJob}
            >
              <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.mainActionCardInner}>
                <View style={[styles.mainActionIcon, styles.successIconBg]}>
                  <IconSymbol size={36} name="plus" color={colors.success} />
                </View>
                <Text style={styles.mainActionTitle}>{t('maps.add_job')}</Text>
                <Text style={styles.mainActionDescription}>
                  {t('maps.add_job_desc')}
                </Text>
              </BlurView>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Job buttons overlay */}
      {jobs.length > 0 && (
        <View style={styles.jobButtonsOverlay}>
          <View style={styles.jobButtonsContainer}>
            {jobs.map((job) => {
              const isActive = isJobCurrentlyActive(job);
              const scheduleStatus = getJobScheduleStatus(job);
              
              return (
                <TouchableOpacity
                  key={job.id}
                  style={[styles.jobButton, isActive && styles.jobButtonActive]}
                  onPress={() => handleJobPress(job)}
                >
                  <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.jobButtonInner}>
                    <View style={[styles.jobButtonColorDot, { backgroundColor: job.color }]} />
                    <View style={styles.jobButtonContent}>
                      <Text style={[styles.jobButtonText, isActive && styles.jobButtonTextActive]} numberOfLines={1}>
                        {job.name}
                      </Text>
                      {isActive && (
                        <Text style={styles.jobStatusText}>
                          {t('maps.working_now')}
                        </Text>
                      )}
                      {!isActive && scheduleStatus && (
                        <Text style={styles.jobStatusText}>
                          {scheduleStatus}
                        </Text>
                      )}
                    </View>
                    <IconSymbol size={18} name="chevron.right" color={colors.textSecondary} />
                  </BlurView>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Job action modal */}
      <Modal
        visible={selectedJob !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedJob(null)}
      >
        <View style={styles.actionModal}>
          <TouchableOpacity 
            style={styles.actionModalBackdrop}
            onPress={() => setSelectedJob(null)}
          />
          <BlurView intensity={98} tint={isDark ? "dark" : "light"} style={styles.actionModalContent}>
            {selectedJob && (
              <>
                <View style={styles.actionModalHeader}>
                  <View style={[styles.actionModalColorDot, { backgroundColor: selectedJob.color }]} />
                  <View style={styles.actionModalInfo}>
                    <Text style={styles.actionModalTitle}>{selectedJob.name}</Text>
                    {selectedJob.company && (
                      <Text style={styles.actionModalSubtitle}>{selectedJob.company}</Text>
                    )}
                  </View>
                </View>

            <View style={styles.actionModalButtons}>
              <TouchableOpacity
                style={[styles.actionModalButton, styles.successButtonBg]}
                onPress={() => handleJobAction(selectedJob, 'timer')}
              >
                <IconSymbol size={24} name="clock.fill" color={colors.success} />
                <Text style={styles.actionModalButtonText}>
                  {t('maps.start_timer')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionModalButton, styles.primaryButtonBg]}
                onPress={() => handleJobAction(selectedJob, 'calendar')}
              >
                <IconSymbol size={24} name="calendar" color={colors.primary} />
                <Text style={styles.actionModalButtonText}>
                  {t('maps.view_calendar')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionModalButton, styles.warningButtonBg]}
                onPress={() => handleJobAction(selectedJob, 'statistics')}
              >
                <IconSymbol size={24} name="chart.bar.fill" color={colors.warning} />
                <Text style={styles.actionModalButtonText}>
                  {t('maps.view_statistics')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionModalButton, styles.secondaryButtonBg]}
                onPress={() => handleJobAction(selectedJob, 'edit')}
              >
                <IconSymbol size={24} name="gear" color={colors.textSecondary} />
                <Text style={styles.actionModalButtonText}>
                  {t('maps.edit_job')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionModalButton, styles.errorButtonBg]}
                onPress={() => handleJobAction(selectedJob, 'delete')}
              >
                <IconSymbol size={24} name="trash.fill" color={colors.error} />
                <Text style={styles.actionModalButtonText}>
                  {t('maps.delete_job')}
                </Text>
              </TouchableOpacity>
            </View>

                <TouchableOpacity
                  style={styles.actionModalCancelButton}
                  onPress={() => setSelectedJob(null)}
                >
                  <Text style={styles.actionModalCancelText}>{t('maps.cancel')}</Text>
                </TouchableOpacity>
              </>
            )}
          </BlurView>
        </View>
      </Modal>

      {/* Floating Add Button - Only show when jobs exist */}
      {jobs.length > 0 && (
        <TouchableOpacity style={styles.floatingAddButton} onPress={() => { triggerHaptic('light'); handleAddJob(); }}>
          <View style={styles.floatingAddButtonInner}>
            <LinearGradient
              colors={['#007AFF', '#0056CC', '#003D99']}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <IconSymbol size={32} name="plus" color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      )}

      {/* Job Form Modal */}
      <JobFormModal
        visible={showJobForm}
        editingJob={editingJob}
        onClose={() => {
          setShowJobForm(false);
          setEditingJob(null);
        }}
        onSave={handleJobFormSave}
        onNavigateToCalendar={() => onNavigate?.('calendar')}
      />
      
      {/* Job Statistics Modal */}
      <JobStatisticsModal
        visible={showStatistics}
        onClose={() => {
          setShowStatistics(false);
          setSelectedJobForStats(null);
        }}
        job={selectedJobForStats}
      />
    </View>
  );
}

