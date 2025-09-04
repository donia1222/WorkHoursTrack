import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated as RNAnimated, Dimensions, Alert } from 'react-native';
import { logMiniMapWidget } from '../config/logging';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSpring } from 'react-native-reanimated';
import MapView, { Marker, Circle, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { Platform } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTimeFormat } from '../hooks/useTimeFormat';
import { Job } from '../types/WorkTypes';
import StopAutoTimerModal from './StopAutoTimerModal';

// Variable global para evitar mostrar Alert cuando se confirma desde el modal
let skipNextAutoTimerAlert = false;

export const setSkipNextAutoTimerAlert = (skip: boolean) => {
  skipNextAutoTimerAlert = skip;
};

export const shouldSkipAutoTimerAlert = () => {
  const skip = skipNextAutoTimerAlert;
  if (skip) skipNextAutoTimerAlert = false; // Reset después de usar
  return skip;
};

interface MiniMapWidgetProps {
  job: Job;
  userLocation?: { latitude: number; longitude: number } | null;
  activeTimerElapsed?: number;
  isAutoTimerPaused?: boolean;
  startTime?: Date | null;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  formatTime?: (seconds: number) => string;
  // AutoTimer delay status
  autoTimerState?: 'pre-start' | 'inactive' | 'entering' | 'leaving' | 'active' | 'manual' | 'cancelled';
  remainingDelayTime?: number;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => {
  const { width, height } = Dimensions.get('window');
  const isTablet = width >= 768;
  
  return StyleSheet.create({
  container: {


marginTop: -10,



  },
  mapContainer: {

    height: '110%',

  },
  map: {
    width: '100%',
    height: '100%',
  },
  timerOverlay: {
    position: 'absolute',
    bottom: 400,
    right: 8,
    zIndex: 1000,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '800',
    color: isDark ? '#e8e8e8ff' : '#445d86ff',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
  },
  pauseButton: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(59, 130, 246, 0.3)',
  },
  headerButton: {
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(99, 102, 241, 0.2)',
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(139, 92, 246, 0.5)' : 'rgba(99, 102, 241, 0.4)',
    shadowColor: isDark ? '#8b5cf6' : '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  miniMapContainer: {
    position: 'absolute',
    top: 60,
    right: 10,
    width: 80,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(99, 102, 241, 0.15)',
    borderWidth: 2,
    borderColor: isDark ? 'rgba(139, 92, 246, 0.6)' : 'rgba(99, 102, 241, 0.5)',
    shadowColor: isDark ? '#8b5cf6' : '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 999,
  },
  miniMap: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  miniMapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  centerMapButton: {
    position: 'absolute',
    top: 70,
    left: 30,
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(99, 102, 241, 0.2)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(139, 92, 246, 0.5)' : 'rgba(99, 102, 241, 0.4)',
    shadowColor: isDark ? '#8b5cf6' : '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 998,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    paddingVertical: 14,
    position: 'absolute',
    bottom: isTablet ? 365 : 205,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderTopWidth: 0,
  },
  autoTimerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.55)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(16, 185, 129, 0.2)',
  },
  autoTimerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(34, 197, 94, 0.4)' : 'rgba(16, 185, 129, 0.3)',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    gap: 6,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoTimerText: {
    fontSize: 14,
    fontWeight: '800',
    color: isDark ? '#FFFFFF' : '#1e293b',
    letterSpacing: 0.8,
  },
  timerContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  timerMainSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.8,
  },
  timerLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: isDark ? '#9ca3af' : '#6b7280',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timerStartTime: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#d1d5db' : '#4b5563',
    letterSpacing: 0.3,
    fontFamily: 'monospace',
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  jobInfo: {
    flex: 1,
  },
  jobName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  jobAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.8,
    letterSpacing: 0.1,
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(34, 197, 94, 0.6)' : 'rgba(34, 197, 94, 0.5)',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  stopButton: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.15)',
    borderColor: isDark ? 'rgba(239, 68, 68, 0.6)' : 'rgba(239, 68, 68, 0.5)',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  userMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4A90E2',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  userMarkerDot: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#4A90E2',
  },
  delayOverlay: {
    position: 'absolute',

    bottom:400,
    right: 8,
    zIndex: 1001,
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.9)' : 'rgba(251, 191, 36, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(245, 158, 11, 0.8)' : 'rgba(245, 158, 11, 0.6)',
  },
  delayText: {
    fontSize: 15,
    fontWeight: '800',
    color: isDark ? '#fef3c7' : '#92400e',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
  },
  delayIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  delayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: isDark ? '#fbbf24' : '#a16207',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
};

export default function MiniMapWidget({
  job,
  userLocation,
  activeTimerElapsed = 0,
  isAutoTimerPaused = false,
  startTime = null,
  onPause,
  onResume,
  onStop,
  formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },
  autoTimerState = 'inactive',
  remainingDelayTime = 0,
}: MiniMapWidgetProps) {
  logMiniMapWidget('MiniMapWidget props:', {
    jobName: job?.name,
    autoTimerState,
    remainingDelayTime,
    activeTimerElapsed,
    isAutoTimerPaused
  });
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { formatTimeWithPreferences } = useTimeFormat();
  const styles = getStyles(colors, isDark);
  const mapRef = useRef<MapView>(null);
  
  // Estados para el modal de confirmación
  const [showStopModal, setShowStopModal] = useState(false);
  
  // Animación de pulse para el timer
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  
  // Animaciones de entrada suaves como ReportsScreen
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const scaleAnim = useRef(new RNAnimated.Value(0.9)).current;
  
  // Animación para el punto verde del AutoTimer
  const dotPulse = useSharedValue(1);
  
  // Estado para el tipo de mapa
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  
  useEffect(() => {
    // Animación de entrada suave como ReportsScreen
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      RNAnimated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
    
    // Animación de pulse cada segundo
    pulseScale.value = withRepeat(
      withTiming(1.05, { duration: 800 }),
      -1,
      true
    );
    
    // Animación de glow para el icono
    glowOpacity.value = withRepeat(
      withTiming(0.8, { duration: 1200 }),
      -1,
      true
    );
    
    // Animación del punto verde del AutoTimer
    dotPulse.value = withRepeat(
      withTiming(1.3, { duration: 1000 }),
      -1,
      true
    );
  }, [fadeAnim, scaleAnim]);
  
  const animatedTimerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  
  const animatedIconStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: pulseScale.value * 0.95 }],
  }));
  
  
  const animatedDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotPulse.value }],
  }));
  
  const centerMap = () => {
    // Parar la animación de pulse completamente
    pulseScale.value = withTiming(1, { duration: 100 });
    
    // Centrar el mapa sin animación
    mapRef.current?.animateToRegion(mapRegion, 0);
  };

  if (!job.location?.latitude || !job.location?.longitude) {
    return null;
  }

  const mapRegion = {
    latitude: job.location.latitude,
    longitude: job.location.longitude,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  const jobCoordinates = {
    latitude: job.location.latitude,
    longitude: job.location.longitude,
  };

  return (
    <RNAnimated.View style={[
      styles.container,
      {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }
    ]}>
      <View style={styles.mapContainer}>
     
          <View style={styles.timerOverlay}>
            <View style={styles.timerContent}>
              {/* Main timer display */}
              <View style={styles.timerMainSection}>
                <Animated.View style={[styles.timerIcon, animatedIconStyle]}>
                  <IconSymbol 
                    size={12} 
                    name="clock.fill" 
                    color={isDark ? '#22c55e' : '#16a34a'} 
                  />
                </Animated.View>
                <Animated.Text style={[styles.timerText, animatedTimerStyle]}>
                  {formatTime(activeTimerElapsed)}
                </Animated.Text>
              </View>
              
              {/* Start time info */}
              {startTime && (
                <View style={styles.timerInfoRow}>
                  <IconSymbol 
                    size={9} 
                    name="play.circle.fill" 
                    color={isDark ? '#9ca3af' : '#6b7280'} 
                  />
                  <Text style={styles.timerLabel}>Start</Text>
                  <Text style={styles.timerStartTime}>
                    {formatTimeWithPreferences(startTime.toTimeString().substring(0, 5))}
                  </Text>
                </View>
              )}
            </View>
          </View>


        {/* Delay countdown overlay */}
        {(autoTimerState === 'entering' || autoTimerState === 'leaving') && remainingDelayTime > 0 && (
          <Animated.View style={[styles.delayOverlay, animatedTimerStyle]}>
            <View style={styles.delayIcon}>
              <IconSymbol 
                size={14} 
                name={autoTimerState === 'entering' ? 'play.circle' : 'stop.circle'} 
                color={isDark ? '#f59e0b' : '#d97706'} 
              />
            </View>
            <View>
              <Animated.Text style={[styles.delayText, animatedTimerStyle]}>
                {Math.ceil(remainingDelayTime)}s
              </Animated.Text>
              <Text style={styles.delayLabel}>
                {autoTimerState === 'entering' ? 'Starting in' : 'Stopping in'}
              </Text>
            </View>
          </Animated.View>
        )}
        
        {/* Header AutoTimer */}
        <View style={styles.autoTimerHeader}>
          <View style={styles.autoTimerChip}>
            <Animated.View style={[styles.greenDot, animatedDotStyle]} />
            <Text style={styles.autoTimerText}>AutoTimer</Text>
          </View>
          
        </View>
        
        <MapView
          ref={mapRef}
          style={styles.map}
          region={mapRegion}
          provider={Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
          mapType={mapType}
          showsUserLocation={true}
          showsMyLocationButton={false}
          scrollEnabled={true}
          zoomEnabled={true}
          rotateEnabled={true}
          pitchEnabled={true}
          toolbarEnabled={false}
          showsCompass={false}
          showsScale={false}
          loadingEnabled={false}
        >
          {/* Job location marker */}
          <Marker
            coordinate={jobCoordinates}
            title={job.name}
            description={`${job.street || ''} ${job.city || ''}`}
          >
            <View style={styles.markerContainer}>
              <View style={[styles.marker, { backgroundColor: job.color || colors.primary }]}>
                <IconSymbol size={20} name="briefcase.fill" color="#FFFFFF" />
              </View>
            </View>
          </Marker>

          {/* Geofence radius circle */}
          <Circle
            center={jobCoordinates}
            radius={job.autoTimer?.geofenceRadius || 50}
            fillColor={isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(16, 185, 129, 0.2)'}
            strokeColor={isDark ? 'rgba(34, 197, 94, 0.8)' : 'rgba(16, 185, 129, 0.7)'}
            strokeWidth={2}
          />

          {/* User location marker (if available) */}
          {userLocation && (
            <Marker
              coordinate={userLocation}
              title="Mi ubicación"
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.userMarker}>
                <View style={styles.userMarkerDot} />
              </View>
            </Marker>
          )}
        </MapView>

        {/* Botón de centrar mapa - esquina superior izquierda */}
        <TouchableOpacity
          style={styles.centerMapButton}
          onPress={centerMap}
          activeOpacity={0.8}
        >
          <IconSymbol 
            size={16} 
            name="location.fill" 
            color={isDark ? '#a78bfa' : '#6366f1'} 
          />
        </TouchableOpacity>

        {/* Mini mapa overlay */}
        <View style={styles.miniMapContainer}>
          <MapView
            style={styles.miniMap}
            region={{
              latitude: job.location.latitude,
              longitude: job.location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            provider={Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
            mapType={mapType === 'standard' ? 'satellite' : 'standard'}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            showsUserLocation={false}
            showsMyLocationButton={false}
            toolbarEnabled={false}
            showsCompass={false}
            showsScale={false}
            showsBuildings={false}
            showsTraffic={false}
            showsIndoors={false}
            showsPointsOfInterest={false}
            liteMode={true}
            loadingEnabled={false}
            cacheEnabled={false}
            pointerEvents="none"
          >
          </MapView>
          
          <TouchableOpacity
            style={styles.miniMapOverlay}
            onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
            activeOpacity={0.8}
          />
        </View>
      </View>

      <BlurView 
        intensity={80}
        tint={isDark ? "dark" : "light"}
        style={styles.controlsContainer}
      >
        <View style={styles.jobInfo}>
          <Text style={styles.jobName}>{job.name}</Text>
          <Text style={styles.jobAddress}>
            {[job.street, job.city].filter(Boolean).join(', ')}
          </Text>
        </View>

        <View style={styles.controlButtons}>
          <TouchableOpacity
            onPress={isAutoTimerPaused ? onResume : onPause}
            style={styles.controlButton}
            activeOpacity={0.8}
          >
            <IconSymbol 
              size={22} 
              name={isAutoTimerPaused ? "play.fill" : "pause.fill"} 
              color={isDark ? '#6ee7b7' : '#059669'} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setShowStopModal(true)}
            style={[styles.controlButton, styles.stopButton]}
            activeOpacity={0.8}
          >
            <IconSymbol 
              size={22} 
              name="stop.fill" 
              color={isDark ? '#f87171' : '#dc2626'} 
            />
          </TouchableOpacity>
        </View>
      </BlurView>
      
      {/* Modal de confirmación para parar AutoTimer */}
      <StopAutoTimerModal
        visible={showStopModal}
        onClose={() => setShowStopModal(false)}
        onConfirm={() => {
          // Cerrar modal y ejecutar la lógica original
          setShowStopModal(false);
          if (onStop) {
            onStop();
          }
        }}
        job={job}
      />
    </RNAnimated.View>
  );
}