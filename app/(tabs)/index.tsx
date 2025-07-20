import React, { useEffect, useState } from 'react';
import { View, Alert, StyleSheet, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/ui/IconSymbol';

import Loading from '../components/Loading';
import MapLocation from '../components/MapLocation';
import OnboardingScreen from '../screens/OnboardingScreen';
import Header from '../components/Header';
import ProfileModal from '../components/ProfileModal';
import SideMenu from '../components/SideMenu';
import TimerScreen from '../screens/TimerScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import WelcomeModal from '../components/WelcomeModal';
import { NavigationProvider, useNavigation, ScreenName } from '../context/NavigationContext';
import { OnboardingService } from '../services/OnboardingService';

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

  const handleNavigate = (screen: string) => {
    navigateTo(screen as ScreenName);
  };

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
        return location ? <MapLocation location={location} onNavigate={handleNavigate} /> : <Loading message="Obteniendo ubicación actual..." />;
      case 'timer':
        return <TimerScreen onNavigate={handleNavigate} />;
      case 'reports':
        return <ReportsScreen onNavigate={handleNavigate} />;
      case 'calendar':
        return <CalendarScreen onNavigate={handleNavigate} />;
      case 'settings':
        return <SettingsScreen onNavigate={handleNavigate} />;
      default:
        return location ? <MapLocation location={location} /> : null;
    }
  };

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'mapa':
        return 'Trabajos';
      case 'timer':
        return 'Timer';
      case 'reports':
        return 'Reportes';
      case 'calendar':
        return 'Calendario';
      case 'settings':
        return 'Configuración';
      default:
        return 'Trabajos';
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
        <WelcomeModal
          visible={showWelcomeModal}
          onClose={handleWelcomeModalClose}
        />
      </>
    );
  }

  // Para pantallas que no son mapa, renderizar directamente
  if (currentScreen !== 'mapa') {
    return (
      <>
        {renderCurrentScreen()}
        <WelcomeModal
          visible={showWelcomeModal}
          onClose={handleWelcomeModalClose}
        />
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
      <WelcomeModal
        visible={showWelcomeModal}
        onClose={handleWelcomeModalClose}
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
});
