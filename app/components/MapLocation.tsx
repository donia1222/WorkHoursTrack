import React, { useState, useEffect, useRef, useCallback } from 'react';
import MapView, { Marker, Circle } from 'react-native-maps';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Modal, Dimensions, Switch, InteractionManager, useWindowDimensions } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Job, StoredActiveSession } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import JobFormModal from '../components/JobFormModal';
import JobStatisticsModal from '../components/JobStatisticsModal';
import JobSelectorModal from '../components/JobSelectorModal';
import { useNavigation } from '../context/NavigationContext';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getRandomQuestion } from '../services/ChatbotWidgetService';
import { useAutoTimer } from '../contexts/AutoTimerContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useTimeFormat } from '../hooks/useTimeFormat';
import AutoTimerService, { AutoTimerStatus, AutoTimerState } from '../services/AutoTimerService';
import { JobCardsSwiper } from './JobCardsSwiper';
import { useFocusEffect } from '@react-navigation/native';
import WidgetSyncService from '../services/WidgetSyncService';
import MiniMapWidget from './MiniMapWidget';
import { logScreenDetection } from '../config/logging';


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
  location?: {
    latitude: number;
    longitude: number;
  };
  onNavigate?: (screen: string) => void;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const getStyles = (colors: ThemeColors, isDark: boolean, isSmallScreen: boolean, daySize: number, dayFontSize: number, isTablet: boolean) => StyleSheet.create({
  mapContainer: {
    flex: 1,
    overflow: 'hidden',

  },
  mapWrapper: {



  },
  container: {
  
  },
  map: {
marginTop:10
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
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,

  },
  mainActionCard: {
    width: 300,
    pointerEvents: 'auto',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  mainActionCardInner: {
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',

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
    width: 92,
    height: 92,
    borderRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4C87AF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
  },
  
  mainActionTitle: {
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  mainActionDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
    paddingHorizontal: 10,
  },
  mainActionBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    zIndex: 10,
    elevation: 4,
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
    fontWeight: '400',
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
    pointerEvents: 'box-none',
  },
  actionModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  actionModalContent: {
    borderRadius: 24,
    margin: 20,
    padding: 24,
    minWidth: 300,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.9)',
    backgroundColor: isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'hidden',
    pointerEvents: 'auto',
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
    padding: 16,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  actionModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
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
    fontWeight: '400',
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
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  floatingAddButtonInner: {
    flex: 1,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
    overflow: 'visible',
  },
  fabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 32,
  },
  oldSuccessIconBg: {
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
    bottom: 90,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  disableButton: {
    width: 24,
    height: 24,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  autoTimerStatusCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: isDark ? 0.15 : 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  autoTimerStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
    gap: 8,
  },
  autoTimerStatusTitle: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  autoTimerJobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  autoTimerJobDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.9)',
  },
  autoTimerJobName: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
    fontWeight: '400',
    minWidth: 0,
    flexShrink: 1,
    textAlign: 'left',
  },
  autoTimerJobStatus: {
    ...Theme.typography.caption2,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  autoTimerProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  autoTimerProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  autoTimerProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  autoTimerCountdown: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  activeTimerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
    marginTop: 2,
    backgroundColor: isDark ? 'rgba(52, 199, 89, 0.1)' : 'rgba(52, 199, 89, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    textAlign: 'center',
    alignSelf: 'flex-start',
  },
  minimizedAutoTimer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  privacyNoticeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  privacyNoticeCard: {
    backgroundColor: isDark ? 'rgba(255, 149, 0, 0.95)' : 'rgba(255, 149, 0, 0.95)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  privacyNoticeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  privacyNoticeIcon: {
    marginRight: 12,
  },
  privacyNoticeText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  privacyNoticeCloseButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  privacyNoticeButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  miniCalendarContainer: {
    marginBottom: isTablet ? 20 : (isSmallScreen ? 8 : 16),
    marginHorizontal: isTablet ? -6 : (isSmallScreen ? 8 : 0),
    maxWidth: isTablet ? 600 : undefined,
    alignSelf: isTablet ? 'center' : undefined,
    marginTop:60,
  },
  miniCalendarCard: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: isDark ? '#000' : '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.12 : 0.08,
    shadowRadius: 6,

  },
  miniCalendarBlur: {
    paddingTop: isTablet ? 16 : (isSmallScreen ? 8 : 10),
    paddingBottom: isTablet ? 14 : (isSmallScreen ? 6 : 8),
    paddingHorizontal: isTablet ? 20 : (isSmallScreen ? 8 : 12),
    backgroundColor: isDark ?  'rgba(67, 53, 107, 0.13)' : 'rgba(67, 53, 107, 0.13)',
  },
  miniCalendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
    paddingVertical: 2,
  },
  miniCalendarTitle: {
    fontSize: isTablet ? 20 : (isSmallScreen ? 14 : 16),
    fontWeight: isTablet ? '600' : '500',
    color: colors.text,
    letterSpacing: -0.3,
  },
  miniCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 1,
    alignItems: 'flex-start',
  },
  miniCalendarDay: {
    width: '13.5%',
    height: daySize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    position: 'relative',
    marginBottom: 4,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.015)',
  },
  miniCalendarDayText: {
    fontSize: dayFontSize,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  miniCalendarDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  miniCalendarBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniCalendarBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
  miniCalendarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  miniCalendarArrow: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  },
  miniCalendarDayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 1,
  },
  miniCalendarDayLabel: {
    width: '13.5%',
    textAlign: 'center',
    fontSize: isTablet ? 13 : (isSmallScreen ? 8 : 10),
    fontWeight: '700',
    color: isDark ? colors.textSecondary : colors.textTertiary,
    opacity: 1,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  miniCalendarDayToday: {
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.12)',
    borderWidth: 0,
  },
  miniCalendarTimeText: {
    fontSize: 7,
    color: colors.text,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 9,
    opacity: 0.8,
    fontWeight: '600',
    paddingHorizontal: 1,
    letterSpacing: -0.3,
  },
  miniCalendarButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  miniCalendarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  noLocationBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  noLocationContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 60,
  },
  noLocationButtons: {
    gap: 16,
    width: '100%',
    maxWidth: 320,
    marginTop: -40,
  },
  noLocationButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  noLocationButtonGradient: {
    padding: 16,
  },
  noLocationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noLocationButtonText: {
    flex: 1,
  },
  noLocationButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  noLocationButtonSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
  // Modern button styles
  modernButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,

    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
        marginBottom: 4,
  },
  modernButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,

  },
  modernIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  modernIconBackground: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  modernBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  modernTextContainer: {
    flex: 1,
  },
  modernButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 1,
  },
  modernButtonSubtitle: {
    fontSize: 11,
    fontWeight: '400',
    opacity: 0.7,
  },
  modernChevron: {
    marginLeft: 8,
  },
  // Estilos para las secciones de configuración
  sectionCard: {
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  sectionCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: colors.text,

  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: isDark ? 'rgba(76, 92, 175, 0.1)' : 'rgba(76, 87, 175, 0.08)',
     paddingHorizontal: 12,
     borderRadius: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  successIconBg: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.15)',
    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(6, 182, 212, 0.25)',
    borderWidth: 1,
  },
  warningIconBg: {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)',
    borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
  },
  primaryIconBg: {
    backgroundColor: isDark ? 'rgba(147, 51, 234, 0.2)' : 'rgba(99, 102, 241, 0.15)',
    borderColor: isDark ? 'rgba(147, 51, 234, 0.3)' : 'rgba(99, 102, 241, 0.25)',
    borderWidth: 1,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    opacity: 0.9,
    lineHeight: 18,
    fontWeight: '500',
  },
});


export default function MapLocation({ location, onNavigate }: Props) {
  const { colors, isDark } = useTheme();
  const autoTimer = useAutoTimer();
  const { navigateTo } = useNavigation();
  const { t, language } = useLanguage();
  const { triggerHaptic } = useHapticFeedback();
  const { formatTimeWithPreferences, useTimeFormat: isTimeFormat } = useTimeFormat();
  
  // Function to make AM/PM format more compact for widgets
  const formatTimeCompact = (time: string): string => {
    const formatted = formatTimeWithPreferences(time);
    // Make AM/PM more compact: "9:00 AM" -> "9:00a", "2:30 PM" -> "2:30p"
    return formatted
      .replace(' AM', '')
      .replace(' PM', '');
  };

  // Format hours for display - same logic as ReportsScreen
  const formatHoursForDisplay = (hours: number): string => {
    if (isTimeFormat) {
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobForm, setShowJobForm] = useState(false);
  
  // Responsive dimensions for mini calendar
  const windowDimensions = useWindowDimensions();
  const screenWidth = windowDimensions.width;
  const screenHeight = windowDimensions.height;
  const isSmallScreen = screenWidth < 380; // iPhone SE and similar
  const isTablet = screenWidth >= 768; // iPad and tablets
  const isPortrait = screenHeight > screenWidth; // Detect portrait orientation
  const isIPadPortrait = isTablet && isPortrait; // Detect iPad in portrait mode
  const daySize = isTablet ? 60 : (isSmallScreen ? 40 : 48);
  const dayFontSize = isTablet ? 16 : (isSmallScreen ? 11 : 13);
  
  logScreenDetection('Screen detection:', {
    screenWidth,
    screenHeight,
    isTablet,
    isPortrait,
    isIPadPortrait
  });
  
  // Animation perpvalues for modal
  const modalScale = useSharedValue(0);
  const modalOpacity = useSharedValue(0);
  
  // Animated style for modal
  const animatedModalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
    opacity: modalOpacity.value,
  }));
  
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [showStatistics, setShowStatistics] = useState(false);
  const [selectedJobForStats, setSelectedJobForStats] = useState<Job | null>(null);
  const [jobStatistics, setJobStatistics] = useState<Map<string, { thisMonthHours: number; thisMonthDays: number }>>(new Map());
  const [activeTimerJobId, setActiveTimerJobId] = useState<string | null>(null);
  const [autoTimerStatus, setAutoTimerStatus] = useState<AutoTimerStatus | null>(null);
  const [autoTimerService] = useState(() => AutoTimerService.getInstance());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [lastAutoTimerSession, setLastAutoTimerSession] = useState<{
    startTime: string;
    endTime: string;
    hours: number;
    jobName: string;
  } | null>(null);
  const [isAutoTimerPaused, setIsAutoTimerPaused] = useState(false);
  const [isAutoTimerMinimized, setIsAutoTimerMinimized] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [hasShownActivationAlert, setHasShownActivationAlert] = useState(false);
  const [hasInvoicingData, setHasInvoicingData] = useState(false);
  
  // Estados para los modales de configuración
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [selectedEditType, setSelectedEditType] = useState<'schedule' | 'location' | 'financial' | 'billing' | null>(null);
  const [currentUserLocation, setCurrentUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [forceMapUpdate, setForceMapUpdate] = useState(0);
  const [hasShownPrivacyNotice, setHasShownPrivacyNotice] = useState(false);
  const [miniCalendarData, setMiniCalendarData] = useState<any[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [showJobCardsModal, setShowJobCardsModal] = useState(false);
  const [shouldShowMiniCalendar, setShouldShowMiniCalendar] = useState(true);
  const [wasJobCardsModalOpen, setWasJobCardsModalOpen] = useState(false);
  const [shouldReopenJobCardsModal, setShouldReopenJobCardsModal] = useState(false);
  const [selectedDaySchedule, setSelectedDaySchedule] = useState<number | null>(null);
  const [monthlyOvertime, setMonthlyOvertime] = useState<number>(0);
  const [dynamicChatbotQuestion, setDynamicChatbotQuestion] = useState<string>('');
  const mapRef = useRef<MapView>(null);
    const [monthlyTotalHours, setMonthlyTotalHours] = useState<number>(0);

  const calculateMonthlyTotalHours = async (): Promise<number> => {
    try {
      const allWorkDays = await JobService.getWorkDays();
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      let totalHours = 0;
      
      allWorkDays.forEach((day: any) => {
        const dayDate = new Date(day.date);
        
        if (dayDate.getMonth() + 1 === currentMonth && 
            dayDate.getFullYear() === currentYear && 
            (day.type === 'work' || !day.type)) {
          // Use net hours calculation (same as ReportsScreen)
          const netHours = Math.max(0, (day.hours || 0) - (day.breakHours || 0));
          totalHours += netHours;
        }
      });
      return totalHours;
    } catch (error) {
      console.error('Error calculating monthly total hours:', error);
      return 0;
    }
  };

  // Load dynamic chatbot question when component mounts or language changes
  useEffect(() => {
    const loadDynamicQuestion = async () => {
      try {
        // Get current location coordinates if available
        const coordinates = location ? { 
          latitude: location.latitude, 
          longitude: location.longitude 
        } : undefined;
        
        const randomQuestion = await getRandomQuestion(language, coordinates);
        if (randomQuestion) {
          setDynamicChatbotQuestion(randomQuestion);
        } else {
          setDynamicChatbotQuestion(t('chatbot.welcome_title'));
        }
      } catch (error) {
        console.warn('Failed to load dynamic chatbot question:', error);
        setDynamicChatbotQuestion(t('chatbot.welcome_title'));
      }
    };

    loadDynamicQuestion();
  }, [language, t, location]); // Re-run when language or location changes
  
  // Optimización para prevenir congelamiento durante zoom rápido
  const onRegionChangeComplete = useCallback((region: any) => {
    // Solo loguear cuando sea necesario para debugging
    // console.log('Region changed:', region);
  }, []);

  // Prevenir congelamiento por eventos táctiles múltiples
  const [isProcessingGesture, setIsProcessingGesture] = useState(false);
  const gestureTimeoutRef = useRef<NodeJS.Timeout>();
  const lastGestureTime = useRef<number>(0);
  const gestureDebounceDelay = 50; // ms entre gestos para evitar sobrecarga
  
  const handleMapRegionChange = useCallback((region: any) => {
    const now = Date.now();
    
    // Throttle para evitar demasiados eventos en poco tiempo
    if (now - lastGestureTime.current < gestureDebounceDelay) {
      return;
    }
    
    lastGestureTime.current = now;
    
    // Usar InteractionManager para manejar las interacciones de manera segura
    InteractionManager.runAfterInteractions(() => {
      // El código aquí se ejecutará después de que terminen las animaciones
    });
  }, []);
  
  const handleMapRegionChangeComplete = useCallback((region: any) => {
    // Pequeño delay para asegurar que todos los gestos terminaron
    setTimeout(() => {
      setIsProcessingGesture(false);
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current);
        gestureTimeoutRef.current = undefined;
      }
    }, 100);
  }, []);

  // AutoTimer position - fixed, no dragging
  
  // Animaciones para minimizar/maximizar
  const scaleValue = useSharedValue(1);
  const pulseAnimation = useSharedValue(1);
  const clockPulse = useSharedValue(1);
  
  // Animaciones para mini calendario
  const miniCalendarOpacity = useSharedValue(0);
  const miniCalendarTranslateY = useSharedValue(-30);
  const miniCalendarScale = useSharedValue(0.95);
  
  // Animaciones para notificación de privacidad
  const privacyNoticeOpacity = useSharedValue(0);
  const privacyNoticeTranslateY = useSharedValue(-20);
  
  // Animaciones para botones de no location
  const noLocationButtonsOpacity = useSharedValue(1);
  const noLocationButtonsTranslateY = useSharedValue(0);
  
  // Animaciones para cuando no hay trabajos
  const noJobsIconPulse = useSharedValue(1);
  const noJobsTextPulse = useSharedValue(1);
  
  const styles = getStyles(colors, isDark, isSmallScreen, daySize, dayFontSize, isTablet);

  // Gestión del arrastre para AutoTimer (funciona para ambos estados)
  // Removed panGesture - AutoTimer is now fixed

  const animatedAutoTimerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scaleValue.value * pulseAnimation.value },
      ],
    };
  });

  const animatedClockStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: clockPulse.value }],
    };
  });
  
  // Animación para el texto del asistente IA
  const aiTextOpacity = useSharedValue(1);
  
  useEffect(() => {
    aiTextOpacity.value = withRepeat(
      withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);
  
  // Animaciones para cuando no hay trabajos (pulso suave)
  useEffect(() => {
    if (jobs.length === 0) {
      // Iniciar animación de pulso para el ícono
      noJobsIconPulse.value = withRepeat(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      
      // Iniciar animación de pulso para el texto (más sutil)
      noJobsTextPulse.value = withRepeat(
        withTiming(1.05, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      // Detener animaciones cuando hay trabajos
      noJobsIconPulse.value = withTiming(1, { duration: 300 });
      noJobsTextPulse.value = withTiming(1, { duration: 300 });
    }
  }, [jobs.length]);
  
  // Estilos animados para no jobs
  const animatedNoJobsIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: noJobsIconPulse.value }],
    };
  });
  
  const animatedNoJobsTextStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: noJobsTextPulse.value }],
    };
  });
  
  const animatedAITextStyle = useAnimatedStyle(() => {
    return {
      opacity: aiTextOpacity.value,
    };
  });

  const animatedMiniCalendarStyle = useAnimatedStyle(() => {
    return {
      opacity: miniCalendarOpacity.value,
      transform: [
        { translateY: miniCalendarTranslateY.value },
        { scale: miniCalendarScale.value },
      ],
    };
  });

  const animatedPrivacyNoticeStyle = useAnimatedStyle(() => {
    return {
      opacity: privacyNoticeOpacity.value,
      transform: [
        { translateY: privacyNoticeTranslateY.value },
      ],
    };
  });

  const animatedNoLocationButtonsStyle = useAnimatedStyle(() => {
    return {
      opacity: noLocationButtonsOpacity.value,
      transform: [
        { translateY: noLocationButtonsTranslateY.value },
      ],
    };
  });

  // Efecto para la animación de pulso cuando está minimizado
  useEffect(() => {
    if (isAutoTimerMinimized) {
      // AutoTimer is now fixed in footer - no positioning needed
      
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
    // Initialize current week start to today's week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
    setCurrentWeekStart(weekStart);
    
    loadJobs();
    checkActiveTimer();
    
    // Check for invoicing data
    AsyncStorage.getItem('invoicing_data').then(data => {
      setHasInvoicingData(data !== null);
    }).catch(() => setHasInvoicingData(false));
    loadPrivacyNoticeState();
    loadMiniCalendarData(weekStart, isIPadPortrait);
    
    // Initial animation for mini calendar - delayed and smoother
    setTimeout(() => {
      miniCalendarOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
      miniCalendarTranslateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
      miniCalendarScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    }, 500); // Increased delay
    
    // Check active timer every 30 seconds
    const interval = setInterval(checkActiveTimer, 30000);
    return () => clearInterval(interval);
  }, []);

  // Recargar datos de sesión cada vez que el componente se enfoque
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 MapLocation: Screen focused, reloading session data');
      // Recargar solo los datos de la última sesión, no todo loadJobs
      const reloadLastSession = async () => {
        try {
          const workDays = await JobService.getWorkDays();
          console.log('📊 Reloading workDays for session data:', workDays.length);
          
          const workSessions = workDays.filter(day => {
            return (!day.type || day.type === 'work') && day.hours > 0;
          });
          
          if (workSessions.length > 0) {
            const sortedSessions = workSessions.sort((a, b) => {
              if (a.updatedAt && b.updatedAt) {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
              }
              if (a.createdAt && b.createdAt) {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              }
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
            
            const lastSession = sortedSessions[0];
            const startTime = lastSession.actualStartTime || lastSession.startTime;
            const endTime = lastSession.actualEndTime || lastSession.endTime;
            
            if (startTime && endTime) {
              // Find the job name
              const job = jobs.find(j => j.id === lastSession.jobId);
              const jobName = job?.name || 'Trabajo';
              
              console.log('📊 Updated last session:', {
                startTime,
                endTime,
                hours: lastSession.hours,
                jobName,
                date: lastSession.date
              });
              setLastAutoTimerSession({
                startTime,
                endTime,
                hours: lastSession.hours,
                jobName
              });
            }
          }
        } catch (error) {
          console.error('Error reloading last session:', error);
        }
      };
      
      reloadLastSession();
    }, [])
  );

  // Animar botones cuando se abre/cierra el modal de trabajos
  useEffect(() => {
    if (showJobCardsModal) {
      // Ocultar botones cuando se abre el modal
      noLocationButtonsOpacity.value = withTiming(0, { duration: 300 });
      noLocationButtonsTranslateY.value = withTiming(20, { duration: 300 });
    } else {
      // Mostrar botones cuando se cierra el modal
      noLocationButtonsOpacity.value = withTiming(1, { duration: 400 });
      noLocationButtonsTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    }
  }, [showJobCardsModal]);

  // Helper function to get month name from date
  const getMonthName = (date: Date) => {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    return t(`chatbot.months.${months[date.getMonth()]}`);
  };

  const loadMiniCalendarData = async (weekStart?: Date, forceIPadPortrait?: boolean) => {
    try {
      const today = new Date();
      const baseDate = weekStart || currentWeekStart;
      
      // Usar el valor pasado o el calculado en el componente
      const shouldShow14Days = forceIPadPortrait !== undefined ? forceIPadPortrait : isIPadPortrait;
      
      // Crear array de días (7 para normal, 14 para iPad vertical)
      // Agregar 7 días extras para garantizar que siempre tengamos datos de la próxima semana
      const daysToShow = shouldShow14Days ? 21 : 14;
      
      console.log('📅 Calendar days to show:', daysToShow, 'isIPadPortrait:', shouldShow14Days);
      const startOfWeek = new Date(baseDate);
      const dayOfWeek = startOfWeek.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Empezar en lunes
      startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
      
      // Obtener días de trabajo de todos los meses que aparecen en el período
      const monthsToLoad = new Set<string>();
      for (let i = 0; i < daysToShow; i++) {
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + i);
        const monthKey = `${dayDate.getFullYear()}-${dayDate.getMonth() + 1}`;
        monthsToLoad.add(monthKey);
      }
      
      // Cargar días de trabajo de todos los meses necesarios
      let allWorkDays: any[] = [];
      for (const monthKey of monthsToLoad) {
        const [year, month] = monthKey.split('-').map(Number);
        const workDays = await JobService.getWorkDaysForMonth(year, month);
        allWorkDays = [...allWorkDays, ...workDays];
      }
      
      console.log('📅 Mini Calendar MapLocation: Loaded', allWorkDays.length, 'work days');
      
      const calendarDays = [];
      for (let i = 0; i < daysToShow; i++) {
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + i);
        
        const dayNum = dayDate.getDate();
        const dayMonth = dayDate.getMonth() + 1;
        const dayYear = dayDate.getFullYear();
        const dateStr = `${dayYear}-${dayMonth.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
        
        // Buscar si hay trabajo este día
        const workDay = allWorkDays.find(wd => wd.date === dateStr);
        const job = workDay ? jobs.find(j => j.id === workDay.jobId) : null;
        
        calendarDays.push({
          day: dayNum,
          dayOfWeek: dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1, // Ajustar para lunes = 0
          isToday: dayYear === today.getFullYear() && dayMonth === (today.getMonth() + 1) && dayNum === today.getDate(),
          workDay,
          job,
          isCurrentMonth: dayMonth === (today.getMonth() + 1) && dayYear === today.getFullYear(),
          date: dayDate
        });
      }
      
      setMiniCalendarData(calendarDays);
    } catch (error) {
      console.error('Error loading mini calendar data:', error);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next' | number) => {
    const directionValue = typeof direction === 'string' 
      ? (direction === 'prev' ? -1 : 1) 
      : direction;
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + (directionValue * 7));
    setCurrentWeekStart(newWeekStart);
    loadMiniCalendarData(newWeekStart, isIPadPortrait);
  };

  // Gesture handler for calendar swipe
  const calendarPanGesture = Gesture.Pan()
    .onEnd((event) => {
      const threshold = 50; // Minimum distance to trigger navigation
      
      if (Math.abs(event.translationX) > threshold) {
        if (event.translationX > 0) {
          // Swipe right - go to previous week
          runOnJS(navigateWeek)(-1);
        } else {
          // Swipe left - go to next week
          runOnJS(navigateWeek)(1);
        }
      }
    });

  // Load privacy notice dismissal state
  const loadPrivacyNoticeState = async () => {
    try {
      const dismissed = await AsyncStorage.getItem('auto_timer_privacy_notice_shown');
      setHasShownPrivacyNotice(dismissed === 'true');
    } catch (error) {
      console.error('Error loading privacy notice state:', error);
    }
  };

  // Handle privacy notice dismissal
  const handleDismissPrivacyNotice = async () => {
    console.log('🔔 MapLocation: Dismissing privacy notice');
    triggerHaptic('medium');
    
    // Animate privacy notice out
    privacyNoticeOpacity.value = withTiming(0, { duration: 300 });
    privacyNoticeTranslateY.value = withTiming(-20, { duration: 300 });
    
    try {
      await AsyncStorage.setItem('auto_timer_privacy_notice_shown', 'true');
      setHasShownPrivacyNotice(true);
      
      // Hide after animation completes
      setTimeout(() => {
        setShowPrivacyNotice(false);
      }, 300);
      
      console.log('🔔 MapLocation: Privacy notice dismissed and saved');
    } catch (error) {
      console.error('Error saving privacy notice state:', error);
      setHasShownPrivacyNotice(true);
      
      // Hide after animation completes
      setTimeout(() => {
        setShowPrivacyNotice(false);
      }, 300);
      
      console.log('🔔 MapLocation: Privacy notice dismissed (save failed but still hidden)');
    }
  };

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

    const handleAutoTimerAlert = (showAlert: boolean) => {
      if (showAlert && !hasShownActivationAlert) {
        console.log('🔔 AutoTimer alert is now handled in JobFormModal');
        setHasShownActivationAlert(true);
        
        // Alert is now shown in JobFormModal.tsx as a visual component
        // The alert will appear when user opens the Auto tab in JobFormModal
        // Alert.alert(
        //   t('timer.auto_timer.activation_title'),
        //   t('timer.auto_timer.activation_alert'),
        //   [{ 
        //     text: t('timer.auto_timer.dismiss_notice'), 
        //     style: 'default',
        //     onPress: () => {
        //       console.log('🔔 AutoTimer alert dismissed');
        //       // Reset flag after a delay to allow showing again later
        //       setTimeout(() => {
        //         setHasShownActivationAlert(false);
        //       }, 5000);
        //     }
        //   }]
        // );
        
        // Reset flag after a delay to allow showing again later
        setTimeout(() => {
          setHasShownActivationAlert(false);
        }, 60000); // Reset after 1 minute
      }
    };

    // Add listeners
    const handleAutoTimerPauseChange = (isPaused: boolean) => {
      console.log('🔄 MapLocation received AutoTimer pause change:', isPaused);
      setIsAutoTimerPaused(isPaused);
    };

    autoTimerService.addStatusListener(handleAutoTimerStatusChange);
    autoTimerService.addAlertListener(handleAutoTimerAlert);
    autoTimerService.addPauseListener(handleAutoTimerPauseChange);
    
    // Get current status immediately to sync with any ongoing countdown
    const currentStatus = autoTimerService.getStatus();
    setAutoTimerStatus(currentStatus);
    console.log('🔄 MapLocation: Synced with current AutoTimer status:', currentStatus.state, currentStatus.remainingTime);

    // Get current pause state
    const initializePauseState = async () => {
      const isPaused = await autoTimerService.isActiveTimerPaused();
      setIsAutoTimerPaused(isPaused);
      console.log('🔄 MapLocation: Synced with current pause state:', isPaused);
    };
    initializePauseState();

    // Cleanup on unmount
    return () => {
      autoTimerService.removeStatusListener(handleAutoTimerStatusChange);
      autoTimerService.removeAlertListener(handleAutoTimerAlert);
      autoTimerService.removePauseListener(handleAutoTimerPauseChange);
    };
  }, []); // Empty dependency array - runs only once

  // Force update AutoTimer status when screen gains focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 MapLocation: Screen focused, updating AutoTimer status');
      // Immediate update
      const currentStatus = autoTimerService.getStatus();
      setAutoTimerStatus(currentStatus);
      console.log('🔄 MapLocation: Updated status on focus:', currentStatus.state);
      
      // Also sync pause state on focus
      const syncPauseState = async () => {
        const isPaused = await autoTimerService.isActiveTimerPaused();
        setIsAutoTimerPaused(isPaused);
        console.log('🔄 MapLocation: Synced pause state on focus:', isPaused);
      };
      syncPauseState();
      
      // Reset mini calendar animations to prevent header issues
      miniCalendarOpacity.value = 0;
      miniCalendarTranslateY.value = -30;
      miniCalendarScale.value = 0.95;
      
      // Delayed update to catch any async state changes
      const timeoutId = setTimeout(async () => {
        const delayedStatus = autoTimerService.getStatus();
        setAutoTimerStatus(delayedStatus);
        console.log('🔄 MapLocation: Delayed status update:', delayedStatus.state);
        
        // Also sync pause state with delay
        const isPaused = await autoTimerService.isActiveTimerPaused();
        setIsAutoTimerPaused(isPaused);
        console.log('🔄 MapLocation: Delayed pause state sync:', isPaused);
        
        // Re-animate mini calendar if needed
        if ((!delayedStatus || delayedStatus.state === 'inactive') && !showPrivacyNotice) {
          miniCalendarOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
          miniCalendarTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
          miniCalendarScale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
        }
      }, 150);
      
      return () => clearTimeout(timeoutId);
    }, [autoTimerService, showPrivacyNotice])
  );

  // Update jobs in AutoTimer service when jobs change
  useEffect(() => {
    const updateAutoTimerJobs = async () => {
      if (jobs.length > 0) {
        // Check if any job has AutoTimer enabled
        const jobsWithAutoTimer = jobs.filter(job => job.autoTimer?.enabled);
        console.log('🔄 MapLocation: Jobs with AutoTimer enabled:', jobsWithAutoTimer.length, 'of', jobs.length);
        
        if (jobsWithAutoTimer.length > 0) {
          // Only start or update service if there are jobs with AutoTimer enabled
          if (!autoTimerService.isServiceEnabled()) {
            console.log('🚀 MapLocation: Starting AutoTimer service with enabled jobs');
            autoTimerService.start(jobs);
          } else {
            console.log('🔄 MapLocation: Service already running, updating jobs');
            await autoTimerService.updateJobs(jobs);
          }
        } else {
          // No jobs with AutoTimer enabled, stop the service if it's running
          if (autoTimerService.isServiceEnabled()) {
            console.log('🛑 MapLocation: No jobs with AutoTimer enabled, stopping service');
            await autoTimerService.stop();
          }
        }
      }
    };
    
    updateAutoTimerJobs();
  }, [jobs]);

// Load monthly overtime and total hours
  useEffect(() => {
    const loadMonthlyStats = async () => {
      const overtime = await calculateMonthlyOvertime();
      const totalHours = await calculateMonthlyTotalHours();
      setMonthlyOvertime(overtime);
      setMonthlyTotalHours(totalHours);
    };
    
    loadMonthlyStats();
    
    // Refresh every minute if timer is active
    const interval = setInterval(() => {
      loadMonthlyStats();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [autoTimerStatus?.state]);

  // Reload monthly stats when screen gains focus to sync with ReportsScreen edits
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 MapLocation: Screen focused, reloading monthly stats');
      const loadMonthlyStats = async () => {
        const overtime = await calculateMonthlyOvertime();
        const totalHours = await calculateMonthlyTotalHours();
        setMonthlyOvertime(overtime);
        setMonthlyTotalHours(totalHours);
      };
      loadMonthlyStats();
    }, [])
  );

  // Calculate elapsed time for active AutoTimer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    console.log('🔄 MapLocation elapsed time effect triggered, autoTimerStatus:', autoTimerStatus?.state, 'jobId:', autoTimerStatus?.jobId);
    
    if (autoTimerStatus?.state === 'active' && autoTimerStatus?.jobId) {
      // Start clock pulse animation
      clockPulse.value = withRepeat(
        withTiming(1.15, { duration: 1000 }),
        -1,
        true
      );
      const updateElapsedTime = async () => {
        // Check if timer is paused
        const activeSession = await JobService.getActiveSession();
        if (activeSession) {
          const isPaused = (activeSession as any).isPaused || false;
          setIsTimerPaused(isPaused);
          
          // Use AutoTimerService's getElapsedTime method directly
          const elapsed = await autoTimerService.getElapsedTime();
          
          console.log('⏱️ MapLocation updating elapsed time:', elapsed, 'seconds for job:', autoTimerStatus.jobId, 'isPaused:', isPaused);
          setElapsedTime(elapsed);
        }
      };

      // Update immediately and then every second
      updateElapsedTime();
      interval = setInterval(updateElapsedTime, 1000);
    } else {
      console.log('🔄 MapLocation: AutoTimer not active or no jobId, resetting elapsed time to 0');
      setElapsedTime(0);
      // Stop clock pulse animation
      clockPulse.value = withTiming(1, { duration: 300 });
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoTimerStatus?.state, autoTimerStatus?.jobId]);

  // Show privacy notice when auto timer activates for the first time
  useEffect(() => {
    console.log('🔔 MapLocation: Privacy notice effect - checking conditions:', {
      hasAutoTimerStatus: !!autoTimerStatus,
      autoTimerState: autoTimerStatus?.state,
      hasEnabledAutoTimer: jobs.some(job => job.autoTimer?.enabled),
      hasShownPrivacyNotice,
      showPrivacyNotice
    });
    
    if (autoTimerStatus && 
        autoTimerStatus.state !== 'inactive' && 
        jobs.some(job => job.autoTimer?.enabled) && 
        !hasShownPrivacyNotice && 
        !showPrivacyNotice) {
      console.log('🔔 MapLocation: Showing privacy notice');
      setShowPrivacyNotice(true);
      // Animate privacy notice in
      privacyNoticeOpacity.value = withTiming(1, { duration: 400 });
      privacyNoticeTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    }
  }, [autoTimerStatus, jobs, hasShownPrivacyNotice, showPrivacyNotice]);

  // Effect to animate mini calendar appearance/disappearance
  useEffect(() => {
    // Always show mini calendar unless on small screen
    const shouldShow = !isSmallScreen;
    
    console.log('📅 MapLocation: Mini calendar visibility check:', {
      shouldShow,
      currentlyShowing: shouldShowMiniCalendar,
      autoTimerActive: autoTimerStatus?.state !== 'inactive',
      hasEnabledAutoTimer: jobs.some(job => job.autoTimer?.enabled),
      showPrivacyNotice
    });

    if (shouldShow !== shouldShowMiniCalendar) {
      if (shouldShow) {
        // Show animation: fade in and slide down
        console.log('📅 MapLocation: Animating mini calendar IN');
        setShouldShowMiniCalendar(true);
        miniCalendarOpacity.value = withTiming(1, { duration: 400 });
        miniCalendarTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        miniCalendarScale.value = withSpring(1, { damping: 15, stiffness: 150 });
      } else {
        // Hide animation: fade out and slide up
        console.log('📅 MapLocation: Animating mini calendar OUT');
        miniCalendarOpacity.value = withTiming(0, { duration: 300 });
        miniCalendarTranslateY.value = withTiming(-30, { duration: 300 });
        miniCalendarScale.value = withTiming(0.95, { duration: 300, easing: Easing.inOut(Easing.ease) });
        
        // Hide after animation completes
        setTimeout(() => {
          setShouldShowMiniCalendar(false);
        }, 300);
      }
    }
  }, [autoTimerStatus, jobs, showPrivacyNotice, shouldShowMiniCalendar, isSmallScreen]);

  // Location tracking every 30 seconds when AutoTimer is active
  useEffect(() => {
    let locationInterval: NodeJS.Timeout;
    
    const isAutoTimerActive = autoTimerStatus?.state === 'active';
    
    if (isAutoTimerActive) {
      console.log('📍 MapLocation: Starting location tracking every 30s (AutoTimer active)');
      
      const updateLocation = async () => {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === 'granted') {
            const locationResult = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            setCurrentUserLocation({
              latitude: locationResult.coords.latitude,
              longitude: locationResult.coords.longitude,
            });
            console.log('📍 MapLocation: Location updated for AutoTimer tracking');
          }
        } catch (error) {
          console.error('Error updating location for AutoTimer:', error);
        }
      };
      
      // Update immediately, then every 30 seconds
      updateLocation();
      locationInterval = setInterval(updateLocation, 30000);
    } else {
      console.log('📍 MapLocation: Stopping location tracking (AutoTimer inactive)');
      setCurrentUserLocation(null);
    }
    
    return () => {
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, [autoTimerStatus?.state, jobs]);

  const calculateMonthlyOvertime = async (): Promise<number> => {
    try {
      const allWorkDays = await JobService.getWorkDays();
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      let totalOvertime = 0;
      
      allWorkDays.forEach((day: any) => {
        const dayDate = new Date(day.date);
        
        if (dayDate.getMonth() + 1 === currentMonth && 
            dayDate.getFullYear() === currentYear && 
            (day.type === 'work' || !day.type) && 
            day.overtime) {
          // Overtime is hours over 8
          totalOvertime += Math.max(0, (day.hours || 0) - 8);
        }
      });
      
      return totalOvertime;
    } catch (error) {
      console.error('Error calculating monthly overtime:', error);
      return 0;
    }
  };

  const calculateJobStatistics = async (job: Job): Promise<{ thisMonthHours: number; thisMonthDays: number }> => {
    try {
      const workDays = await JobService.getWorkDaysForJob(job.id);
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      let thisMonthHours = 0;
      let thisMonthDays = 0;
      
      workDays.forEach((day: any) => {
        const dayDate = new Date(day.date);
        
        // This month statistics
        if (dayDate.getMonth() + 1 === currentMonth && dayDate.getFullYear() === currentYear) {
          if (day.type === 'work') {
            thisMonthHours += day.hours;
            thisMonthDays++;
          }
        }
      });
      
      return {
        thisMonthHours,
        thisMonthDays
      };
    } catch (error) {
      console.error('Error calculating job statistics:', error);
      return {
        thisMonthHours: 0,
        thisMonthDays: 0
      };
    }
  };

  const loadJobs = async () => {
    try {
      const loadedJobs = await JobService.getJobs();
      console.log('📊 Jobs loaded with data:', loadedJobs.map(j => ({
        name: j.name,
        hourlyRate: j.hourlyRate,
        defaultHours: j.defaultHours,
        schedule: j.schedule,
        salary: j.salary,
        billing: j.billing
      })));
      const activeJobs = loadedJobs.filter(job => job.isActive);
      setJobs(activeJobs);
      
      // Load statistics for all jobs
      const statsMap = new Map();
      for (const job of activeJobs) {
        const stats = await calculateJobStatistics(job);
        statsMap.set(job.id, stats);
      }
      setJobStatistics(statsMap);
      
      // Reload calendar data when jobs change
      loadMiniCalendarData(undefined, isIPadPortrait);
      
      // Load last work session (any session, not just auto-timer)
      try {
        const workDays = await JobService.getWorkDays();
        console.log('📊 All workDays loaded:', workDays.length);
        console.log('📊 First 3 workDays:', workDays.slice(0, 3));
        
        // Filter for work sessions - look for ANY work day with hours > 0
        const workSessions = workDays.filter(day => {
          const isWork = (!day.type || day.type === 'work') && day.hours > 0;
          console.log('📊 Checking day:', {
            date: day.date,
            type: day.type,
            hours: day.hours,
            actualStart: day.actualStartTime,
            actualEnd: day.actualEndTime,
            isWork
          });
          return isWork;
        });
        
        console.log('📊 Work sessions found:', workSessions.length);
        
        if (workSessions.length > 0) {
          // Sort by date AND by createdAt/updatedAt to get the most recent
          const sortedSessions = workSessions.sort((a, b) => {
            // First try to sort by updatedAt
            if (a.updatedAt && b.updatedAt) {
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }
            // Then by createdAt
            if (a.createdAt && b.createdAt) {
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            // Finally by date
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });
          
          const lastSession = sortedSessions[0];
          console.log('📊 Last session found:', {
            date: lastSession.date,
            actualStart: lastSession.actualStartTime,
            actualEnd: lastSession.actualEndTime,
            hours: lastSession.hours
          });
          
          // Use actualStartTime/actualEndTime if available, otherwise use startTime/endTime
          const startTime = lastSession.actualStartTime || lastSession.startTime;
          const endTime = lastSession.actualEndTime || lastSession.endTime;
          
          if (startTime && endTime) {
            // Find the job name
            const job = activeJobs.find(j => j.id === lastSession.jobId);
            const jobName = job?.name || 'Trabajo';
            
            setLastAutoTimerSession({
              startTime: startTime,
              endTime: endTime,
              hours: lastSession.hours,
              jobName: jobName
            });
          }
        }
      } catch (error) {
        console.error('Error loading last work session:', error);
      }
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
        return `${t('maps.next_shift')} ${formatTimeCompact(nextShift.time)}`;
      } else {
        return `${t('maps.next_shift')} ${getDayName(nextShift.day)} ${formatTimeCompact(nextShift.time)}`;
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
      latitude: location?.latitude || 0,
      longitude: location?.longitude || 0,
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
      case 'pre-start':
        const seconds = Math.ceil(parseFloat(minutes));
        return t('timer.auto_timer.starting_in', { seconds });
      case 'entering':
        return t('timer.auto_timer.will_start', { minutes });
      case 'active':
        const timeDisplay = formatTime(elapsedTime);
        return isTimerPaused 
          ? `${t('timer.paused')} - ${timeDisplay}` 
          : `${t('timer.auto_timer.started_auto')} - ${timeDisplay}`;
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
    triggerHaptic('light');
    setEditingJob(null);
    setShowJobForm(true);
  };

  const handleEditJob = (job: Job) => {
    console.log('🟡 MapLocation: handleEditJob called for job:', job.name);
    console.log('🟡 MapLocation: showJobCardsModal was:', showJobCardsModal);
    console.log('🟡 MapLocation: shouldReopenJobCardsModal:', shouldReopenJobCardsModal);
    
    setEditingJob(job);
    setShowJobForm(true);
    // Remember if job cards modal was open and close it
    setWasJobCardsModalOpen(showJobCardsModal);
    setShowJobCardsModal(false);
    setSelectedJob(null);
    
    console.log('🟡 MapLocation: States after handleEditJob - showJobForm: true, showJobCardsModal: false');
  };

  const handleJobAction = (job: Job, action: 'timer' | 'calendar' | 'edit' | 'statistics' | 'delete' | 'map' | 'edit-auto') => {
    if (action === 'statistics') {
      navigateTo('reports', job);
      closeModal();
      return;
    }

    if (action === 'map') {
      // Navigate to job location without opening modal
      if (job.location?.latitude && job.location?.longitude && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: job.location.latitude,
          longitude: job.location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
      return;
    }

    if (action === 'edit') {
      // Set selectedEditType to null to use 'basic' as default
      setSelectedEditType(null);
      handleEditJob(job);
      closeModal();
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
                closeModal();
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
        closeModal();
        navigateTo('timer', job);
        break;
      case 'calendar':
        navigateTo('calendar', job);
        closeModal();
        break;
      case 'edit-auto':
        closeModal();
        setSelectedEditType('location');
        handleEditJob(job);
        break;
    }
  };

  const handleJobFormSave = async () => {
    try {
      console.log('💾 MapLocation: Saving job data');
      console.log('💾 MapLocation: Is editing?', !!editingJob);
      
      const wasEditing = !!editingJob;
      
      await loadJobs();
      
      // Sync jobs with widget after saving
      console.log('🔄 MapLocation: Syncing jobs with widget...');
      await WidgetSyncService.syncJobsToWidget();
      console.log('✅ MapLocation: Widget sync completed');
      
      setShowJobForm(false);
      setEditingJob(null);
      
      // If we were editing a job and the modal was open, reopen it (but not if coming from settings button)
      if (wasEditing && wasJobCardsModalOpen && shouldReopenJobCardsModal) {
        setTimeout(() => {
          setShowJobCardsModal(true);
          setWasJobCardsModalOpen(false);
          setShouldReopenJobCardsModal(false);
        }, 100);
      } else {
        // Reset flags
        setWasJobCardsModalOpen(false);
        setShouldReopenJobCardsModal(false);
      }
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  // Función para manejar la selección de categoría de edición
  const handleEditCategory = (category: 'schedule' | 'location' | 'financial' | 'billing') => {
    setSelectedEditType(category);
    
    // Si solo hay 1 trabajo, ir directo a JobFormModal
    if (jobs.length === 1) {
      setEditingJob(jobs[0]);
      setShowJobForm(true);
    } else {
      // Si hay más de 1 trabajo, mostrar el selector
      setShowJobSelector(true);
    }
  };

  // Función para manejar la selección de trabajo
  const handleJobSelect = (job: Job) => {
    setEditingJob(job);
    setShowJobForm(true);
    setShowJobSelector(false);
  };

  // Función para obtener información de edición
  const getEditInfo = (type: string) => {
    switch (type) {
      case 'schedule':
        return {
          title: t('edit.schedule.title'),
          subtitle: t('edit.schedule.subtitle'),
          tab: 'schedule' as const,
        };
      case 'location':
        return {
          title: t('edit.autotimer.title'),
          subtitle: t('edit.autotimer.subtitle'),
          tab: 'auto' as const,
        };
      case 'financial':
        return {
          title:  t('edit.financial.title'),
          subtitle: t('edit.financial.subtitle'),
          tab: 'financial' as const,
        };
      case 'billing':
        return {
          title: t('edit.billing.title'),
          subtitle: t('edit.billing.subtitle'),
          tab: 'billing' as const,
        };
      default:
        return {
          title: t('edit.schedule.title'),
          subtitle: t('edit.schedule.subtitle'),
          tab: 'schedule' as const,
        };
    }
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
          delayStart: job.autoTimer?.delayStart ?? 0,
          delayStop: job.autoTimer?.delayStop ?? 0,
          notifications: job.autoTimer?.notifications !== false,
        }
      };

      await JobService.updateJob(job.id, updatedJob);
      await loadJobs();
      
      // Restart AutoTimer service with updated jobs
      const updatedJobs = await JobService.getJobs();
      if (autoTimerService.isServiceEnabled()) {
        console.log('🔄 Restarting AutoTimer service with updated jobs after toggle');
        await autoTimerService.stop();
        await autoTimerService.start(updatedJobs);
      } else if (value) {
        console.log('🚀 Starting AutoTimer service after enabling AutoTimer');
        await autoTimerService.start(updatedJobs);
      }
      
      if (value) {
        // Auto-navegar al lugar del trabajo cuando se habilita auto timer
        if (job.location?.latitude && job.location?.longitude && mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: job.location.latitude,
            longitude: job.location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error updating auto-timer:', error);
      Alert.alert(
        t('maps.error'),
        t('maps.auto_timer_error')
      );
    }
  };

  const handleAutoTimerPause = async () => {
    try {
      console.log('⏸️ Pausing AutoTimer from widget');
      const success = await autoTimerService.pauseActiveTimer();
      if (success) {
        triggerHaptic('light');
        // The state will be updated in the next useEffect cycle
      } else {
        Alert.alert(
          t('maps.error'),
          t('maps.error')
        );
      }
    } catch (error) {
      console.error('Error pausing AutoTimer:', error);
      Alert.alert(
        t('maps.error'),
        t('maps.error')
      );
    }
  };

  const handleAutoTimerResume = async () => {
    try {
      console.log('▶️ Resuming AutoTimer from widget');
      const success = await autoTimerService.resumeActiveTimer();
      if (success) {
        triggerHaptic('light');
        // The state will be updated in the next useEffect cycle
      } else {
        Alert.alert(
          t('maps.error'),
          t('maps.error')
        );
      }
    } catch (error) {
      console.error('Error resuming AutoTimer:', error);
      Alert.alert(
        t('maps.error'),
        t('maps.error')
      );
    }
  };

  const handleAutoTimerWidgetStop = async () => {
    try {
      // Find the active job for the AutoTimer
      if (!autoTimerStatus?.jobId) {
        console.log('❌ No active AutoTimer job found');
        return;
      }
      
      const activeJob = jobs.find(job => job.id === autoTimerStatus.jobId);
      if (!activeJob) {
        console.log('❌ Active job not found in jobs array');
        return;
      }
      
      console.log('🛑 Stopping AutoTimer and opening JobFormModal:', activeJob.name);
      
      // Mostrar alerta de confirmación igual que en JobFormModal
      Alert.alert(
        t('timer.auto_timer.manual_override'),
        t('timer.auto_timer.manual_override_message'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { 
            text: t('timer.stop'), 
            style: 'destructive',
            onPress: async () => {
              try {
                // Primero verificar si hay una sesión activa para este trabajo
                const activeSession = await JobService.getActiveSession();
                if (activeSession && activeSession.jobId === activeJob.id) {
                  console.log('🛑 MapLocation Widget: Stopping active timer because AutoTimer was disabled');
                  
                  // Calcular el tiempo transcurrido
                  const sessionStart = new Date(activeSession.startTime);
                  const now = new Date();
                  const elapsedMs = now.getTime() - sessionStart.getTime();
                  const elapsedHours = Math.max(0.01, parseFloat(((elapsedMs / (1000 * 60 * 60))).toFixed(2)));
                  
                  // Guardar el día de trabajo antes de limpiar la sesión
                  const today = new Date().toISOString().split('T')[0];
                  const workDay = {
                    date: today,
                    jobId: activeJob.id,
                    hours: elapsedHours,
                    notes: activeSession.notes || 'Auto-stopped (AutoTimer disabled)',
                    overtime: elapsedHours > 8,
                    type: 'work' as const,
                    // Add actual start and end times for display in reports
                    actualStartTime: sessionStart.toTimeString().substring(0, 5), // HH:MM format
                    actualEndTime: now.toTimeString().substring(0, 5), // HH:MM format
                  };
                  await JobService.addWorkDay(workDay);
                  
                  // Limpiar la sesión activa
                  await JobService.clearActiveSession();
                  
                  // IMPORTANTE: Enviar notificación que terminará el Live Activity
                  const NotificationService = require('../services/NotificationService').default;
                  const notificationService = NotificationService.getInstance();
                  await notificationService.sendNotification('timer_stopped', activeJob.name, {
                    hours: elapsedHours.toFixed(2),
                    reason: 'AutoTimer was disabled'
                  });
                  console.log('📱 Notification sent to stop Live Activity');
                  
                  // También intentar terminar directamente (por si la notificación no funciona)
                  const LiveActivityService = require('../services/LiveActivityService').default;
                  const liveActivityService = LiveActivityService.getInstance();
                  await liveActivityService.endLiveActivity(Math.floor(elapsedHours * 3600));
                }
                
                // También cancelar cualquier AutoTimer activo para este trabajo
                const autoTimerService = AutoTimerService.getInstance();
                await autoTimerService.cancelPendingAction();
                
                // Detener el servicio AutoTimer
                autoTimerService.stop();
                
                // Poner el sistema en modo manual
                await autoTimerService.setManualMode();
                
                // Desactivar AutoTimer para el trabajo activo
                const updatedJob: Job = {
                  ...activeJob,
                  autoTimer: {
                    ...activeJob.autoTimer,
                    enabled: false,
                    geofenceRadius: activeJob.autoTimer?.geofenceRadius || 100,
                    delayStart: activeJob.autoTimer?.delayStart ?? 0,
                    delayStop: activeJob.autoTimer?.delayStop ?? 0,
                    notifications: activeJob.autoTimer?.notifications !== false,
                  }
                };
                
                await JobService.updateJob(activeJob.id, updatedJob);
                
                // Refresh jobs list
                const updatedJobs = await JobService.getJobs();
                setJobs(updatedJobs);
                
                // Navigate to ReportsScreen and open last session modal
                navigateTo('reports', undefined, { openLastSession: true });
              } catch (error) {
                console.error('Error stopping AutoTimer from widget:', error);
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Error stopping AutoTimer:', error);
    }
  };

  const getJobStatistics = (job: Job): { thisMonthHours: number; thisMonthDays: number } | null => {
    return jobStatistics.get(job.id) || null;
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
    
    // Open action modal with animation
    setSelectedJob(job);
    
    // Animate modal appearance
    modalScale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
      mass: 1,
    });
    modalOpacity.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.quad),
    });
  };

  const closeModal = () => {
    // Animate modal disappearance
    modalScale.value = withTiming(0, {
      duration: 150,
      easing: Easing.in(Easing.quad),
    });
    modalOpacity.value = withTiming(0, {
      duration: 150,
      easing: Easing.in(Easing.quad),
    });
    
    // Clear selected job after animation
    setTimeout(() => {
      setSelectedJob(null);
    }, 150);
  };

  return (





        <View style={styles.map}>


       
            {/* 6 WIDGET CARDS - MODERN GRADIENT STYLE */}
            <View style={{
                position: 'absolute',
                top: isTablet ? 40 : (isSmallScreen ? 30 : 35),
                left: isTablet ? 20 : (isSmallScreen ? 8 : 12),
                right: isTablet ? 20 : (isSmallScreen ? 8 : 12),
                bottom: isTablet ? 100 : (isSmallScreen ? 80 : 90),
                flexDirection: 'column',
                gap: isTablet ? 32 : (isSmallScreen ? 12 : 24),
                paddingHorizontal: isTablet ? 12 : (isSmallScreen ? 4 : 6),
              }}>
                {/* TOP ROW - 2 WIDGETS */}
                <View style={{
                  flexDirection: 'row',
                  gap: isTablet ? 28 : (isSmallScreen ? 12 : 20),
                  height: isTablet ? 160 : (isSmallScreen ? 120 : 140),
                }}>
                  {/* JOBS WIDGET - Hide when auto-timer is active */}
                  {autoTimerStatus?.state === 'inactive' && (
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      borderRadius: isTablet ? 28 : (isSmallScreen ? 20 : 24),
                      padding: isTablet ? 22 : (isSmallScreen ? 10 : 18),
                      backgroundColor: isDark ? 'rgba(96, 165, 250, 0.12)' : 'rgba(147, 197, 253, 0.25)',
                      backdropFilter: 'blur(20px)',
                      borderWidth: 1.5,
                      borderColor: isDark ? 'rgba(96, 165, 250, 0.25)' : 'rgba(59, 130, 246, 0.3)',
                      shadowColor: '#3b82f6',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 20,
                      elevation: 5,
                    }}
                    onPress={() => {
                      if (jobs.length === 0) {
                        setShowJobForm(true);
                      } else {
                        setShowJobCardsModal(true);
                      }
                    }}
                    activeOpacity={0.9}
                  >
                    <View style={{ flexDirection: isTablet ? 'row' : 'column', alignItems: 'center', justifyContent: isTablet ? 'space-between' : 'center', flex: 1 }}>

{jobs.length <= 3 && (
                      <Animated.View style={[{
                        backgroundColor: isDark ? 'rgba(96, 165, 250, 0.25)' : 'rgba(59, 130, 246, 0.2)',
                        borderRadius: isTablet ? 20 : 12,
                        padding: isTablet ? 16 : (isSmallScreen ? 8 : 10),
                        marginBottom: isTablet ? 0 : (isSmallScreen ? 4 : 8),
                        marginRight: isTablet ? 20 : 0,
                      }, jobs.length === 0 ? animatedNoJobsIconStyle : {}]}>
                        <IconSymbol size={isTablet ? 36 : (isSmallScreen ? 18 : 22)} name={jobs.length === 0 ? "plus.circle.fill" : "briefcase.fill"} color={isDark ? '#93c5fd' : '#2563eb'} />
                      </Animated.View>
                      )}
                      <View style={{ flex: isTablet ? 1 : undefined, alignItems: isTablet ? 'flex-start' : 'center' }}>
                        {jobs.length === 0 ? (
                          <>
                            <Animated.Text style={[{
                              fontSize: isTablet ? 16 : (isSmallScreen ? 11 : 13),
                              fontWeight: '600',
                              color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#6b7280',
                              marginBottom: isTablet ? 6 : (isSmallScreen ? 2 : 4),
                            }, animatedNoJobsTextStyle]}>{t('maps.no_jobs')}</Animated.Text>
                            <Animated.View style={[{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                              paddingHorizontal: isTablet ? 16 : 12,
                              paddingVertical: isTablet ? 10 : 8,
                              borderRadius: isTablet ? 14 : 10,
                              marginTop: 4,
                            }, animatedNoJobsTextStyle]}>
                              <IconSymbol size={isTablet ? 20 : 16} name="plus.circle.fill" color={isDark ? '#93c5fd' : '#2563eb'} />
                              <Text style={{
                                fontSize: isTablet ? 15 : (isSmallScreen ? 11 : 13),
                                fontWeight: '600',
                                color: isDark ? '#93c5fd' : '#2563eb',
                              }}>{t('maps.add_job')}</Text>
                            </Animated.View>
                          </>
                        ) : (
                          <>
                            {/* Title */}
                            <Text style={{
                              fontSize: isTablet ? 16 : (isSmallScreen ? 11 : 13),
                              fontWeight: '600',
                              color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#6b7280',
                              marginBottom: isTablet ? 8 : (isSmallScreen ? 4 : 6),
                              textAlign: 'center',
                            }}>{t('maps.active_jobs')}</Text>
                            
                            {/* Content row */}
                            <View style={{ 
                              flexDirection: 'row', 
                              alignItems: 'flex-start', 
                              justifyContent: 'flex-start',
                              width: '100%',
                              paddingLeft: isTablet ? 10 : 5
                            }}>
                              {/* Left side - Number */}
                              <View style={{ alignItems: 'center', marginRight: isTablet ? 12 : 8 }}>
                                <Text style={{
                                  fontSize: isTablet ? 42 : (isSmallScreen ? 22 : 26),
                                  fontWeight: '700',
                                  color: isDark ? 'white' : '#1e40af',
                                }}>{jobs.length}</Text>
                              </View>
                              
                              {/* Right side - Job names */}
                              <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center', minHeight: isTablet ? 42 : 26 }}>
                                {jobs.slice(0, 3).map((job, index) => (
                                  <View key={job.id} style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginBottom: index < Math.min(jobs.length - 1, 2) ? (isTablet ? 4 : 2) : 0,
                                  }}>
                                    <View style={{
                                      width: isTablet ? 6 : 4,
                                      height: isTablet ? 6 : 4,
                                      borderRadius: isTablet ? 3 : 2,
                                      backgroundColor: isDark ? '#93c5fd' : '#2563eb',
                                      marginRight: isTablet ? 8 : 6,
                                    }} />
                                    <Text style={{
                                      fontSize: isTablet ? 15 : (isSmallScreen ? 11 : 13),
                                      color: isDark ? 'rgba(255, 255, 255, 0.9)' : '#374151',
                                      fontWeight: '500',
                                      lineHeight: isTablet ? 20 : (isSmallScreen ? 15 : 17),
                                    }}>
                                      {job.name.length > (isSmallScreen ? 10 : 13) 
                                        ? job.name.substring(0, isSmallScreen ? 10 : 13) + '...' 
                                        : job.name}
                                    </Text>
                                  </View>
                                ))}
                                {jobs.length > 3 && (
                                  <Text style={{
                                    fontSize: isTablet ? 13 : (isSmallScreen ? 9 : 11),
                                    color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#9ca3af',
                                    fontStyle: 'italic',
                                  }}>+{jobs.length - 3} {t('common.more')}...</Text>
                                )}
                              </View>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                  )}
                  
                  {/* TIMER WIDGET - Hide when auto-timer is active */}
                  {autoTimerStatus?.state === 'inactive' && (
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      borderRadius: isTablet ? 28 : (isSmallScreen ? 20 : 24),
                      padding: isTablet ? 22 : (isSmallScreen ? 10 : 18),
                      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(110, 231, 183, 0.25)',
                      backdropFilter: 'blur(20px)',
                      borderWidth: 1.5,
                      borderColor: isDark ? 'rgba(52, 211, 153, 0.25)' : 'rgba(16, 185, 129, 0.3)',
                      shadowColor: '#10b981',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 20,
                      elevation: 5,
                    }}
                    onPress={() => handleEditCategory('location')}
                    activeOpacity={0.9}
                  >
                    <View style={{ 
                      flexDirection: isTablet ? 'row' : 'column', 
                      alignItems: 'center', 
                      justifyContent: isTablet && autoTimerStatus?.state !== 'inactive' ? 'center' : (isTablet ? 'space-between' : 'center'), 
                      flex: 1 
                    }}>
                            {autoTimerStatus?.state === 'inactive' && (
                      <Animated.View style={[animatedClockStyle, {
                        backgroundColor: isDark ? 'rgba(52, 211, 153, 0.25)' : 'rgba(16, 185, 129, 0.2)',
                        borderRadius: isTablet ? 20 : 12,
                        padding: isTablet ? 16 : (isSmallScreen ? 8 : 10),
                        marginBottom: isTablet ? 0 : (isSmallScreen ? 4 : 8),
                        marginRight: isTablet ? 20 : 0,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: isTablet ? 8 : 6,
                      }]}>
                        <View style={{
                          width: isTablet ? 12 : 8,
                          height: isTablet ? 12 : 8,
                          borderRadius: isTablet ? 6 : 4,
                          backgroundColor: autoTimer.state.isWaiting ? '#34C759' : (jobs.some(job => job.autoTimer?.enabled) ? '#34C759' : '#FF3B30'),
                        }} />
                        <Text style={{
                          fontSize: isTablet ? 14 : (isSmallScreen ? 10 : 12),
                          fontWeight: '700',
                          color: isDark ? '#6ee7b7' : '#059669',
                        }}>
                          AutoTimer
                        </Text>
                      </Animated.View>
          )}

                      <View style={{ flex: isTablet ? 1 : undefined, alignItems: isTablet ? 'flex-start' : 'center' }}>
                        {/* Show text only when AutoTimer is NOT active */}
      
                          <Text style={{
                            fontSize: isTablet ? 16 : (isSmallScreen ? 11 : 13),
                            fontWeight: '700',
                            color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#6b7280',
                          }}>
                            {autoTimer.state.isWaiting ? 'AutoTimer' : (lastAutoTimerSession ? (
                              <>
                                <Text style={{ fontWeight: '700' }}>{t('timer.last_session')}</Text>
                                <Text style={{ fontWeight: '400', opacity: 0.7 }}> {lastAutoTimerSession.jobName}</Text>
                              </>
                            ) : t('maps.auto_timer'))}
                          </Text>
            
                        <Text style={{
                          fontSize: isTablet ? 24 : (isSmallScreen ? 14 : 17),
                          fontWeight: '600',
                          color: isDark ? 'white' : '#047857',
                          marginTop: isTablet ? 0 : (isSmallScreen ? 2 : 4),
                          letterSpacing: isTablet ? 0.7 : (isSmallScreen ? 0.3 : 0.5),
                        }}>
                          {autoTimer.state.isWaiting ? 'Waiting' : (lastAutoTimerSession && autoTimerStatus?.state === 'inactive' ? 
                            `${formatTimeCompact(lastAutoTimerSession.startTime)} - ${formatTimeCompact(lastAutoTimerSession.endTime)}` : 
                            formatTime(elapsedTime))}
                        </Text>
      
                                                                   <Text style={{
                          fontSize: isTablet ? 14 : (isSmallScreen ? 9 : 11),
                          color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#9ca3af',
                          marginTop: isTablet ? 4 : (isSmallScreen ? 2 : 4),
                        }}>

                                                      {lastAutoTimerSession && autoTimerStatus?.state === 'inactive' ?
                            `${t('reports.total_hours')}: ${lastAutoTimerSession.hours.toFixed(2)}h` :
                            t('maps.auto_timer_inactive')}
                        </Text>
                        {/* Pause/Play and Stop buttons - show below when AutoTimer is active */}
                        {autoTimerStatus?.state !== 'inactive' && (
                          <View style={{
                            flexDirection: 'row',
                            gap: isSmallScreen ? 6 : 8,
                            alignSelf: 'center',
                            justifyContent: 'center',
                            marginTop: isTablet ? 12 : (isSmallScreen ? 8 : 10),
                          }}>
                            <TouchableOpacity
                              onPress={isAutoTimerPaused ? handleAutoTimerResume : handleAutoTimerPause}
                              style={{
                                backgroundColor: isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                                borderRadius: 12,
                                padding: isSmallScreen ? 6 : 8,
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(52, 211, 153, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                              }}
                              activeOpacity={0.7}
                            >
                              <IconSymbol 
                                size={isSmallScreen ? 16 : 18} 
                                name={isAutoTimerPaused ? "play.fill" : "pause.fill"} 
                                color={isDark ? '#6ee7b7' : '#059669'} 
                              />
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              onPress={handleAutoTimerWidgetStop}
                              style={{
                                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                                borderRadius: 12,
                                padding: isSmallScreen ? 6 : 8,
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                              }}
                              activeOpacity={0.7}
                            >
                              <IconSymbol 
                                size={isSmallScreen ? 16 : 18} 
                                name="stop.fill" 
                                color={isDark ? '#fca5a5' : '#dc2626'} 
                              />
                            </TouchableOpacity>
                            
                          </View>
                          
                        )}

                      </View>
                      
                    </View>
                  </TouchableOpacity>
                  )}
                </View>

                {/* MIDDLE ROW - CALENDAR + SCHEDULES */}

                  {autoTimerStatus?.state === 'inactive' && (

                <View style={{
                  flexDirection: 'row',
                  gap: isTablet ? 28 : (isSmallScreen ? 12 : 20),
                  height: isTablet ? 165 : (isSmallScreen ? 125 : 145),
                }}>
                  {/* CALENDAR WIDGET */}
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: isDark ? 'rgba(30, 30, 40, 0.92)' : 'rgba(255, 255, 255, 0.98)',
                      borderWidth: 1.5,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                      borderRadius: isTablet ? 28 : (isSmallScreen ? 20 : 24),
                      padding: isTablet ? 20 : 16,
                      shadowColor: isDark ? '#000' : '#6b7280',
                      shadowOffset: { width: 0, height: isDark ? 8 : 4 },
                      shadowOpacity: isDark ? 0.4 : 0.12,
                      shadowRadius: isDark ? 25 : 20,
                      elevation: isDark ? 8 : 5,
                      backdropFilter: 'blur(25px)',
                    }}
                    onPress={() => onNavigate?.('calendar')}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: isTablet ? 14 : 10 }}>
                      <Text style={{
                        fontSize: isTablet ? 18 : 15,
                        fontWeight: '700',
                        color: isDark ? 'rgba(255, 255, 255, 0.95)' : '#1f2937',
                        letterSpacing: -0.4,
                      }}>{t('calendar.title')}</Text>
                      <View style={{
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.12)',
                        borderRadius: isTablet ? 12 : 10,
                        padding: isTablet ? 6 : 4,
                      }}>
                        <IconSymbol size={isTablet ? 20 : 18} name="calendar" color={isDark ? '#60a5fa' : '#3b82f6'} />
                      </View>
                    </View>
                    

                    {/* Show next days - 7 for iPad, 3 for phones */}
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <View style={{ 
                        flexDirection: 'row', 
                        gap: isTablet ? 10 : 8,
                        justifyContent: 'space-between',
                      }}>
                        {(() => {
                          const today = new Date();
                          const todayIndex = miniCalendarData.findIndex(d => d.isToday);
                          const daysToShow = isTablet ? 7 : 3;
                          let nextDays = todayIndex >= 0 ? miniCalendarData.slice(todayIndex, todayIndex + daysToShow) : [];
                          
                          // Si no hay suficientes días (fin de semana), buscar días adicionales
                          if (nextDays.length < daysToShow) {
                            const missingDays = daysToShow - nextDays.length;
                            // Buscar los días que faltan del array completo de miniCalendarData
                            const lastDayIndex = todayIndex + nextDays.length;
                            const additionalDays = miniCalendarData.slice(lastDayIndex, lastDayIndex + missingDays);
                            
                            if (additionalDays.length > 0) {
                              nextDays = [...nextDays, ...additionalDays];
                            }
                            
                            // Si aún faltan días, crear días vacíos
                            if (nextDays.length < daysToShow) {
                              const stillMissing = daysToShow - nextDays.length;
                              const lastDay = nextDays[nextDays.length - 1];
                              const startDate = lastDay?.date ? new Date(lastDay.date) : new Date();
                              
                              for (let i = 1; i <= stillMissing; i++) {
                                const date = new Date(startDate);
                                date.setDate(startDate.getDate() + i);
                                nextDays.push({
                                  day: date.getDate(),
                                  dayOfWeek: date.getDay() === 0 ? 6 : date.getDay() - 1,
                                  isToday: false,
                                  workDay: null,
                                  job: null,
                                  isCurrentMonth: date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear(),
                                  date: date
                                });
                              }
                            }
                          }
                          
                          // Si aún no hay días (array vacío), crear días por defecto
                          if (nextDays.length === 0) {
                            for (let i = 0; i < daysToShow; i++) {
                              const date = new Date();
                              date.setDate(date.getDate() + i);
                              nextDays.push({
                                day: date.getDate(),
                                isToday: i === 0,
                                workDay: null
                              });
                            }
                          }
                          
                          return nextDays.map((dayData, i) => {
                            let badgeColor = null;
                            let badgeIcon = null;
                            if (dayData.workDay) {
                              switch (dayData.workDay.type) {
                                case 'work':
                                  badgeColor = '#3b82f6';
                                  badgeIcon = 'briefcase';
                                  break;
                                case 'free':
                                  badgeColor = '#10b981';
                                  badgeIcon = 'home';
                                  break;
                                case 'vacation':
                                  badgeColor = '#facc15';
                                  badgeIcon = 'sunny';
                                  break;
                                case 'sick':
                                  badgeColor = '#ef4444';
                                  badgeIcon = 'medkit';
                                  break;
                              }
                            }
                            
                            return (
                              <View
                                key={i}
                                style={{
                                  flex: 1,
                                  height: isTablet ? 76 : 70,
                                  maxWidth: isTablet ? 64 : 50,
                                  backgroundColor: dayData.isToday
                                    ? (isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.12)')
                                    : (badgeColor ? (isDark ? `${badgeColor}15` : `${badgeColor}10`) : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)')),
                                  borderRadius: 14,
                                  borderWidth: dayData.isToday ? 1.5 : 1,
                                  borderColor: dayData.isToday
                                    ? (isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.25)')
                                    : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'),
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                <View style={{ alignItems: 'center' }}>
                                  
                                  <Text style={{
                                    fontSize: isTablet ? 11 : 10,
                                    color: dayData.isToday ? '#3b82f6' : (isDark ? 'rgba(255, 255, 255, 0.65)' : '#6b7280'),
                                    fontWeight: '700',
                                    marginBottom: 3,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                  }}>
                                    {(() => {
                                      const date = new Date();
                                      date.setDate(date.getDate() + i);
                                      const dayName = t(`calendar.days_short.${['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()]}`);
                                      return dayName.slice(0, 3);
                                    })()}
                                  </Text>
                                  
                                  <Text style={{
                                    fontSize: isTablet ? 22 : 19,
                                    color: dayData.isToday ? '#3b82f6' : (isDark ? 'rgba(255, 255, 255, 0.95)' : '#1f2937'),
                                    fontWeight: dayData.isToday ? '800' : '700',
                                    letterSpacing: -0.3,
                                  }}>
                                    {dayData.day}
                                  </Text>
                            {badgeIcon && badgeColor && (
                                    <View style={{
                                      backgroundColor: badgeColor,
                                      borderRadius: 8,
                                      width: isTablet ? 16 : 14,
                                      height: isTablet ? 16 : 14,
                                      justifyContent: 'center',
                                      shadowColor: badgeColor,
                                      shadowOffset: { width: 0, height: 1 },
                                      shadowOpacity: 0.2,
                                      shadowRadius: 2,
                                      elevation: 2,
                                      alignItems: 'center',
                                      marginTop: 3,
                                    }}>
                                      <Ionicons 
                                        name={badgeIcon as any} 
                                        size={isTablet ? 10 : 9} 
                                        color="#ffffff"
                                      />
                                    </View>
                                  )}
                                </View>
                       
                              </View>

                              
                            );
                          });
                        })()}
                        
                      </View>
                      {/* Work indicators below days */}
                      <View style={{ 
                        flexDirection: 'row', 
                        gap: isTablet ? 10 : 8,
                        justifyContent: 'space-between',
                        marginTop: isTablet ? 8 : 10,
                      }}>
                        {(() => {
                          const today = new Date();
                          const todayIndex = miniCalendarData.findIndex(d => d.isToday);
                          const daysToShow = isTablet ? 7 : 3;
                          let nextDays = todayIndex >= 0 ? miniCalendarData.slice(todayIndex, todayIndex + daysToShow) : [];
                          
                          // Si no hay suficientes días (fin de semana), buscar días adicionales
                          if (nextDays.length < daysToShow) {
                            const missingDays = daysToShow - nextDays.length;
                            // Buscar los días que faltan del array completo de miniCalendarData
                            const lastDayIndex = todayIndex + nextDays.length;
                            const additionalDays = miniCalendarData.slice(lastDayIndex, lastDayIndex + missingDays);
                            
                            if (additionalDays.length > 0) {
                              nextDays = [...nextDays, ...additionalDays];
                            }
                            
                            // Si aún faltan días, crear días vacíos
                            if (nextDays.length < daysToShow) {
                              const stillMissing = daysToShow - nextDays.length;
                              const lastDay = nextDays[nextDays.length - 1];
                              const startDate = lastDay?.date ? new Date(lastDay.date) : new Date();
                              
                              for (let i = 1; i <= stillMissing; i++) {
                                const date = new Date(startDate);
                                date.setDate(startDate.getDate() + i);
                                nextDays.push({
                                  day: date.getDate(),
                                  dayOfWeek: date.getDay() === 0 ? 6 : date.getDay() - 1,
                                  isToday: false,
                                  workDay: null,
                                  job: null,
                                  isCurrentMonth: date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear(),
                                  date: date
                                });
                              }
                            }
                          }
                          
                          // Si aún no hay días (array vacío), crear días por defecto
                          if (nextDays.length === 0) {
                            for (let i = 0; i < daysToShow; i++) {
                              const date = new Date();
                              date.setDate(date.getDate() + i);
                              nextDays.push({
                                day: date.getDate(),
                                isToday: i === 0,
                                workDay: null
                              });
                            }
                          }
                          
                          return nextDays.map((dayData, i) => {
                            const isWork = dayData.workDay?.type === 'work';
                            return (
                              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                        
                              </View>
                            );
                          });
                        })()}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* SCHEDULES WIDGET */}
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(168, 85, 247, 0.25)',
                      backdropFilter: 'blur(20px)',
                      borderWidth: 1.5,
                      borderColor: isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(147, 51, 234, 0.3)',
                      borderRadius: isTablet ? 28 : (isSmallScreen ? 20 : 24),
                      padding: isTablet ? 22 : (isSmallScreen ? 12 : 18),
                      shadowColor: '#8b5cf6',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 20,
                      elevation: 5,
                    }}
                    onPress={() => handleEditCategory('schedule')}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: isTablet ? 'row' : 'column', alignItems: 'center', justifyContent: isTablet ? 'space-between' : 'center', flex: 1 }}>
                      {isTablet && (
                        <View style={{
                          backgroundColor: isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(147, 51, 234, 0.2)',
                          borderRadius: 20,
                          padding: 16,
                          marginRight: 20,
                        }}>
                          <IconSymbol size={36} name="clock.badge" color={isDark ? '#c084fc' : '#8b5cf6'} />
                        </View>
                      )}
                      <View style={{ flex: isTablet ? 1 : undefined, alignItems: isTablet ? 'flex-start' : 'center' }}>
                        <Text style={{
                          fontSize: isTablet ? 16 : 13,
                          fontWeight: '600',
                          color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#581c87',
                          marginBottom: isTablet ? 6 : 8,
                        }}>{t('settings.work_config.schedules')}</Text>
                        {(() => {
                        const job = jobs[0];
                        if (!job) {
                          return (
                            <Text style={{
                              fontSize: 14,
                              fontWeight: '500',
                              color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#7c3aed',
                              marginTop: 8,
                            }}>{t('maps.configure_schedule')}</Text>
                          );
                        }
                        
                        // Check for weekly schedule first
                        if (job.schedule?.weeklySchedule) {
                          const schedules = Object.values(job.schedule.weeklySchedule).filter(s => s !== null);
                          if (schedules.length > 0) {
                            const firstSchedule = schedules[0];
                            return (
                              <>
                                <Text style={{
                                  fontSize: isTablet ? 18 : (isSmallScreen ? 14 : 16),
                                  fontWeight: '600',
                                  color: isDark ? 'white' : '#581c87',
                                }}>
                                  {formatTimeCompact(firstSchedule.startTime)} - {formatTimeCompact(firstSchedule.endTime)}
                                </Text>
                                <Text style={{
                                  fontSize: 11,
                                  color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#a855f7',
                                  marginTop: 2,
                                }}>
                                  {schedules.length} {t('calendar.days_per_week')}
                                </Text>
                              </>
                            );
                          }
                        }
                        
                        // Check for simple schedule
                        if (job.schedule?.startTime && job.schedule?.endTime) {
                          return (
                            <>
                              <Text style={{
                                fontSize: isTablet ? 18 : (isSmallScreen ? 14 : 16),
                                fontWeight: '600',
                                color: isDark ? 'white' : '#581c87',
                              }}>
                                {formatTimeCompact(job.schedule.startTime)} - {formatTimeCompact(job.schedule.endTime)}
                              </Text>
                              <Text style={{
                                fontSize: 11,
                                color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#a855f7',
                                marginTop: 2,
                              }}>
                                {job.schedule.workDays?.length || 5} {t('calendar.days_per_week')}
                              </Text>
                            </>
                          );
                        }
                        
                        // Default schedule if nothing is configured
                        if (job) {
                          return (
                            <>
                              <Text style={{
                                fontSize: isTablet ? 22 : (isSmallScreen ? 16 : 18),
                                fontWeight: '600',
                                color: isDark ? 'white' : '#581c87',
                              }}>
                                {formatTimeCompact('09:00')} - {formatTimeCompact('17:00')}
                              </Text>
                              <Text style={{
                                fontSize: 11,
                                color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#a855f7',
                                marginTop: 2,
                              }}>
                                4 {t('calendar.days_per_week')}
                              </Text>
                            </>
                          );
                        }
                        
                        // Default schedule
                        return (
                          <>
                            <Text style={{
                              fontSize: isTablet ? 22 : (isSmallScreen ? 16 : 18),
                              fontWeight: '600',
                              color: isDark ? 'white' : '#581c87',
                            }}>
                              {formatTimeCompact('09:00')} - {formatTimeCompact('17:00')}
                            </Text>
                            <Text style={{
                              fontSize: 11,
                              color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#a855f7',
                              marginTop: 2,
                            }}>
                              4 {t('calendar.days_per_week')}
                            </Text>
                          </>
                        );
                      })()}
                      </View>
                      {!isTablet && (
                        <View style={{
                          backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(147, 51, 234, 0.2)',
                          borderRadius: 12,
                          padding: 8,
                          marginTop: 8,
                        }}>
                          <IconSymbol size={20} name="clock.fill" color={isDark ? '#a855f7' : '#8b5cf6'} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
  )}

                {/* BOTTOM ROW - 2 CONFIG WIDGETS */}
                  {autoTimerStatus?.state === 'inactive' && (
                <View style={{
                  flexDirection: 'row',
                  gap: isTablet ? 28 : (isSmallScreen ? 12 : 20),
                  height: isTablet ? 160 : (isSmallScreen ? 120 : 140),
                }}>
                  {/* RATES WIDGET */}
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      borderRadius: isTablet ? 28 : (isSmallScreen ? 20 : 24),
                      padding: isTablet ? 22 : (isSmallScreen ? 12 : 18),
                      backgroundColor: isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(252, 211, 77, 0.25)',
                      backdropFilter: 'blur(20px)',
                      borderWidth: 1.5,
                      borderColor: isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(245, 158, 11, 0.3)',
                      shadowColor: '#f59e0b',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 20,
                      elevation: 5,
                    }}
                    onPress={() => handleEditCategory('financial')}
                    activeOpacity={0.9}
                  >
                    <View style={{ flexDirection: isTablet ? 'row' : 'column', alignItems: 'center', justifyContent: isTablet ? 'space-between' : 'center', flex: 1 }}>
                      {isTablet && (
                        <View style={{
                          backgroundColor: isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(245, 158, 11, 0.2)',
                          borderRadius: 20,
                          padding: 16,
                          marginRight: 20,
                        }}>
                          <IconSymbol size={36} name="eurosign.circle.fill" color={isDark ? '#fbbf24' : '#f59e0b'} />
                        </View>
                      )}
                      <View style={{ flex: isTablet ? 1 : undefined, alignItems: isTablet ? 'flex-start' : 'center' }}>
                        <Text style={{
                          fontSize: isTablet ? 16 : 13,
                          fontWeight: '600',
                          color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#92400e',
                          marginBottom: isTablet ? 6 : 8,
                        }}>{t('settings.financial_config.rates')}</Text>
                      {(() => {
                        const job = jobs[0];
                        if (!job) {
                          return (
                            <Text style={{
                              fontSize: 14,
                              fontWeight: '500',
                              color: '#f59e0b',
                              marginTop: 12,
                              opacity: 0.9,
                            }}>{t('maps.configure_rates')}</Text>
                          );
                        }
                        
                        // Check for hourly rate
                        if (job.hourlyRate && job.hourlyRate > 0) {
                          const currency = job.currency || '€';
                          return (
                            <>
                              <Text style={{
                                fontSize: isTablet ? 36 : (isSmallScreen ? 24 : 28),
                                fontWeight: '600',
                                color: isDark ? 'white' : '#1f2937',
                              }}>
                                {currency} {job.hourlyRate}
                              </Text>
                              <Text style={{
                                fontSize: 12,
                                color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#9ca3af',
                                marginTop: 4,
                              }}>{t('maps.per_hour')}</Text>
                            </>
                          );
                        }
                        
                        // Check for salary
                        if (job.salary?.enabled && job.salary?.amount > 0) {
                          const currency = job.salary.currency || '€';
                          let period = '';
                          switch(job.salary.type) {
                            case 'monthly':
                              period = t('calendar.monthly');
                              break;
                            case 'annual':
                              period = t('calendar.annual');
                              break;
                            default:
                              period = t('maps.per_hour');
                          }
                          return (
                            <>
                              <Text style={{
                                fontSize: isTablet ? 28 : (isSmallScreen ? 16 : 22),
                                fontWeight: '600',
                                color: isDark ? 'white' : '#1f2937',
                              }}>
                                {currency} {job.salary.amount}
                              </Text>
                              <Text style={{
                                fontSize: 12,
                                color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#416ebbff',
                                marginTop: 4,
                              }}>{period}</Text>
                            </>
                          );
                        }
                        
                        return (
                          <View style={{ alignItems: 'center', marginTop: 4 }}>
                            <Text style={{
                               fontSize: isTablet ? 18 : 12,
                              fontWeight: '500',
                              color: isDark ? '#d97706' : '#d97706',
                              textAlign: 'center',
                            }}>{t('maps.configure_rates')}</Text>
                          </View>
                        );
                      })()}
                      </View>
                      {!isTablet && (
                        <View style={{
                          backgroundColor: isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          borderRadius: 12,
                          padding: 8,
                          marginTop: 8,
                        }}>
                          <IconSymbol size={20} name="eurosign.circle.fill" color={isDark ? '#fbbf24' : '#f59e0b'} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>



       <View style={{
            
                  gap: isTablet ? 8 : (isSmallScreen ? 6 : 8),
                  height: isTablet ? 160 : (isSmallScreen ? 110 : 140),
                  width: isTablet ?360 :(isSmallScreen ? 165 : 165),
                  marginTop: isTablet ? 0 : (isSmallScreen ?  5 : 0),
                }}>

               <TouchableOpacity
                       style={{
                      flex: 1,
                  height: isTablet ? 90 : (isSmallScreen ? 90 : 80),
                          borderRadius: isTablet ? 32 : (isSmallScreen ? 24 : 28),
                          padding: isTablet ? 20 : (isSmallScreen ? 18 : 16),
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(248, 113, 113, 0.18)',
                      borderWidth: 1.5,
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.25)',

                     shadowColor: '#ef4444',
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.1,
                      shadowRadius: 24,
                      elevation: 8,
                       }}
                        onPress={() => {
                          triggerHaptic('light');
                          navigateTo('reports');
                        }}
                        activeOpacity={0.9}
                      >
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: isTablet ? 4 : 2 }}>
                          {/* Text content on the left */}
                          <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
                            <Text style={{
                              fontSize: isTablet ? 14 : (isSmallScreen ? 11 : 14),
                              fontWeight: '700',
                        color: isDark ? '#a7303092' : '#a7303092',
                              marginBottom: isTablet ? 2 : 1,
                              letterSpacing: -0.5,
                            }}>{t('maps.overtime')}</Text>
                            
                            <Text style={{
                              fontSize: isTablet ? 10 : (isSmallScreen ? 9 : 9),
                              fontWeight: '500',
                            color: isDark ? '#7b7b7bff' : '#7b7b7bff',
                              opacity: 0.9,
                            }}>{getMonthName(new Date())}</Text>
                            
                        
                          </View>
                          
                          {/* Circular Progress Chart on the right */}
                          {(() => {
                            // Dynamic max based on current overtime value
                            let maxValue = 10;
                            if (monthlyOvertime > 80) maxValue = 160;
                            else if (monthlyOvertime > 40) maxValue = 80;
                            else if (monthlyOvertime > 20) maxValue = 40;
                            else if (monthlyOvertime > 10) maxValue = 20;
                            
                            const percentage = Math.min(100, (monthlyOvertime / maxValue) * 100);
                            const rotation = (percentage / 100) * 360 - 90;
                            
                            return (
                              <View style={{ 
                                width: isTablet ? 45 : 35, 
                                height: isTablet ? 45 : 35,
                              }}>
                                <View style={{
                                  width: '100%',
                                  height: '100%',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}>
                   
                                  {/* Progress arc - simplified approach */}
                                  <View style={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: 100,
                                    borderWidth: isTablet ? 8 : 6,
                                    borderColor: 'transparent',
                
                                    transform: [{ rotate: `${rotation}deg` }],
                                  }} />
                                  {/* Center text - simplified */}
                                  <View style={{ alignItems: 'center' }}>
                                    <Text style={{
                                       fontSize: isTablet ? 16 :14,
                                      fontWeight: '700',
                                     color: isDark ? '#4ade80' : '#16a34a',
                                    }}>{monthlyOvertime.toFixed(1)}</Text>
                                    <Text style={{
                                      fontSize: isTablet ? 14 : 10,
                                      color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#15803d',
                                      fontWeight: '600',
                                    }}>{t('job_selector.time_periods.hour')}</Text>
                                  </View>
                                  {/* Max indicator */}
                                  <View style={{
                                    position: 'absolute',
                                    top: -14,
                                    right: 0,
                                    left: 0,
                                    alignItems: 'center',
                                  }}>
                     
                                  </View>
                                </View>
                              </View>
                            );
                          })()}
                        </View>
                      </TouchableOpacity>




                  {/* OVERTIME WIDGET */}
 <TouchableOpacity
                        style={{
                          flex: 1,
                          height: isTablet ? 90 : (isSmallScreen ? 90 : 80),
                          borderRadius: isTablet ? 32 : (isSmallScreen ? 24 : 28),
                          padding: isTablet ? 20 : (isSmallScreen ? 18 : 16),
                     backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(248, 113, 113, 0.18)',
                      borderWidth: 1.5,
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.25)',

                     shadowColor: '#ef4444',
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.1,
                          shadowRadius: 24,
                          elevation: 8,
                        }}
                        onPress={() => {
                          triggerHaptic('light');
                          navigateTo('reports');
                        }}
                        activeOpacity={0.9}
                      >
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: isTablet ? 4 : 2 }}>
                          {/* Text content on the left */}
                          <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
                            <Text style={{
                              fontSize: isTablet ? 14 : (isSmallScreen ? 11 : 14),
                              fontWeight: '700',
                                 color: isDark ? '#a7303092' : '#a7303092',
                              marginBottom: isTablet ? 2 : 1,
                              letterSpacing: -0.5,
                            }}>{t('maps.total_hours')}</Text>
                            
                            <Text style={{
                              fontSize: isTablet ? 10 : (isSmallScreen ? 9 : 9),
                              fontWeight: '500',
                           color: isDark ? '#7b7b7bff' : '#7b7b7bff',
                              opacity: 0.9,
                            }}>{getMonthName(new Date())}</Text>
                            
                  
                          </View>
                          
                          {/* Circular Progress Chart on the right */}
                          {(() => {
                            // Use the monthly total hours state
                            const totalHours = monthlyTotalHours;
                            // Dynamic max based on typical monthly hours (160-200 hours standard)
                            let maxValue = 160;
                            if (totalHours > 240) maxValue = 320;
                            else if (totalHours > 200) maxValue = 240;
                            else if (totalHours > 160) maxValue = 200;
                            
                            const percentage = Math.min(100, (totalHours / maxValue) * 100);
                            const rotation = (percentage / 100) * 360 - 90;
                            
                            return (
                              <View style={{ 
                                width: isTablet ? 45 : 35, 
                                height: isTablet ? 45 : 35,
                              }}>
                                <View style={{
                                  width: '100%',
                                  height: '100%',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}>
             
                  
                                  {/* Progress arc - simplified approach */}
                                  <View style={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: 100,
                                    borderWidth: isTablet ? 8 : 6,
                                    borderColor: 'transparent',
                           
                                    transform: [{ rotate: `${rotation}deg` }],
                                  }} />
                                  {/* Center text - simplified */}
                                  <View style={{ alignItems: 'center' }}>
                                    <Text style={{
                                      fontSize: isTablet ? 16 :14,
                                      fontWeight: '700',
                                      color: isDark ? '#4ade80' : '#16a34a',
                                    }}>{formatHoursForDisplay(totalHours)}</Text>
                                  </View>
                                  {/* Max indicator */}
                                  <View style={{
                                    position: 'absolute',
                                    top: -14,
                                    right: 0,
                                    left: 0,
                                    alignItems: 'center',
                                  }}>
                     
                                  </View>
                                </View>
                              </View>
                            );
                          })()}
                        </View>
                        
                      </TouchableOpacity>
                      
                </View>
                           </View>
                  )}

                {/* AI ASSISTANT WIDGET - NEW - Hide on iPad landscape and when auto-timer is active */}
                {(!isTablet || (isTablet && isPortrait)) && autoTimerStatus?.state === 'inactive' && (
                <TouchableOpacity
                  style={{
                    marginTop: isTablet ? 28 : (isSmallScreen ? 6 : 20),
                    height: isTablet ? 80 : (isSmallScreen ? 60 : 70),
                    borderRadius: isTablet ? 28 : (isSmallScreen ? 20 : 24),
                    padding: isTablet ? 20 : (isSmallScreen ? 14 : 16),
                    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(96, 165, 250, 0.2)',
                    backdropFilter: 'blur(20px)',
                    borderWidth: 1.5,
                    borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(37, 99, 235, 0.3)',
                    shadowColor: '#3b82f6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 20,
                    elevation: 5,
                    overflow: 'hidden',
                  }}
                  onPress={async () => {
                    if (dynamicChatbotQuestion) {
                      try {
                        await AsyncStorage.setItem('chatbot_initial_question', dynamicChatbotQuestion);
                      } catch (error) {
                        console.warn('Failed to store initial question:', error);
                      }
                    }
                    onNavigate?.('chatbot');
                  }}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={isDark ? ['rgba(59, 130, 246, 0.05)', 'rgba(96, 165, 250, 0.1)'] : ['rgba(191, 219, 254, 0.3)', 'rgba(147, 197, 253, 0.2)']}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={{
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(37, 99, 235, 0.2)',
                        borderRadius: 12,
                        padding: 10,
                        marginRight: 12,
                      }}>
                        <IconSymbol size={24} name="sparkles" color={isDark ? '#93c5fd' : '#3b82f6'} />
                      </View>
                      <View style={{ flex: 1 }}>
                                     <Text 
                          numberOfLines={2}
                          style={{
                          fontSize: isTablet ? 14 : (isSmallScreen ? 9 : 10),
                          color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#2563eb',
                          marginTop: isTablet ? 2 : 0,
                          lineHeight: isTablet ? 18 : (isSmallScreen ? 12 : 14),
                        }}>
                          {(() => {
                            const subtitle = t('chatbot.welcome_subtitle');
                            const maxLength = isSmallScreen ? 40 : (isTablet ? 60 : 50);
                            return subtitle.length > maxLength ? subtitle.substring(0, maxLength) + '...' : subtitle;
                          })()}
                        </Text>

                        <Animated.Text 
                          numberOfLines={1}
                          style={[
                          {
                            fontSize: isTablet ? 18 : (isSmallScreen ? 13 : 14),
                            fontWeight: '600',
                            color: isDark ? 'white' : '#1e3a8a',
                          },
                          animatedAITextStyle
                        ]}>
                          {(() => {
                            // Use dynamic question if available, fallback to static title
                            const displayText = dynamicChatbotQuestion || t('chatbot.welcome_title');
                            // Simplificar el texto para iPhone
                            if (!isTablet && displayText.length > 50) {
                              return displayText.substring(0, 50) + '...';
                            }
                            return displayText;
                          })()}
                        </Animated.Text>
           
                      </View>
                    </View>
           
                  </View>
                </TouchableOpacity>
                )}
                
                {/* STATISTICS WIDGET - Only for iPad in Portrait */}
                {isTablet && isPortrait && (
                  <TouchableOpacity
                    style={{
                      marginTop: isPortrait ? 20 : 16,
                      height: isPortrait ? 80 : 70,
                      borderRadius: 28,
                      padding: isPortrait ? 20 : 18,
                      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : 'rgba(74, 222, 128, 0.2)',
                      backdropFilter: 'blur(20px)',
                      borderWidth: 1.5,
                      borderColor: isDark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(22, 163, 74, 0.3)',
                      shadowColor: '#16a34a',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 20,
                      elevation: 5,
                      overflow: 'hidden',
                    }}
                    onPress={() => onNavigate?.('reports')}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={isDark ? ['rgba(34, 197, 94, 0.05)', 'rgba(74, 222, 128, 0.1)'] : ['rgba(187, 247, 208, 0.3)', 'rgba(134, 239, 172, 0.2)']}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                      }}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{
                          backgroundColor: isDark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(22, 163, 74, 0.2)',
                          borderRadius: 20,
                          padding: 16,
                          marginRight: 20,
                        }}>
                          <IconSymbol size={26} name="chart.bar.fill" color={isDark ? '#86efac' : '#16a34a'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: 18,
                            fontWeight: '600',
                            marginTop: 10,
                            color: isDark ? 'white' : '#14532d',
                          }}>
                        {t('reports.subtitle')}
                          </Text>
                          <Text style={{
                            fontSize: 14,
                            color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#16a34a',
                            marginTop: 2,
                          }}>
            
                          </Text>
                        </View>
                      </View>
                      <View style={{
  
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}>
                        <IconSymbol size={20} name="chevron.right" color={isDark ? '#86efac' : '#16a34a'} />
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

            {/* Hide old calendar and buttons */}
            {false && (
            
            <View style={[styles.noLocationContent, { 
              marginTop: isIPadPortrait ? -40 : (isTablet && !isPortrait ? 100 : 0) 
            }]}>
              {/* Botón Ver Trabajos - solo si hay trabajos */}
              {!showJobForm && jobs.length > 0 && (
              <Animated.View style={[styles.noLocationButtons, animatedNoLocationButtonsStyle]}>

                  <TouchableOpacity 
                    style={styles.settingItem}
                    onPress={() => handleEditCategory('schedule')}
                  >
                    <View style={[styles.settingIcon, styles.successIconBg]}>
                      <IconSymbol size={20} name="clock.fill" color={colors.success} />
                    </View>
                    <View style={styles.settingContent}>
                      <Text style={styles.settingTitle}>{t('settings.work_config.schedules')}</Text>
                      <Text style={styles.settingDescription}>{t('settings.work_config.schedules_desc')}</Text>
                    </View>
                    <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
                  </TouchableOpacity>
                  
  

                                    <TouchableOpacity 
                    style={styles.settingItem}
                    onPress={() => handleEditCategory('financial')}
                  >
                    <View style={[styles.settingIcon, styles.successIconBg]}>
                      <IconSymbol size={20} name="dollarsign.circle.fill" color={colors.secondary} />
                    </View>
                    <View style={styles.settingContent}>
                      <Text style={styles.settingTitle}>{t('settings.financial_config.rates')}</Text>
                      <Text style={styles.settingDescription}>{t('settings.financial_config.rates_desc')}</Text>
                    </View>
                    <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
                  </TouchableOpacity>

                                    <TouchableOpacity 
                    style={styles.settingItem}
                    onPress={() => handleEditCategory('billing')}
                  >
                    <View style={[styles.settingIcon, styles.primaryIconBg]}>
                      <IconSymbol size={20} name="chart.bar.fill" color={colors.primary} />
                    </View>
                    <View style={styles.settingContent}>
                      <Text style={styles.settingTitle}>{t('settings.financial_config.billing')}</Text>
                      <Text style={styles.settingDescription}>{t('settings.financial_config.billing_desc')}</Text>
                    </View>
                    <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
                  </TouchableOpacity>
                  

               
              </Animated.View>
              )}
            </View>
            )}

  




      {/* Mini Map Widget - shown when auto-timer is active instead of job cards modal */}
      {autoTimerStatus?.state !== 'inactive' && autoTimerStatus?.jobId && (() => {
        const activeJob = jobs.find(job => job.id === autoTimerStatus.jobId);
        if (activeJob && !showJobCardsModal) {
          return (
            <MiniMapWidget
              job={activeJob}
              userLocation={currentUserLocation}
              activeTimerElapsed={elapsedTime}
              isAutoTimerPaused={isAutoTimerPaused}
              startTime={autoTimer.state.startTime}
              onPause={handleAutoTimerPause}
              onResume={handleAutoTimerResume}
              onStop={handleAutoTimerWidgetStop}
              formatTime={formatTime}
              autoTimerState={autoTimerStatus.state}
              remainingDelayTime={autoTimerStatus.remainingTime}
            />
          );
        }
        return null;
      })()}
      


      {/* Job cards modal swiper */}
      <JobCardsSwiper
        visible={showJobCardsModal}
        onClose={() => setShowJobCardsModal(false)}
        jobs={jobs}
        isJobCurrentlyActive={isJobCurrentlyActive}
        getJobScheduleStatus={getJobScheduleStatus}
        getJobStatistics={getJobStatistics}
        onAction={(action, job) => {
          console.log('🔴 MapLocation: onAction called with:', { action, jobName: job.name });
          if (action === 'edit') {
            // When coming from settings button, don't reopen the modal automatically
            setShouldReopenJobCardsModal(false);
            handleJobAction(job, action as 'timer' | 'calendar' | 'edit' | 'statistics' | 'delete' | 'map' | 'edit-auto');
          } else {
            handleJobAction(job, action as 'timer' | 'calendar' | 'edit' | 'statistics' | 'delete' | 'map' | 'edit-auto');
          }
        }}
        showAutoTimer={true}
        autoTimerEnabled={false}
        onAutoTimerToggle={handleAutoTimerToggle}
        onNavigateToSubscription={() => navigateTo('subscription')}
        t={t}
      />

      {/* Job action modal */}
      <Modal
        visible={selectedJob !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.actionModal}>
          <TouchableOpacity 
            style={styles.actionModalBackdrop}
            onPress={closeModal}
          />
          <Animated.View style={animatedModalStyle}>
            <BlurView intensity={75} tint={isDark ? "dark" : "light"} style={styles.actionModalContent}>
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
                <Text style={styles.actionModalButtonText}>
                  {t('maps.edit_job')}
                </Text>
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
                  onPress={closeModal}
                >
                  <Text style={styles.actionModalCancelText}>{t('maps.cancel')}</Text>
                </TouchableOpacity>
              </>
            )}
            </BlurView>
          </Animated.View>
        </View>
      </Modal>




      {/* Job Selector Modal */}
      <JobSelectorModal
        visible={showJobSelector}
        onClose={() => setShowJobSelector(false)}
        onJobSelect={handleJobSelect}
        title={selectedEditType ? getEditInfo(selectedEditType).title : t('job_selector.title')}
        subtitle={selectedEditType ? getEditInfo(selectedEditType).subtitle : t('job_selector.subtitle')}
        showAutoTimerHeader={selectedEditType === 'location'}
        onNavigateToTimer={() => navigateTo('timer')}
      />

      {/* Job Form Modal */}
      <JobFormModal
        visible={showJobForm}
        editingJob={editingJob}
        initialTab={editingJob && selectedEditType ? getEditInfo(selectedEditType).tab : 'basic'}
        onClose={() => {
          console.log('🟡 MapLocation: JobFormModal closing');
          setShowJobForm(false);
          setEditingJob(null);
          // If the modal was open before editing, reopen it (but not if coming from settings button)
          if (wasJobCardsModalOpen && shouldReopenJobCardsModal) {
            setTimeout(() => {
              setShowJobCardsModal(true);
              setWasJobCardsModalOpen(false);
              setShouldReopenJobCardsModal(false);
            }, 100);
          } else {
            // Reset flags
            setWasJobCardsModalOpen(false);
            setShouldReopenJobCardsModal(false);
          }
        }}
        onSave={handleJobFormSave}
        onNavigateToCalendar={() => onNavigate?.('calendar')}
        onNavigateToSubscription={() => onNavigate?.('subscription')}
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