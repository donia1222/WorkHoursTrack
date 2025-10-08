import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Linking, AppState, Modal } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn } from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

// globals
declare global {
  var reportsScreenExportHandler: (() => void) | undefined;
  var calendarScreenSyncHandler: (() => void) | undefined;
  var timerScreenNotesHandler: (() => void) | undefined;
  var chatbotScreenHistoryHandler: (() => void) | undefined;
  var showFeaturesModalHandler: (() => void) | undefined;
  var showHelpSupportHandler: (() => void) | undefined;
  var showAutoBackupHandler: (() => void) | undefined;
}

import Loading from '../components/Loading';
import SplashLoader from '../components/SplashLoader';
import MapLocation from '../components/MapLocation';
import WelcomeModal from '../components/WelcomeModal';
import PrivacyLocationModal from '../components/PrivacyLocationModal';
import BottomNavigation from '../components/BottomNavigation';

import TimerScreen from '../screens/TimerScreen';
import EnhancedReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import AutoBackupModal from '../components/AutoBackupModal';

import { NavigationProvider, useNavigation, ScreenName } from '../context/NavigationContext';
import { OnboardingService } from '../services/OnboardingService';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../hooks/useSubscription';
import { AutoBackupService, BackupFrequency } from '../services/AutoBackupService';
import SimpleQuickActionsManager from '../services/SimpleQuickActionsManager';

// estilos
import { styles, featuresModalStyles } from '../Styles/index.styles';

// Wrapper animado
const ScreenWrapper = ({ children, screenKey }: { children: React.ReactNode; screenKey: string }) => (
  <Animated.View key={screenKey} entering={FadeIn.duration(300)} style={{ flex: 1 }}>
    {children}
  </Animated.View>
);

function AppContent() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);

  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [isReload, setIsReload] = useState(false);

  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [useWithoutLocation, setUseWithoutLocation] = useState(false);

  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [showInfoButton, setShowInfoButton] = useState(true);

  const [showAutoBackupModal, setShowAutoBackupModal] = useState(false);
  const [showPrivacyLocationModal, setShowPrivacyLocationModal] = useState<boolean | null>(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState<BackupFrequency>('daily');
  const [availableBackups, setAvailableBackups] = useState<any[]>([]);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  const [navigationOptions, setNavigationOptions] = useState<any>(null);
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'year'>('month');
  
  // Sync with global calendar view mode
  useEffect(() => {
    if (typeof globalThis.calendarViewMode !== 'undefined') {
      console.log('🔄 Index: Syncing with global view mode:', globalThis.calendarViewMode);
      setCalendarViewMode(globalThis.calendarViewMode);
    }
    
    // Listen for changes from header
    const checkForUpdates = setInterval(() => {
      if (globalThis.calendarViewMode !== calendarViewMode) {
        console.log('🔄 Index: Detected view mode change:', globalThis.calendarViewMode);
        setCalendarViewMode(globalThis.calendarViewMode);
      }
    }, 100);
    
    return () => clearInterval(checkForUpdates);
  }, [calendarViewMode]);
  
  // Update global when local changes
  useEffect(() => {
    globalThis.calendarViewMode = calendarViewMode;
    console.log('🔄 Index: Updated global view mode to:', calendarViewMode);
  }, [calendarViewMode]);

  const { currentScreen, navigateTo } = useNavigation();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { isLoading: subscriptionLoading } = useSubscription();

  // Exponer función para mostrar features modal, help support y auto backup
  useEffect(() => {
    globalThis.showFeaturesModalHandler = () => setShowFeaturesModal(true);
    globalThis.showHelpSupportHandler = () => setShowHelpSupport(true);
    globalThis.showAutoBackupHandler = () => setShowAutoBackupModal(true);
    return () => {
      globalThis.showFeaturesModalHandler = undefined;
      globalThis.showHelpSupportHandler = undefined;
      globalThis.showAutoBackupHandler = undefined;
    };
  }, []);

  // Carga de configuración de backup
  const loadAutoBackupConfig = useCallback(async () => {
    try {
      const config = await AutoBackupService.getConfig();
      setAutoBackupEnabled(config.enabled);
      setAutoBackupFrequency(config.frequency);
      setLastBackupDate(config.lastBackupDate || null);
      const backups = await AutoBackupService.getAvailableBackups();
      setAvailableBackups(backups);
    } catch (error) {
      console.error('Error loading auto backup config:', error);
    }
  }, []);

  // Setup inicial + almacenamiento
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [lastOpenTime, privacySeen, onboardingSeen, infoPressed] = await Promise.all([
          AsyncStorage.getItem('lastAppOpenTime'),
          AsyncStorage.getItem('privacyLocationSeen'),
          AsyncStorage.getItem('onboardingSeen'),
          AsyncStorage.getItem('infoButtonPressed'),
        ]);

        // reload?
        const now = Date.now();
        if (lastOpenTime && now - parseInt(lastOpenTime) < 5 * 60 * 1000) setIsReload(true);
        await AsyncStorage.setItem('lastAppOpenTime', String(now));

        setShowPrivacyLocationModal(privacySeen !== 'true');
        setShowOnboarding(onboardingSeen !== 'true');
        setShowInfoButton(infoPressed !== 'true');
      } catch (e) {
        console.log('bootstrap error:', e);
      }
    };

    bootstrap();
    loadAutoBackupConfig();

    const loadingDuration = isReload ? 400 : 1600;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => setInitialLoading(false), 400);
    }, loadingDuration);

    return () => clearTimeout(timer);
  }, [isReload, loadAutoBackupConfig]);

  // Quick Actions
  useEffect(() => {
    const handleQuickAction = (screen: string) => {
      const quickActionScreens = ['timer', 'reports', 'calendar', 'chatbot'];
      if (quickActionScreens.includes(screen)) {
        setTimeout(() => navigateTo(screen as ScreenName), 100);
      }
    };
    SimpleQuickActionsManager.setNavigationReady(true);
    SimpleQuickActionsManager.on('quickAction', handleQuickAction);
    return () => {
      SimpleQuickActionsManager.off('quickAction', handleQuickAction);
      SimpleQuickActionsManager.setNavigationReady(false);
    };
  }, [navigateTo, currentScreen]);

  // Mostrar Welcome si no completó onboarding
  useEffect(() => {
    const checkWelcome = async () => {
      if (showOnboarding === false) {
        const done = await OnboardingService.hasCompletedOnboarding();
        if (!done) {
          // usamos el mismo WelcomeModal del flujo de onboarding (no guardamos otro estado)
        }
      }
    };
    checkWelcome();
  }, [showOnboarding]);

  // Pedir permisos de ubicación al terminar onboarding
  useEffect(() => {
    if (showOnboarding === false && !isRequestingLocation) requestLocationPermission();
  }, [showOnboarding]);

  // Re-check permisos al volver a "active"
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState !== 'active') return;
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        if (locationPermissionDenied || useWithoutLocation) {
          setLocationPermissionDenied(false);
          setUseWithoutLocation(false);
          try {
            const loc = await Location.getCurrentPositionAsync({});
            setLocation(loc.coords);
          } catch (error) {
            console.error('getCurrentPosition after granted:', error);
          }
        }
      } else {
        if (!locationPermissionDenied && !useWithoutLocation && location) {
          setLocation(null);
          setLocationPermissionDenied(true);
          setUseWithoutLocation(false);
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub?.remove();
  }, [locationPermissionDenied, useWithoutLocation, location]);

  // Mostrar features modal si nunca se vio
  useEffect(() => {
    const run = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem('hasSeenFeaturesModal');
        if (hasSeen !== 'true') {
          const timer = setTimeout(() => setShowFeaturesModal(true), 30000);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('check features modal:', error);
      }
    };
    run();
  }, []);

  // Permisos de ubicación
  const requestLocationPermission = async () => {
    setIsRequestingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermissionDenied(true);
        return;
      }
      setLocationPermissionDenied(false);
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    } catch (error) {
      console.error('requestLocationPermission:', error);
      setLocationPermissionDenied(true);
    } finally {
      setIsRequestingLocation(false);
    }
  };

  const openLocationSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('openLocationSettings:', error);
    }
  };

  const continueWithoutLocation = () => {
    setLocationPermissionDenied(false);
    setUseWithoutLocation(true);
  };

  const handleNavigate = (screen: string, options?: any) => {
    if (screen === 'jobs-management') {
      navigateTo('settings');
      setNavigationOptions({ openJobsModal: true, ...options });
    } else {
      navigateTo(screen as ScreenName);
    }
  };

  const handleFeaturesModalClose = async () => {
    setShowFeaturesModal(false);
    try {
      await AsyncStorage.setItem('hasSeenFeaturesModal', 'true');
    } catch (error) {
      console.error('save features flag:', error);
    }
  };

  const handleAnalyzeBotPress = () => {
    setShowFeaturesModal(false);
    handleFeaturesModalClose();
    navigateTo('chatbot');
  };

  // Render de pantallas
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'mapa':
        return (
          <ScreenWrapper screenKey="mapa">
            <MapLocation location={location || undefined} onNavigate={handleNavigate} />
          </ScreenWrapper>
        );
      case 'timer':
        return (
          <ScreenWrapper screenKey="timer">
            <TimerScreen onNavigate={handleNavigate} />
          </ScreenWrapper>
        );
      case 'reports':
        return (
          <ScreenWrapper screenKey="reports">
            <EnhancedReportsScreen onNavigate={handleNavigate} />
          </ScreenWrapper>
        );
      case 'calendar':
        return (
          <ScreenWrapper screenKey="calendar">
            <CalendarScreen 
              onNavigate={handleNavigate} 
              viewMode={calendarViewMode}
              onViewToggle={(mode) => {
                setCalendarViewMode(mode);
                globalThis.calendarViewMode = mode;
              }}
            />
          </ScreenWrapper>
        );
      case 'settings':
        return (
          <ScreenWrapper screenKey="settings">
            <SettingsScreen
              onNavigate={handleNavigate}
              navigationOptions={navigationOptions}
              onNavigationHandled={() => setNavigationOptions(null)}
            />
          </ScreenWrapper>
        );
      case 'subscription':
        return (
          <ScreenWrapper screenKey="subscription">
            <SubscriptionScreen />
          </ScreenWrapper>
        );
      case 'chatbot':
        return (
          <ScreenWrapper screenKey="chatbot">
            <ChatbotScreen />
          </ScreenWrapper>
        );
      default:
        return location ? (
          <ScreenWrapper screenKey="default">
            <MapLocation location={location} />
          </ScreenWrapper>
        ) : null;
    }
  };



  // Loading gates
  if (initialLoading) return <SplashLoader isExiting={isExiting} />;
  if (showPrivacyLocationModal === null || showOnboarding === null) return <Loading showMessage={false} />;

  if (showPrivacyLocationModal) {
    return (
      <PrivacyLocationModal
        visible
        onClose={() => setShowPrivacyLocationModal(false)}
        onAccept={() => setShowPrivacyLocationModal(false)}
      />
    );
  }

  if (showOnboarding) {
    return (
      <WelcomeModal
        visible
        isOnboarding
        onClose={() => setShowOnboarding(false)}
        onDone={async () => {
          await AsyncStorage.setItem('onboardingSeen', 'true');
          setShowOnboarding(false);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ flex: 1 }}>{renderCurrentScreen()}</View>

      <BottomNavigation />



      {/* Help Support Modal */}
      <Modal
        visible={showHelpSupport}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowHelpSupport(false)}
      >
        <HelpSupportScreen onClose={() => setShowHelpSupport(false)} />
      </Modal>

      {/* Auto Backup Modal */}
      <AutoBackupModal
        visible={showAutoBackupModal}
        onClose={() => setShowAutoBackupModal(false)}
        enabled={autoBackupEnabled}
        frequency={autoBackupFrequency}
        availableBackups={availableBackups}
        lastBackupDate={lastBackupDate}
        onConfigChange={async (enabled, frequency) => {
          try {
            await AutoBackupService.updateConfig({ enabled, frequency });
            if (enabled) await AutoBackupService.createAutoBackup();
            await loadAutoBackupConfig();
          } catch (error) {
            console.error('update auto backup:', error);
          }
        }}
        onDownloadBackup={async (backup) => {
          try {
            await AutoBackupService.downloadBackup(backup);
          } catch (error) {
            console.error('download backup:', error);
          }
        }}
        onRefreshBackups={async () => {
          try {
            await loadAutoBackupConfig();
            if (autoBackupEnabled) {
              await AutoBackupService.createBackupNow();
              await loadAutoBackupConfig();
            }
          } catch (error) {
            console.error('refresh backups:', error);
          }
        }}
        onDeleteBackup={async (backup) => {
          try {
            await AutoBackupService.deleteBackup(backup);
            await loadAutoBackupConfig();
          } catch (error) {
            console.error('delete backup:', error);
          }
        }}
      />
    </SafeAreaView>
  );
}

export default function Index() {
  return <AppContent />;
}