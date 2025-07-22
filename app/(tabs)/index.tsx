import React, { useEffect, useState } from 'react';
import { View, Alert, StyleSheet, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';

import Loading from '../components/Loading';
import MapLocation from '../components/MapLocation';
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
  const { currentScreen, navigateTo } = useNavigation();

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
    if (showOnboarding === false) {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setErrorMsg('Permiso denegado para acceder a la ubicación.');
          Alert.alert('Error', 'Necesitas permitir el acceso a la ubicación.');
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      })();
    }
  }, [showOnboarding]);

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
    if (!location && currentScreen === 'mapa') {
      return <Loading message="Obteniendo ubicación actual..." />;
    }

    switch (currentScreen) {
      case 'mapa':
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

  if (errorMsg) {
    return (
      <>
        <Header 
          title={getScreenTitle()} 
          onProfilePress={() => setShowProfile(true)}
          onMenuPress={() => setShowMenu(true)}
        />
        <View style={styles.center}>
          <Text>{errorMsg}</Text>
        </View>
        <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} />
        <SideMenu 
          visible={showMenu} 
          onClose={() => setShowMenu(false)} 
          onMenuToggle={() => setShowMenu(!showMenu)}
          onNavigate={handleNavigate}
        />

   
      </>
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
