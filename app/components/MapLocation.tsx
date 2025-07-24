import React, { useState, useEffect, useRef } from 'react';
import MapView, { Marker, Circle } from 'react-native-maps';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Modal, Dimensions, Switch } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
import AutoTimerService, { AutoTimerStatus } from '../services/AutoTimerService';

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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
    fontWeight: '600',
    color: colors.text,
  },
  actionModalButtonTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  autoTimerSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  autoTimerSwitchLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  autoTimerSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
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
  autoTimerStatusOverlay: {
    position: 'absolute',
    bottom: 140,
    left: 16,
    zIndex: 1000,
    width: screenWidth - 32, // Ancho fijo para que sea consistente
  },
  disableButton: {
    width: 32,
    height: 32,
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  autoTimerStatusCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  autoTimerStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  autoTimerStatusTitle: {
    ...Theme.typography.headline,
    color: colors.text,
    fontWeight: '600',
  },
  autoTimerJobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
    flex: 1,
    minWidth: 0, // Ensure proper flex behavior
  },
  autoTimerJobDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  autoTimerJobName: {
    ...Theme.typography.footnote,
    color: colors.text,
    flex: 1,
    fontWeight: '500',
    minWidth: 0, // Allow text to shrink properly
    flexShrink: 1, // Allow text to shrink
    textAlign: 'left',
  },
  autoTimerJobStatus: {
    ...Theme.typography.caption2,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  autoTimerProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  autoTimerProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  autoTimerProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  autoTimerCountdown: {
    ...Theme.typography.caption2,
    color: colors.textSecondary,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  activeTimerText: {
    ...Theme.typography.caption2,
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
    marginTop: 4,
  },
  minimizedAutoTimer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
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
  const [autoTimerStatus, setAutoTimerStatus] = useState<AutoTimerStatus | null>(null);
  const [autoTimerService] = useState(() => AutoTimerService.getInstance());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isAutoTimerMinimized, setIsAutoTimerMinimized] = useState(false);
  const mapRef = useRef<MapView>(null);
  
  // Posiciones de arrastre para AutoTimer
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  
  // Animaciones para minimizar/maximizar
  const scaleValue = useSharedValue(1);
  const pulseAnimation = useSharedValue(1);
  
  const styles = getStyles(colors, isDark);

  // Gestión del arrastre para AutoTimer (funciona para ambos estados)
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newX = event.translationX;
      const newY = event.translationY;
      
      if (isAutoTimerMinimized) {
        // Límites para el icono minimizado (más pequeño)
        const maxX = screenWidth - 90; // Ancho del icono minimizado
        const maxY = screenHeight - 90; // Alto del icono minimizado
        
        translateX.value = Math.max(-screenWidth/2 + 45, Math.min(screenWidth/2 - 45, newX));
        translateY.value = Math.max(-screenHeight/2 + 90, Math.min(screenHeight/2 - 90, newY));
      } else {
        // Límites para el componente expandido
        const maxX = screenWidth - 200; // Ancho estimado del componente
        const maxY = screenHeight - 200; // Alto estimado del componente
        
        translateX.value = Math.max(-150, Math.min(maxX - 150, newX));
        translateY.value = Math.max(-100, Math.min(maxY - 200, newY));
      }
    })
    .onEnd(() => {
      // Efecto de rebote suave al finalizar (para ambos estados)
      translateX.value = withSpring(translateX.value);
      translateY.value = withSpring(translateY.value);
    });

  const animatedAutoTimerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scaleValue.value * pulseAnimation.value },
      ],
    };
  });

  // Efecto para la animación de pulso cuando está minimizado
  useEffect(() => {
    if (isAutoTimerMinimized) {
      // Solo posicionar automáticamente la primera vez que se minimiza
      // Si ya tiene una posición personalizada, mantenerla
      if (translateX.value === 0 && translateY.value === 0) {
        const position = getPositionInsideJobCircle();
        translateX.value = withSpring(position.x);
        translateY.value = withSpring(position.y);
      }
      
      // Iniciar animación de pulso
      pulseAnimation.value = withRepeat(
        withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      
      // Escalar a tamaño pequeño
      scaleValue.value = withSpring(0.4);
    } else {
      // Detener animación de pulso
      pulseAnimation.value = withTiming(1, { duration: 300 });
      scaleValue.value = withSpring(1);
    }
  }, [isAutoTimerMinimized]);

  useEffect(() => {
    loadJobs();
    checkActiveTimer();
    
    // Check active timer every 30 seconds
    const interval = setInterval(checkActiveTimer, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update selectedJob when jobs change to keep it in sync
  useEffect(() => {
    if (selectedJob && jobs.length > 0) {
      const updatedJob = jobs.find(job => job.id === selectedJob.id);
      if (updatedJob) {
        setSelectedJob(updatedJob);
      }
    }
  }, [jobs]);

  // AutoTimer service initialization - runs only once
  useEffect(() => {
    const handleAutoTimerStatusChange = (status: AutoTimerStatus) => {
      console.log('🔄 MapLocation received AutoTimer status change:', {
        state: status.state,
        jobId: status.jobId,
        jobName: status.jobName,
        remainingTime: status.remainingTime
      });
      setAutoTimerStatus(status);
    };

    // Add status listener
    autoTimerService.addStatusListener(handleAutoTimerStatusChange);
    
    // Get current status immediately to sync with any ongoing countdown
    const currentStatus = autoTimerService.getStatus();
    setAutoTimerStatus(currentStatus);
    console.log('🔄 MapLocation: Synced with current AutoTimer status:', currentStatus.state, currentStatus.remainingTime);

    // Cleanup on unmount
    return () => {
      autoTimerService.removeStatusListener(handleAutoTimerStatusChange);
    };
  }, []); // Empty dependency array - runs only once

  // Update jobs in AutoTimer service when jobs change
  useEffect(() => {
    const updateAutoTimerJobs = async () => {
      if (jobs.length > 0) {
        console.log('🔄 MapLocation: Updating AutoTimer with jobs:', jobs.length);
        
        // If service is not enabled, start it; otherwise just update jobs
        if (!autoTimerService.isServiceEnabled()) {
          console.log('🚀 MapLocation: Starting AutoTimer service');
          autoTimerService.start(jobs);
        } else {
          console.log('🔄 MapLocation: Service already running, just updating jobs');
          await autoTimerService.updateJobs(jobs);
        }
      }
    };
    
    updateAutoTimerJobs();
  }, [jobs]);

  // Calculate elapsed time for active AutoTimer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    console.log('🔄 MapLocation elapsed time effect triggered, autoTimerStatus:', autoTimerStatus?.state, 'jobId:', autoTimerStatus?.jobId);
    
    if (autoTimerStatus?.state === 'active' && autoTimerStatus?.jobId) {
      const updateElapsedTime = async () => {
        try {
          const activeSession = await JobService.getActiveSession();
          if (activeSession && activeSession.jobId === autoTimerStatus.jobId) {
            const startTime = new Date(activeSession.startTime);
            const now = new Date();
            const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            console.log('⏱️ MapLocation updating elapsed time:', elapsed, 'seconds for job:', autoTimerStatus.jobId);
            setElapsedTime(elapsed);
          } else {
            console.log('⚠️ MapLocation: No matching active session found. Session:', activeSession?.jobId, 'Expected:', autoTimerStatus.jobId);
          }
        } catch (error) {
          console.error('Error calculating elapsed time:', error);
        }
      };

      // Update immediately and then every second
      updateElapsedTime();
      interval = setInterval(updateElapsedTime, 1000);
    } else {
      console.log('🔄 MapLocation: AutoTimer not active or no jobId, resetting elapsed time to 0');
      setElapsedTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoTimerStatus?.state, autoTimerStatus?.jobId]);

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

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Convertir coordenadas geográficas a píxeles en la pantalla
  const getScreenPositionFromCoords = (lat: number, lng: number) => {
    if (!mapRef.current) return { x: 0, y: 0 };
    
    // Obtener el centro actual del mapa y el zoom
    const mapCenter = {
      latitude: location.latitude,
      longitude: location.longitude,
    };
    
    // Calcular la diferencia en grados
    const deltaLat = lat - mapCenter.latitude;
    const deltaLng = lng - mapCenter.longitude;
    
    // Convertir a píxeles (aproximación)
    // En latitud: 1 grado ≈ 111320 metros
    // En longitud: 1 grado ≈ 111320 * cos(lat) metros
    const latToPixels = (deltaLat * 111320) / 10; // Factor de escala aproximado
    const lngToPixels = (deltaLng * 111320 * Math.cos(mapCenter.latitude * Math.PI / 180)) / 10;
    
    return {
      x: lngToPixels,
      y: -latToPixels // Negativo porque las coordenadas Y van hacia abajo en pantalla
    };
  };

  // Calcular posición inicial dentro del círculo del trabajo activo
  const getPositionInsideJobCircle = () => {
    if (!autoTimerStatus?.jobId) return { x: -screenWidth/2 + 120, y: -screenHeight/2 + 300 };
    
    // Encontrar el trabajo activo
    const activeJob = jobs.find(job => job.id === autoTimerStatus.jobId);
    if (!activeJob?.location?.latitude || !activeJob?.location?.longitude || !activeJob?.autoTimer?.enabled) {
      return { x: -screenWidth/2 + 120, y: -screenHeight/2 + 300 };
    }
    
    // Obtener la posición del trabajo en pantalla
    const jobScreenPos = getScreenPositionFromCoords(
      activeJob.location.latitude,
      activeJob.location.longitude
    );
    
    // Generar una posición aleatoria dentro del círculo del geofence
    const radius = activeJob.autoTimer.geofenceRadius || 100;
    const angle = Math.random() * 2 * Math.PI; // Ángulo aleatorio
    const distance = Math.random() * (radius * 0.6); // Dentro del 60% del radio para que se vea bien
    
    const offsetX = Math.cos(angle) * distance / 10; // Factor de escala
    const offsetY = Math.sin(angle) * distance / 10;
    
    return {
      x: jobScreenPos.x + offsetX,
      y: jobScreenPos.y + offsetY
    };
  };

  // Format time in HH:MM:SS format
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get formatted AutoTimer message with translations
  const getAutoTimerMessage = (status: AutoTimerStatus): string => {
    const messageParts = status.message.split(':');
    const messageType = messageParts[0];
    const minutes = messageParts[1];

    switch (messageType) {
      case 'inactive':
        return t('timer.auto_timer.inactive');
      case 'entering':
        return t('timer.auto_timer.will_start', { minutes });
      case 'active':
        return `${t('timer.auto_timer.started_auto')} - ${formatTime(elapsedTime)}`;
      case 'leaving':
        return t('timer.auto_timer.will_stop', { minutes });
      case 'manual':
        return t('timer.auto_timer.manual_override');
      case 'cancelled':
        return t('timer.auto_timer.cancelled');
      default:
        return status.message;
    }
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

  const hasJobAddress = (job: Job) => {
    return !!(job.address?.trim() || 
              job.street?.trim() || 
              job.city?.trim() || 
              job.postalCode?.trim());
  };

  const handleAutoTimerToggle = async (job: Job, value: boolean) => {
    if (value && !hasJobAddress(job)) {
      Alert.alert(
        t('maps.auto_timer_address_required_title'),
        t('maps.auto_timer_address_required_message'),
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

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
      
      if (value) {
        Alert.alert(
          t('maps.auto_timer_enabled_title'),
          t('maps.auto_timer_enabled_message')
        );
      }
    } catch (error) {
      console.error('Error updating auto-timer:', error);
      Alert.alert(
        t('maps.error'),
        t('maps.auto_timer_error')
      );
    }
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
              title={job.autoTimer?.enabled ? t('maps.auto_timer_pin', { jobName: job.name }) : job.name}
              description={job.autoTimer?.enabled 
                ? `${job.location.address} • Timer automático activado (${job.autoTimer.geofenceRadius}m)`
                : job.location.address
              }
              pinColor={job.autoTimer?.enabled ? colors.success : job.color}
              onPress={() => handleJobPress(job)}
            />
          ) : null
        )}

        {/* Geofence circles for auto timer jobs */}
        {jobs.map((job) => 
          job.location?.latitude && job.location?.longitude && job.autoTimer?.enabled ? (
            <Circle
              key={`circle-${job.id}`}
              center={{
                latitude: job.location.latitude,
                longitude: job.location.longitude,
              }}
              radius={job.autoTimer.geofenceRadius || 100}
              strokeColor={job.color}
              fillColor={`${job.color}20`} // 20% opacity
              strokeWidth={2}
            />
          ) : null
        )}
        
      </MapView>


      {/* Auto Timer Status Indicator */}
      {autoTimerStatus && autoTimerStatus.state !== 'inactive' && jobs.some(job => job.autoTimer?.enabled) && (
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.autoTimerStatusOverlay, animatedAutoTimerStyle]}>
            {isAutoTimerMinimized ? (
              // Vista minimizada - solo icono con pulso
              <TouchableOpacity
                onPress={() => setIsAutoTimerMinimized(false)}
                style={[
                  styles.minimizedAutoTimer,
                  {
                    backgroundColor: 
                      autoTimerStatus?.state === 'active' ? colors.success : 
                      autoTimerStatus?.state === 'entering' || autoTimerStatus?.state === 'leaving' ? colors.warning :
                      colors.primary
                  }
                ]}
              >
                <IconSymbol 
                  size={50} 
                  name="clock.fill" 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            ) : (
              // Vista expandida normal
              <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.autoTimerStatusCard}>
            <View style={styles.autoTimerStatusHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <IconSymbol size={16} name="location.fill" color={colors.success} />
                <Text style={styles.autoTimerStatusTitle}>
                  AutoTimer ({jobs.filter(job => job.autoTimer?.enabled).length})
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {/* Botón minimizar */}
                <TouchableOpacity
                  onPress={() => setIsAutoTimerMinimized(true)}
                  style={[styles.disableButton, { backgroundColor: 'rgba(142, 142, 147, 0.3)' }]}
                >
                  <IconSymbol size={14} name="minus" color="#FFFFFF" />
                </TouchableOpacity>
                
                {/* Botón de acción integrado */}
              <TouchableOpacity
                onPress={async () => {
                  const AutoTimerService = require('../services/AutoTimerService').default;
                  const autoTimerService = AutoTimerService.getInstance();
                  const status = autoTimerService.getStatus();
                  
                  try {
                    if (status.state === 'cancelled') {
                      // Reactivar desde estado cancelado
                      await autoTimerService.manualRestart();
                      console.log('AutoTimer reactivado manualmente');
                    } else if (status.state === 'entering' || status.state === 'leaving') {
                      // Cancelar countdown
                      autoTimerService.cancelPendingAction();
                      console.log('Countdown cancelado por usuario');
                    } else if (status.state === 'active') {
                      // Timer corriendo: navegar a TimerScreen
                      onNavigate?.('timer');
                    }
                  } catch (error) {
                    console.error('Error en acción AutoTimer:', error);
                    Alert.alert('Error', 'No se pudo ejecutar la acción');
                  }
                }}
                style={[
                  styles.disableButton,
                  {
                    backgroundColor: 
                      autoTimerStatus?.state === 'cancelled' ? '#34C759' :  // Verde para play
                      autoTimerStatus?.state === 'active' ? '#FF3B30' :     // Azul para map
                      '#FF3B30'  // Rojo para stop
                  }
                ]}
              >
                <IconSymbol 
                  size={16} 
                  name={
                    autoTimerStatus?.state === 'cancelled' ? "play.fill" :
                    autoTimerStatus?.state === 'active' ? "stop.fill" :
                    "stop.fill"
                  } 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              </View>
            </View>
{jobs.filter(job => job.autoTimer?.enabled).map((job) => {
              // Get real proximity status from geofence service
              const geofenceService = require('../services/GeofenceService').default.getInstance();
              const jobStatus = geofenceService.getJobStatus(job.id);
              
              // Fallback: calculate distance manually if geofence service doesn't have data
              let isNearby = jobStatus?.isInside || false;
              let calculatedDistance = jobStatus?.distance || null;
              
              if (!jobStatus && location && job.location?.latitude && job.location?.longitude) {
                // Calculate distance manually
                const distance = calculateDistance(
                  location.latitude,
                  location.longitude,
                  job.location.latitude,
                  job.location.longitude
                );
                calculatedDistance = distance;
                const radius = job.autoTimer?.geofenceRadius || 100;
                isNearby = distance <= radius;
                
                console.log(`📍 Manual calculation for ${job.name}: ${distance.toFixed(0)}m (radius: ${radius}m) = ${isNearby ? 'INSIDE' : 'OUTSIDE'}`);
              }
              
              console.log(`🔍 MapLocation Debug - Job: ${job.name}`);
              console.log(`   - Job ID: ${job.id}`);
              console.log(`   - Job Status:`, jobStatus);
              console.log(`   - Is Nearby: ${isNearby}`);
              console.log(`   - Distance: ${calculatedDistance || 'N/A'}m`);
              console.log(`   - AutoTimer enabled: ${job.autoTimer?.enabled}`);
              console.log(`   - Geofence radius: ${job.autoTimer?.geofenceRadius || 100}m`);
              
              // Check if this job has AutoTimer activity
              const isAutoTimerActive = autoTimerStatus && autoTimerStatus.jobId === job.id;
              let statusText = isNearby ? t('maps.in_range') : t('maps.out_of_range');
              let statusColor = isNearby ? colors.success : colors.textSecondary;
              
              // Override with AutoTimer status if active AND job has autoTimer enabled
              if (isAutoTimerActive && autoTimerStatus.state !== 'inactive' && job.autoTimer?.enabled) {
                statusText = getAutoTimerMessage(autoTimerStatus);
                statusColor = autoTimerStatus.state === 'entering' || autoTimerStatus.state === 'leaving' 
                  ? colors.warning 
                  : autoTimerStatus.state === 'active' 
                    ? colors.success 
                    : colors.textSecondary;
              }
              
              return (
                <View key={job.id}>
                  <View style={styles.autoTimerJobRow}>
                    <View style={[styles.autoTimerJobDot, { backgroundColor: job.color }]} />
                    <Text 
                      style={styles.autoTimerJobName} 
                      numberOfLines={1} 
                      ellipsizeMode="tail"
                      allowFontScaling={false}
                    >
                      {job.name}
                    </Text>
                 
                 
                  </View>
                  {/* Mostrar barra de progreso cuando hay countdown activo */}
                  {isAutoTimerActive && autoTimerStatus.remainingTime > 0 && autoTimerStatus.state !== 'active' && job.autoTimer?.enabled && (
                    <View style={styles.autoTimerProgressContainer}>
                      <View style={styles.autoTimerProgressBar}>
                        <Animated.View 
                          style={[
                            styles.autoTimerProgressFill,
                            {
                              width: `${((autoTimerStatus.totalDelayTime - autoTimerStatus.remainingTime) / autoTimerStatus.totalDelayTime) * 100}%`,
                              backgroundColor: autoTimerStatus.state === 'entering' ? colors.warning : colors.error
                            }
                          ]}
                        />
                      </View>
                      <Text style={styles.autoTimerCountdown}>
                        {Math.ceil(autoTimerStatus.remainingTime / 60)}m
                      </Text>
                    </View>
                  )}
                  {/* Mostrar tiempo transcurrido cuando está activo */}
                  {isAutoTimerActive && autoTimerStatus.state === 'active' && (
                    <View style={styles.activeTimerText}>
                      <Text style={[styles.activeTimerText, { fontSize: 14, fontWeight: '800' }]}>
                        ⏱️ {formatTime(elapsedTime)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
              </BlurView>
            )}
          </Animated.View>
        </GestureDetector>
      )}

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
                style={[styles.actionModalButton, styles.secondaryButtonBg]}
                onPress={() => handleJobAction(selectedJob, 'edit')}
              >
                <IconSymbol size={24} name="gear" color={colors.textSecondary} />
                <View style={styles.actionModalButtonTextContainer}>
                  <Text style={styles.actionModalButtonText}>
                    {t('maps.edit_job')}
                  </Text>
                  {hasJobAddress(selectedJob) && (
                    <View style={styles.autoTimerSwitchContainer}>
                      <Text style={styles.autoTimerSwitchLabel}>
                        {t('maps.auto_timer')}
                      </Text>
                      <Switch
                        value={selectedJob?.autoTimer?.enabled || false}
                        onValueChange={(value) => handleAutoTimerToggle(selectedJob, value)}
                        trackColor={{ false: colors.separator, true: colors.success + '40' }}
                        thumbColor={selectedJob?.autoTimer?.enabled ? colors.success : colors.textTertiary}
                        style={styles.autoTimerSwitch}
                      />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

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
