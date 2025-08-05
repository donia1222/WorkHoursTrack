import React, { useState, useEffect, useRef, useCallback } from 'react';
import MapView, { Marker, Circle } from 'react-native-maps';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Modal, Dimensions, Switch, InteractionManager } from 'react-native';
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
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import AutoTimerService, { AutoTimerStatus } from '../services/AutoTimerService';
import { JobCardsSwiper } from './JobCardsSwiper';
import { useFocusEffect } from '@react-navigation/native';

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

const getStyles = (colors: ThemeColors, isDark: boolean, isSmallScreen: boolean, daySize: number, dayFontSize: number) => StyleSheet.create({
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
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
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
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
    top: 0,
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
    marginBottom: isSmallScreen ? 8 : 16,
    marginHorizontal: isSmallScreen ? 8 : 0,
  },
  miniCalendarCard: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: isDark ? '#000' : '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.12 : 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0)' : 'rgba(0, 0, 0, 0)',
  },
  miniCalendarBlur: {
    paddingTop: isSmallScreen ? 8 : 10,
    paddingBottom: isSmallScreen ? 6 : 8,
    paddingHorizontal: isSmallScreen ? 8 : 12,
    backgroundColor: isDark ?  'rgba(167, 139, 250, 0.19)' : 'rgba(167, 139, 250, 0.12)',
  },
  miniCalendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
    paddingVertical: 2,
  },
  miniCalendarTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '500',
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
    fontSize: isSmallScreen ? 8 : 10,
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
    backgroundColor: isDark ? 'rgba(76, 92, 175, 0.1)' : 'rgba(76, 87, 175, 0.08)',
  },
  warningIconBg: {
    backgroundColor: isDark ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.08)',
  },
  primaryIconBg: {
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    marginBottom: 1,
    fontWeight: '600',
    color: colors.text,
  },
  settingDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    opacity: 0.8,

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
  
  // Responsive dimensions for mini calendar
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenWidth < 380; // iPhone SE and similar
  const daySize = isSmallScreen ? 40 : 48;
  const dayFontSize = isSmallScreen ? 11 : 13;
  
  // Animation values for modal
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
  const [isAutoTimerMinimized, setIsAutoTimerMinimized] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [hasShownActivationAlert, setHasShownActivationAlert] = useState(false);
  
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
  const mapRef = useRef<MapView>(null);
  
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
  
  const styles = getStyles(colors, isDark, isSmallScreen, daySize, dayFontSize);

  // Gestión del arrastre para AutoTimer (funciona para ambos estados)
  // Removed panGesture - AutoTimer is now fixed

  const animatedAutoTimerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scaleValue.value * pulseAnimation.value },
      ],
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
    loadPrivacyNoticeState();
    loadMiniCalendarData(weekStart);
    
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

  const loadMiniCalendarData = async (weekStart?: Date) => {
    try {
      const today = new Date();
      const baseDate = weekStart || currentWeekStart;
      
      // Crear array de 7 días de la semana
      const startOfWeek = new Date(baseDate);
      const dayOfWeek = startOfWeek.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Empezar en lunes
      startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
      
      // Obtener días de trabajo de todos los meses que aparecen en la semana
      const monthsToLoad = new Set<string>();
      for (let i = 0; i < 7; i++) {
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
      for (let i = 0; i < 7; i++) {
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
          dayOfWeek: i, // 0 = lunes, 6 = domingo
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
    loadMiniCalendarData(newWeekStart);
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
        console.log('🔔 Showing AutoTimer activation alert');
        setHasShownActivationAlert(true);
        
        // Show properly translated alert
        Alert.alert(
          t('timer.auto_timer.activation_title'),
          t('timer.auto_timer.activation_alert'),
          [{ 
            text: t('timer.auto_timer.dismiss_notice'), 
            style: 'default',
            onPress: () => {
              console.log('🔔 AutoTimer alert dismissed');
              // Reset flag after a delay to allow showing again later
              setTimeout(() => {
                setHasShownActivationAlert(false);
              }, 5000);
            }
          }]
        );
      }
    };

    // Add listeners
    autoTimerService.addStatusListener(handleAutoTimerStatusChange);
    autoTimerService.addAlertListener(handleAutoTimerAlert);
    
    // Get current status immediately to sync with any ongoing countdown
    const currentStatus = autoTimerService.getStatus();
    setAutoTimerStatus(currentStatus);
    console.log('🔄 MapLocation: Synced with current AutoTimer status:', currentStatus.state, currentStatus.remainingTime);

    // Cleanup on unmount
    return () => {
      autoTimerService.removeStatusListener(handleAutoTimerStatusChange);
      autoTimerService.removeAlertListener(handleAutoTimerAlert);
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
      
      // Reset mini calendar animations to prevent header issues
      miniCalendarOpacity.value = 0;
      miniCalendarTranslateY.value = -30;
      miniCalendarScale.value = 0.95;
      
      // Delayed update to catch any async state changes
      const timeoutId = setTimeout(() => {
        const delayedStatus = autoTimerService.getStatus();
        setAutoTimerStatus(delayedStatus);
        console.log('🔄 MapLocation: Delayed status update:', delayedStatus.state);
        
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
    const shouldShow = ((!autoTimerStatus || autoTimerStatus.state === 'inactive' || !jobs.some(job => job.autoTimer?.enabled)) && !showPrivacyNotice) && !isSmallScreen;
    
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
      loadMiniCalendarData();
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
    setShowJobSelector(true);
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
          delayStart: job.autoTimer?.delayStart || 2,
          delayStop: job.autoTimer?.delayStop || 2,
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
    <View style={styles.container}>


      


      <View style={styles.mapWrapper}>





      {autoTimerStatus && autoTimerStatus.state !== 'inactive' && autoTimerStatus.state !== null && jobs.some(job => job.autoTimer?.enabled) ? (
        <MapView
          key={`mapview-${autoTimerStatus?.state === 'active' ? 'with-location' : 'no-location'}`}
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location?.latitude || 40.7128,
            longitude: location?.longitude || -74.0060,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
 
          showsMyLocationButton={false}
          customMapStyle={isDark ? darkMapStyle : undefined}
          onRegionChangeComplete={handleMapRegionChangeComplete}
          onRegionChange={handleMapRegionChange}
        onTouchStart={() => {
          // Solo procesar si no hay un gesto activo
          if (!isProcessingGesture) {
            setIsProcessingGesture(true);
            
            // Limpiar timeout anterior si existe
            if (gestureTimeoutRef.current) {
              clearTimeout(gestureTimeoutRef.current);
            }
            
            // Timeout de seguridad más corto y más eficiente
            gestureTimeoutRef.current = setTimeout(() => {
              setIsProcessingGesture(false);
              gestureTimeoutRef.current = undefined;
            }, 1500); // Reducido de 3000 a 1500
          }
        }}
        onTouchEnd={() => {
          // No procesar inmediatamente para evitar conflictos con gestos múltiples
          requestAnimationFrame(() => {
            // Solo resetear si no hay más gestos activos
            if (gestureTimeoutRef.current) {
              clearTimeout(gestureTimeoutRef.current);
              gestureTimeoutRef.current = setTimeout(() => {
                setIsProcessingGesture(false);
                gestureTimeoutRef.current = undefined;
              }, 200);
            }
          });
        }}
        moveOnMarkerPress={false}
        pitchEnabled={false}
        rotateEnabled={false}
        zoomEnabled={false}
        scrollEnabled={true}
        zoomTapEnabled={false}
        loadingEnabled={true}
        toolbarEnabled={false}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={t('maps.you_are_here')}
            pinColor={colors.primary}
          />
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
      ) : (
        <View style={styles.map}>
          <LinearGradient
            colors={isDark 
              ? ['#0a0a0a', '#1a1a1a', '#0f0f0f'] 
              : ['transparent', '#4b75df1e', '#4b75df54']
            }
            style={styles.noLocationBackground}
            locations={[0, 0.5, 1]}
          >
            {/* Background pattern */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.03,
            }}>
              {[...Array(20)].map((_, i) => (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    width: 200,
                    height: 200,
                    borderRadius: 100,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    top: `${(i % 4) * 25}%`,
                    left: `${Math.floor(i / 4) * 20}%`,
                  }}
                />
              ))}
            </View>
            
            {/* Stats cards at top */}
            {jobs.length > 0 && (
              <View style={{
                position: 'absolute',
                top: 40,
                left: '50%',
                transform: [{ translateX: -160 }],
                width: 320,
                flexDirection: 'row',
                gap: 10,
              }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: isDark ? 'rgba(73, 129, 240, 0.15)' : 'rgba(60, 144, 246, 0.14)',
                    borderRadius: 14,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0)' : 'rgba(0, 0, 0, 0)',
                    shadowColor: isDark ? '#000' : '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.12 : 0.08,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                  onPress={() => setShowJobCardsModal(true)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <IconSymbol size={26} name="briefcase.fill" color={colors.primary} />
                    <IconSymbol size={16} name="chevron.forward" color={colors.textSecondary} style={{ opacity: 0.5 }} />
                  </View>
                  <Text style={{
                    fontSize: 21,
                    fontWeight: '700',
                    color: colors.text,
                    marginTop: 8,
                  }}>{jobs.length}</Text>
                  <Text style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    marginTop: 2,
                    fontWeight: '600',
                  }}>{t('maps.active_jobs')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(52, 211, 153, 0.12)',
                    borderRadius: 14,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0)' : 'rgba(0, 0, 0, 0)',
                    shadowColor: isDark ? '#000' : '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.12 : 0.08,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                  onPress={() => handleEditCategory('location')}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <IconSymbol size={34} name="clock.fill" color={colors.success} />
                    <IconSymbol size={16} name="chevron.forward" color={colors.textSecondary} style={{ opacity: 0.5 }} />
                  </View>
         
                  <Text style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    position: 'absolute',
                    fontWeight: '600',
                    bottom: 15,
                    left: 10,
                  
                  }}>{t('maps.auto_timer')}</Text>
                
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.noLocationContent}>
              {/* Botón Ver Trabajos - solo si hay trabajos */}
              {!showJobForm && jobs.length > 0 && (
              <Animated.View style={[styles.noLocationButtons, animatedNoLocationButtonsStyle]}>
  

         
            {/* Mini Calendar - Conditional render */}
            {shouldShowMiniCalendar && miniCalendarData.length > 0 && !isSmallScreen && (
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
                <View style={[styles.miniCalendarContainer, animatedMiniCalendarStyle]}>
                  <View style={styles.miniCalendarCard}>
                    <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={styles.miniCalendarBlur}>
                  <View style={styles.miniCalendarHeader}>
          
                    <View style={styles.miniCalendarTitleContainer}>
                      <IconSymbol size={24} name="calendar" color={colors.secondary} />
                      <Text style={styles.miniCalendarTitle}>{getMonthName(currentWeekStart)}</Text>
                    </View>
             
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
                            badgeColor = '#059669'; // Verde más intenso para mejor contraste
                            badgeText = 'checkmark-circle';
                            // Mostrar horario si existe
                            if (dayData.workDay.startTime && dayData.workDay.endTime) {
                              // Formatear horas sin el cero inicial si es necesario
                              const formatTime = (time: string) => {
                                const [hours, minutes] = time.split(':');
                                return `${parseInt(hours)}:${minutes}`;
                              };
                              
                              // Si hay turno partido, mostrar ambos bloques
                              if (dayData.workDay.secondStartTime && dayData.workDay.secondEndTime) {
                                timeText = `${formatTime(dayData.workDay.startTime)}-${formatTime(dayData.workDay.endTime)}\n${formatTime(dayData.workDay.secondStartTime)}-${formatTime(dayData.workDay.secondEndTime)}`;
                              } else {
                                // Horario simple
                                timeText = `${formatTime(dayData.workDay.startTime)}\n${formatTime(dayData.workDay.endTime)}`;
                              }
                            }
                            break;
                          case 'free':
                            badgeColor = '#FBBF24'; // Amarillo para días libres
                            badgeText = 'sunny';
                            break;
                          case 'vacation':
                            badgeColor = '#F59E0B'; // Amarillo para vacaciones
                            badgeText = 'airplane';
                            break;
                          case 'sick':
                            badgeColor = '#EF4444'; // Rojo para enfermedad
                            badgeText = 'medkit';
                            break;
                          default:
                            console.log('⚠️ Unknown workDay type:', dayData.workDay.type);
                            break;
                        }
                      }
                      
                      return (
                        <TouchableOpacity 
                          key={i} 
                          style={[
                            styles.miniCalendarDay,
                            dayData.isToday && styles.miniCalendarDayToday
                          ]}
                          onPress={() => {
                            if (dayData.workDay && dayData.workDay.type === 'work' && dayData.workDay.startTime) {
                              setSelectedDaySchedule(selectedDaySchedule === i ? null : i);
                            } else {
                              onNavigate?.('calendar');
                            }
                          }}
                          activeOpacity={0.7}
                          onLongPress={() => onNavigate?.('calendar')}
                        >
                          <Text style={[
                            styles.miniCalendarDayText, 
                            { 
                              color: dayData.isToday ? colors.primary : (isDark ? colors.text : colors.textSecondary),
                              fontWeight: dayData.isToday ? '700' : '600'
                            }
                          ]}>
                            {dayData.day}
                          </Text>
                          {badgeColor && (
                            <View style={[styles.miniCalendarBadge, { backgroundColor: badgeColor }]} />
                          )}
                          {dayData.isToday && !badgeColor && (
                            <View style={[styles.miniCalendarDot, { backgroundColor: colors.primary }]} />
                          )}
                          {/* Mostrar horario si está seleccionado */}
                          {selectedDaySchedule === i && dayData.workDay && dayData.workDay.type === 'work' && timeText && (
                            <View style={{
                              position: 'absolute',
                              bottom: -28,
                              left: -20,
                              right: -20,
                              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                              borderRadius: 6,
                              padding: 6,
                              zIndex: 1000,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.2,
                              shadowRadius: 4,
                              elevation: 5,
                              borderWidth: 1,
                              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                            }}>
                              <Text style={{
                                fontSize: 9,
                                color: colors.text,
                                textAlign: 'center',
                                fontWeight: '600',
                                lineHeight: 11,
                              }}>
                                {timeText}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
     
                    </BlurView>
                  </View>
              </View>
              </GestureDetector>
            )}

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
          </LinearGradient>
        </View>
      )}
      {/* Capa invisible para interceptar toques problemáticos - REMOVIDA para evitar conflictos */}
      </View>

      {/* Privacy Notice for Auto Timer - Shows once when auto timer activates */}
      {showPrivacyNotice && (
        <Animated.View style={[styles.privacyNoticeContainer, animatedPrivacyNoticeStyle]}>
          <View style={styles.privacyNoticeCard}>
            <View style={styles.privacyNoticeContent}>
              <IconSymbol 
                size={20} 
                name="info.circle.fill" 
                color="#FFFFFF" 
                style={styles.privacyNoticeIcon}
              />
              <Text style={styles.privacyNoticeText}>
                {t('timer.auto_timer.privacy_notice')}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.privacyNoticeCloseButton}
              onPress={handleDismissPrivacyNotice}
              activeOpacity={0.8}
            >
              <Text style={styles.privacyNoticeButtonText}>
                {t('timer.auto_timer.dismiss_notice')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}


     
      {(() => {
        const shouldShow = autoTimerStatus && (autoTimerStatus.state === 'active' || autoTimerStatus.state === 'cancelled' || autoTimerStatus.state === 'pre-start') && jobs.some(job => job.autoTimer?.enabled) && !showPrivacyNotice;
        console.log('🔍 MapLocation AutoTimer overlay condition:', {
          hasAutoTimerStatus: !!autoTimerStatus,
          autoTimerState: autoTimerStatus?.state,
          autoTimerJobId: autoTimerStatus?.jobId,
          hasEnabledJob: jobs.some(job => job.autoTimer?.enabled),
          showPrivacyNotice,
          shouldShow,
          elapsedTime
        });
        return shouldShow;
      })() && (
          <Animated.View style={[styles.autoTimerStatusOverlay, animatedAutoTimerStyle]}>
            {isAutoTimerMinimized ? (
              // Vista minimizada - solo icono con pulso
              <TouchableOpacity
                onPress={() => setIsAutoTimerMinimized(false)}
                style={[
                  styles.minimizedAutoTimer,
                  {
                    backgroundColor: 
                      autoTimerStatus?.state === 'active' && isTimerPaused ? colors.warning :
                      autoTimerStatus?.state === 'active' ? colors.success : 
                      colors.primary
                  }
                ]}
              >
                <IconSymbol 
                  size={50} 
                  name={isTimerPaused ? "pause.fill" : "clock.fill"} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            ) : (
              // Vista expandida normal
              <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.autoTimerStatusCard}>
            <View style={styles.autoTimerStatusHeader}>
              <View style={[styles.autoTimerJobRow, { marginBottom: 0, flex: 1, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 20 }]}>
                {jobs.filter(job => job.autoTimer?.enabled).length === 1 ? (
                  <>
                    <View style={[styles.autoTimerJobDot, { backgroundColor: jobs.filter(job => job.autoTimer?.enabled)[0]?.color }]} />
                    <Text 
                      style={styles.autoTimerJobName}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      allowFontScaling={false}
                    >
                      {jobs.filter(job => job.autoTimer?.enabled)[0]?.name || 'Trabajo'}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={[styles.autoTimerJobDot, { backgroundColor: colors.primary }]} />
                    <Text 
                      style={styles.autoTimerJobName}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      allowFontScaling={false}
                    >
                      {jobs.filter(job => job.autoTimer?.enabled).length} trabajos
                    </Text>
                  </>
                )}
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {/* Botón minimizar */}
                <TouchableOpacity
                  onPress={() => setIsAutoTimerMinimized(true)}
                  style={[styles.disableButton, { backgroundColor: 'rgba(142, 142, 147, 0.3)' }]}
                >
                  <IconSymbol size={10} name="minus" color="#FFFFFF" />
                </TouchableOpacity>
                
                {/* Botones de control cuando está activo */}
                {autoTimerStatus?.state === 'active' && (
                  <>
                    {/* Botón pausar/reanudar */}
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          const activeSession = await JobService.getActiveSession();
                          if (activeSession) {
                            const isPaused = (activeSession as any).isPaused || false;
                            
                            if (isPaused) {
                              // Reanudar - similar a TimerScreen resumeTimer
                              const pausedElapsedTime = (activeSession as any).pausedElapsedTime || 0;
                              const now = new Date();
                              const adjustedStartTime = new Date(now.getTime() - (pausedElapsedTime * 1000));
                              
                              const resumeSession: StoredActiveSession = {
                                jobId: activeSession.jobId,
                                startTime: adjustedStartTime.toISOString(),
                                notes: activeSession.notes,
                                isPaused: false,
                                pausedElapsedTime: 0,
                              };
                              await JobService.saveActiveSession(resumeSession);
                              
                              console.log('▶️ Timer resumed from MapLocation');
                            } else {
                              // Pausar - similar a TimerScreen pauseTimer
                              const startTime = new Date(activeSession.startTime);
                              const now = new Date();
                              const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
                              
                              const pauseSession: StoredActiveSession = {
                                jobId: activeSession.jobId,
                                startTime: activeSession.startTime,
                                notes: activeSession.notes,
                                isPaused: true,
                                pausedElapsedTime: elapsed,
                              };
                              await JobService.saveActiveSession(pauseSession);
                              
                              console.log('⏸️ Timer paused from MapLocation');
                            }
                          }
                        } catch (error) {
                          console.error('Error toggling pause:', error);
                          Alert.alert('Error', 'No se pudo pausar/reanudar el timer');
                        }
                      }}
                      style={[
                        styles.disableButton,
                        { backgroundColor: isTimerPaused ? '#34C759' : '#FF9500' }
                      ]}
                    >
                      <IconSymbol 
                        size={10} 
                        name={isTimerPaused ? "play.fill" : "pause.fill"} 
                        color="#FFFFFF" 
                      />
                    </TouchableOpacity>
                    
                    {/* Botón para ir a TimerScreen */}
                    <TouchableOpacity
                      onPress={() => onNavigate?.('timer')}
                      style={[styles.disableButton, { backgroundColor: '#ff0000ff' }]}
                    >
                      <IconSymbol size={10} name="stop.fill" color="#FFFFFF" />
                    </TouchableOpacity>
                  </>
                )}
                
                {/* Botón de acción para otros estados */}
                {autoTimerStatus?.state !== 'active' && (
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
                        } else if (status.state === 'entering' || status.state === 'leaving' || status.state === 'pre-start') {
                          // Cancelar countdown
                          await autoTimerService.cancelPendingAction();
                          console.log('Countdown cancelado por usuario');
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
                          '#FF3B30'  // Rojo para stop
                      }
                    ]}
                  >
                    <IconSymbol 
                      size={10} 
                      name={
                        autoTimerStatus?.state === 'cancelled' ? "play.fill" :
                        "stop.fill"
                      } 
                      color="#FFFFFF" 
                    />
                  </TouchableOpacity>
                )}
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
              
              // Enhanced debug logging
              console.log(`🔍 MapLocation Job ${job.name} (${job.id}) AutoTimer check:`, {
                hasAutoTimerStatus: !!autoTimerStatus,
                autoTimerJobId: autoTimerStatus?.jobId,
                jobId: job.id,
                idsMatch: autoTimerStatus?.jobId === job.id,
                autoTimerState: autoTimerStatus?.state,
                isAutoTimerActive,
                jobHasAutoTimer: !!job.autoTimer?.enabled
              });
              
              // Debug logging
              if (autoTimerStatus && autoTimerStatus.jobId === job.id) {
                console.log(`🎯 MapLocation UI Debug for job ${job.name}:`, {
                  isAutoTimerActive,
                  state: autoTimerStatus.state,
                  remainingTime: autoTimerStatus.remainingTime,
                  totalDelayTime: autoTimerStatus.totalDelayTime,
                  autoTimerEnabled: job.autoTimer?.enabled,
                  shouldShowCountdown: false // Countdown removed
                });
              }
              
              let statusText = isNearby ? t('maps.in_range') : t('maps.out_of_range');
              let statusColor = isNearby ? colors.success : colors.textSecondary;
              
              // Override with AutoTimer status if active AND job has autoTimer enabled
              if (isAutoTimerActive && autoTimerStatus.state !== 'inactive' && job.autoTimer?.enabled) {
                statusText = getAutoTimerMessage(autoTimerStatus);
                statusColor = autoTimerStatus.state === 'entering' || autoTimerStatus.state === 'leaving' || autoTimerStatus.state === 'pre-start'
                  ? colors.warning 
                  : autoTimerStatus.state === 'active' 
                    ? colors.success 
                    : colors.textSecondary;
              }
              
              return (
                <View key={job.id}>
                  {/* Mostrar barra de progreso cuando hay pre-start countdown */}
                  {isAutoTimerActive && autoTimerStatus?.state === 'pre-start' && autoTimerStatus.remainingTime > 0 && (
                    <View style={styles.autoTimerProgressContainer}>
                      <View style={styles.autoTimerProgressBar}>
                        <Animated.View 
                          style={[
                            styles.autoTimerProgressFill,
                            {
                              width: `${((autoTimerStatus.totalDelayTime - autoTimerStatus.remainingTime) / autoTimerStatus.totalDelayTime) * 100}%`,
                              backgroundColor: colors.warning
                            }
                          ]}
                        />
                      </View>
                      <Text style={[styles.autoTimerCountdown, { color: colors.warning }]}>
                        {Math.ceil(autoTimerStatus.remainingTime)}s
                      </Text>
                    </View>
                  )}
                  {/* Mostrar tiempo transcurrido cuando está activo */}
                  {(() => {
                    const shouldShowTime = isAutoTimerActive && autoTimerStatus?.state === 'active';
                    console.log('🔍 MapLocation showing time condition:', {
                      isAutoTimerActive,
                      autoTimerState: autoTimerStatus?.state,
                      jobId: job.id,
                      autoTimerJobId: autoTimerStatus?.jobId,
                      shouldShowTime,
                      elapsedTime
                    });
                    return shouldShowTime;
                  })() && (
                    <View style={[styles.autoTimerProgressContainer, { justifyContent: 'space-between' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <IconSymbol 
                          size={14} 
                          name="clock.arrow.circlepath" 
                          color={colors.success} 
                        />
                        <Text style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: colors.success
                        }}>
                          AUTOTIMER
                        </Text>
                      </View>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3
                      }}>
                        <IconSymbol 
                          size={11} 
                          name="clock" 
                          color={colors.text} 
                        />
                        <Text style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: isTimerPaused ? colors.warning : colors.text
                        }}>
                          {isTimerPaused ? '⏸ ' : ''}{formatTime(elapsedTime)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
            
            {/* Texto explicativo del countdown */}
            {/* Countdown removed - AutoTimer now starts/stops immediately */}
              </BlurView>
            )}
          </Animated.View>
      )}


      {/* Simple info overlay */}
      {jobs.length === 0 && !showJobForm && (
        <View style={styles.overlay}>
          <View style={[styles.centeredContent, { marginBottom: 80 }]}>
            <TouchableOpacity
              style={styles.mainActionCard}
              onPress={handleAddJob}
            >
              <BlurView intensity={85} tint={isDark ? "dark" : "light"} style={[styles.mainActionCardInner, {
                backgroundColor: isDark ? 'rgba(76, 135, 175, 0.25)' : 'rgba(76, 135, 175, 0.25)' ,
                borderWidth: 0,
                borderColor: 'transparent'
              }]}>
                <View style={[styles.mainActionIcon, {
                  backgroundColor: isDark ? 'rgba(76, 135, 175, 0.25)' : 'rgba(76, 135, 175, 0.25)' ,
                  borderWidth: 0
                }]}>
                  <IconSymbol size={36} name="plus" color={colors.primary} />
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

      {/* Floating job cards button - only show when map is active and mini calendar is not visible */}
      {jobs.length > 0 && (autoTimerStatus?.state === 'active' || autoTimerStatus?.state === 'cancelled') && !shouldShowMiniCalendar && (
        <TouchableOpacity
          style={[styles.floatingAddButton, { bottom: 120 }]} // Subido más arriba
          onPress={() => setShowJobCardsModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.floatingAddButtonInner}>
            <LinearGradient
              colors={isDark 
                ? [colors.primary + '90', colors.primary + '60'] 
                : [colors.primary + '90', colors.primary + '70']
              }
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <IconSymbol size={32} name="briefcase.fill" color="#FFFFFF" />
            {jobs.length > 1 && (
              <View style={styles.mainActionBadge}>
                <Text style={styles.mainActionBadgeText}>{jobs.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}

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
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={styles.actionModalContent}>
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