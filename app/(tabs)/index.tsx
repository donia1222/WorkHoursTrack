import React, { useEffect, useState } from 'react';
import { View, Alert, StyleSheet, Text, TouchableOpacity, SafeAreaView, Linking, AppState } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';

import Loading from '../components/Loading';
import MapLocation from '../components/MapLocation';
import NoLocationMapView from '../components/NoLocationMapView';
import OnboardingScreen from '../screens/OnboardingScreen';
import Header from '../components/Header';
import ProfileModal from '../components/ProfileModal';
import SideMenu from '../components/SideMenu';

import TimerScreen from '../screens/TimerScreen';
import EnhancedReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CalendarScreen from '../screens/CalendarScreen';

import { NavigationProvider, useNavigation, ScreenName } from '../context/NavigationContext';
import { OnboardingService } from '../services/OnboardingService';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

// Componente con animaciones suaves para transiciones
const ScreenWrapper = ({ children, screenKey }: { children: React.ReactNode; screenKey: string }) => {
  return (
    <Animated.View 
      key={screenKey}
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={{ flex: 1 }}
    >
      {children}
    </Animated.View>
  );
};

function AppContent() {
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [useWithoutLocation, setUseWithoutLocation] = useState(false);
  const { currentScreen, navigateTo } = useNavigation();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    // Verificar si ya se mostró el onboarding
    AsyncStorage.getItem('onboardingSeen').then((value) => {
      setShowOnboarding(value !== 'true'); // true = ya visto
    });
  }, []);

  useEffect(() => {
    // Verificar si debe mostrar welcome modal después del onboarding inicial
    const checkWelcomeModal = async () => {
      if (showOnboarding === false) {
        const hasCompleted = await OnboardingService.hasCompletedOnboarding();
        if (!hasCompleted) {
          setShowWelcomeModal(true);
        }
      }
    };
    checkWelcomeModal();
  }, [showOnboarding]);

  useEffect(() => {
    if (showOnboarding === false && !isRequestingLocation) {
      requestLocationPermission();
    }
  }, [showOnboarding]);

  // Listen for app state changes to re-check permissions when user returns from settings
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active' && locationPermissionDenied) {
        // Re-check permissions when app becomes active and permissions were denied
        await requestLocationPermission();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [locationPermissionDenied]);

  const requestLocationPermission = async () => {
    setIsRequestingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setLocationPermissionDenied(true);
        setErrorMsg(null); // Clear error message since we'll show a better UI
        return;
      }

      // Permission granted, get location
      setLocationPermissionDenied(false);
      setErrorMsg(null);
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermissionDenied(true);
    } finally {
      setIsRequestingLocation(false);
    }
  };

  const openLocationSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Error opening location settings:', error);
    }
  };

  const continueWithoutLocation = () => {
    setLocationPermissionDenied(false);
    setErrorMsg(null);
    setUseWithoutLocation(true);
    // Don't set location, just continue with app functionality
  };

  const renderLocationPermissionDenied = () => {
    return (
      <View style={locationDeniedStyles.container}>
        <View style={locationDeniedStyles.content}>
          <BlurView 
            intensity={95} 
            tint={isDark ? "dark" : "light"} 
            style={locationDeniedStyles.card}
          >
            <View style={locationDeniedStyles.iconContainer}>
              <IconSymbol 
                size={60} 
                name="location.slash" 
                color="rgba(255, 59, 48, 0.8)" 
              />
            </View>
            
            <Text style={[locationDeniedStyles.title, { color: colors.text }]}>
              {t('maps.location_permission_denied_title')}
            </Text>
            
            <Text style={[locationDeniedStyles.message, { color: colors.textSecondary }]}>
              {t('maps.location_permission_denied_message')}
            </Text>
            
            <View style={locationDeniedStyles.buttons}>
              <TouchableOpacity 
                style={[locationDeniedStyles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={openLocationSettings}
              >
                <IconSymbol size={20} name="gear" color="#FFFFFF" />
                <Text style={locationDeniedStyles.primaryButtonText}>
                  {t('maps.location_open_settings')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[locationDeniedStyles.secondaryButton, { borderColor: colors.separator }]}
                onPress={continueWithoutLocation}
              >
                <Text style={[locationDeniedStyles.secondaryButtonText, { color: colors.text }]}>
                  {t('maps.location_continue_without')}
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </View>
    );
  };

  const handleNavigate = (screen: string, options?: any) => {
    if (screen === 'jobs-management') {
      // Special handling for jobs management - navigate to settings and open jobs modal
      navigateTo('settings');
      // We'll need to pass this information to SettingsScreen
      setNavigationOptions({ openJobsModal: true, ...options });
    } else {
      navigateTo(screen as ScreenName);
    }
  };

  const [navigationOptions, setNavigationOptions] = useState<any>(null);

  const handleWelcomeModalClose = async () => {
    setShowWelcomeModal(false);
    await OnboardingService.markOnboardingComplete();
  };

  const renderCurrentScreen = () => {
    // Show loading only when actively requesting location
    if (isRequestingLocation && currentScreen === 'mapa') {
      return <Loading message="Obteniendo ubicación actual..." />;
    }

    switch (currentScreen) {
      case 'mapa':
        if (locationPermissionDenied) {
          // Show permission denied UI instead of map
          return (
            <ScreenWrapper screenKey="mapa-no-location">
              {renderLocationPermissionDenied()}
            </ScreenWrapper>
          );
        }
        if (useWithoutLocation) {
          // Show app functionality without location
          return (
            <ScreenWrapper screenKey="mapa-without-location">
              <NoLocationMapView onNavigate={handleNavigate} />
            </ScreenWrapper>
          );
        }
        return (
          <ScreenWrapper screenKey="mapa">
            {location ? <MapLocation location={location} onNavigate={handleNavigate} /> : <Loading message="Obteniendo ubicación actual..." />}
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
            <CalendarScreen onNavigate={handleNavigate} />
          </ScreenWrapper>
        );
      case 'settings':
        return (
          <ScreenWrapper screenKey="settings">
            <SettingsScreen onNavigate={handleNavigate} navigationOptions={navigationOptions} onNavigationHandled={() => setNavigationOptions(null)} />
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

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'mapa':
        return (
          <View style={styles.workTrackTitle}>
            <IconSymbol size={24} name="clock.fill" color="#34C759" />
            <Text style={[styles.workText, { color: '#007AFF' }]}>Work</Text>
            <Text style={[styles.trackText, { color: '#34C759' }]}>Track</Text>
          </View>
        );
      case 'timer':
        return 'Timer';
      case 'reports':
        return 'Reportes';
      case 'calendar':
        return 'Calendario';
      case 'settings':
        return 'Configuración';
      default:
        return (
          <View style={styles.workTrackTitle}>
            <IconSymbol size={24} name="clock.fill" color="#34C759" />
            <Text style={[styles.workText, { color: '#007AFF' }]}>Work</Text>
            <Text style={[styles.trackText, { color: '#34C759' }]}>Track</Text>
          </View>
        );
    }
  };

  if (showOnboarding === null) {
    return <Loading message="Cargando..." />;
  }

  if (showOnboarding) {
    return (
      <OnboardingScreen
        onDone={async () => {
          await AsyncStorage.setItem('onboardingSeen', 'true');
          setShowOnboarding(false);
        }}
      />
    );
  }


  // Para pantallas que no son mapa, renderizar directamente
  if (currentScreen !== 'mapa') {
    return (
      <>
        {renderCurrentScreen()}
      
      </>
    );
  }

  // Para pantalla de mapa, usar el layout original
  return (
    <View style={styles.container}>
      <Header 
        title={getScreenTitle()} 
        onProfilePress={() => setShowProfile(true)}
        onMenuPress={() => setShowMenu(true)}
      />
      {renderCurrentScreen()}
      <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} />
      <SideMenu 
        visible={showMenu} 
        onClose={() => setShowMenu(false)} 
        onMenuToggle={() => setShowMenu(!showMenu)}
        onNavigate={handleNavigate}
      />

   
    </View>
  );
}

export default function Index() {
  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workTrackTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titleIcon: {
    marginRight: 4,
  },
  workText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  trackText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});

const locationDeniedStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxWidth: 350,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
