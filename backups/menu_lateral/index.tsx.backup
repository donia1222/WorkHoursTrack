import React, { useEffect, useState } from 'react';
import { View, Alert, StyleSheet, Text, TouchableOpacity, SafeAreaView, Linking, AppState, Modal } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

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
import SubscriptionScreen from '../screens/SubscriptionScreen';
import ChatbotScreen from '../screens/ChatbotScreen';

import { NavigationProvider, useNavigation, ScreenName } from '../context/NavigationContext';
import { OnboardingService } from '../services/OnboardingService';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../hooks/useSubscription';

// Componente con animaciones suaves para transiciones
const ScreenWrapper = ({ children, screenKey }: { children: React.ReactNode; screenKey: string }) => {
  return (
    <Animated.View 
      key={screenKey}
      entering={FadeIn.duration(300)}
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
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const { currentScreen, navigateTo } = useNavigation();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { isSubscribed, isLoading: subscriptionLoading, customerInfo } = useSubscription();

  useEffect(() => {
    // Verificar si ya se mostró el onboarding
    AsyncStorage.getItem('onboardingSeen').then((value) => {
      setShowOnboarding(value !== 'true'); // true = ya visto
    });
  }, []);

  // Verificar estado de suscripción al iniciar la app
  useEffect(() => {
    if (!subscriptionLoading) {
      console.log('🔍 VERIFICACIÓN DE SUSCRIPCIÓN AL INICIAR:');
      console.log(`📱 Estado de suscripción: ${isSubscribed ? '✅ SUSCRITO' : '❌ NO SUSCRITO'}`);
      
      if (isSubscribed && customerInfo) {
        console.log('👤 Información del cliente:');
        console.log(`🆔 User ID: ${customerInfo.originalAppUserId}`);
        console.log(`📅 Fecha de primera compra: ${customerInfo.firstSeen}`);
        
        // Mostrar detalles de suscripciones activas
        const activeEntitlements = Object.entries(customerInfo.entitlements.active);
        if (activeEntitlements.length > 0) {
          console.log('🏆 SUSCRIPCIONES ACTIVAS:');
          activeEntitlements.forEach(([key, entitlement]) => {
            console.log(`  📦 Producto: ${entitlement.productIdentifier}`);
            console.log(`  🏷️ Entitlement: ${entitlement.identifier}`);
            console.log(`  💰 Comprado: ${new Date(entitlement.latestPurchaseDate).toLocaleString()}`);
            if (entitlement.expirationDate) {
              console.log(`  ⏰ Expira: ${new Date(entitlement.expirationDate).toLocaleString()}`);
            }
            console.log(`  🔄 Renovación automática: ${entitlement.willRenew ? 'SÍ' : 'NO'}`);
            console.log('  ---');
          });
        }

        // Mostrar productos comprados (con verificación de seguridad)
        const purchasedProducts = (customerInfo as any).nonSubscriptions ? Object.entries((customerInfo as any).nonSubscriptions) : [];
        if (purchasedProducts.length > 0) {
          console.log('🛒 PRODUCTOS COMPRADOS:');
          purchasedProducts.forEach(([productId, purchases]) => {
            console.log(`  📦 Producto: ${productId}`);
            if (purchases && Array.isArray(purchases)) {
              purchases.forEach((purchase, index) => {
                console.log(`    🛍️ Compra ${index + 1}: ${new Date(purchase.purchaseDate).toLocaleString()}`);
              });
            }
          });
        }
      } else {
        console.log('💡 Usuario no suscrito - Mostrar opciones premium disponibles');
      }
      console.log('🔍 ==========================================');
    }
  }, [isSubscribed, subscriptionLoading, customerInfo]);

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
      if (nextAppState === 'active') {
        // Always check permissions when app becomes active
        const { status } = await Location.getForegroundPermissionsAsync();
        
        if (status === 'granted') {
          // Permissions are granted
          if (locationPermissionDenied || useWithoutLocation) {
            // Was in denied/no-location mode, switch to normal mode
            setLocationPermissionDenied(false);
            setUseWithoutLocation(false);
            setErrorMsg(null);
            
            // Get current location
            try {
              const loc = await Location.getCurrentPositionAsync({});
              setLocation(loc.coords);
            } catch (error) {
              console.error('Error getting location after permission granted:', error);
            }
          }
        } else {
          // Permissions are denied
          if (!locationPermissionDenied && !useWithoutLocation && location) {
            // Was in normal mode with location, switch to denied mode
            setLocation(null);
            setLocationPermissionDenied(true);
            setUseWithoutLocation(false);
            setErrorMsg(null);
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [locationPermissionDenied, useWithoutLocation, location]);

  // Show features modal after 1 minute if it hasn't been shown before
  useEffect(() => {
    const checkAndShowFeaturesModal = async () => {
      try {
        const hasSeenModal = await AsyncStorage.getItem('hasSeenFeaturesModal');
        
        if (hasSeenModal !== 'true') {
          // Set timer for 30 seconds (30000 ms)
          const timer = setTimeout(() => {
            setShowFeaturesModal(true);
          }, 30000);
          
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('Error checking features modal status:', error);
      }
    };

    checkAndShowFeaturesModal();
  }, []);

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

  const handleFeaturesModalClose = async () => {
    setShowFeaturesModal(false);
    try {
      await AsyncStorage.setItem('hasSeenFeaturesModal', 'true');
    } catch (error) {
      console.error('Error saving features modal status:', error);
    }
  };

  const handleAnalyzeBotPress = () => {
    setShowFeaturesModal(false);
    handleFeaturesModalClose();
    navigateTo('chatbot');
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'mapa':
        // Always show MapLocation regardless of permission status
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
            <CalendarScreen onNavigate={handleNavigate} />
          </ScreenWrapper>
        );
      case 'settings':
        return (
          <ScreenWrapper screenKey="settings">
            <SettingsScreen onNavigate={handleNavigate} navigationOptions={navigationOptions} onNavigationHandled={() => setNavigationOptions(null)} />
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
        return (
          <View style={styles.screenTitle}>
            <IconSymbol size={26} name="clock.fill" color="#34C759" />
            <Text style={[styles.screenTitleText, { color: colors.text }]}>{t('timer.title')}</Text>
          </View>
        );
      case 'reports':
        return (
          <View style={styles.screenTitle}>
            <IconSymbol size={26} name="doc.text.fill" color="#FF9500" />
            <Text style={[styles.screenTitleText, { color: colors.text }]}>{t('reports.title')}</Text>
          </View>
        );
      case 'calendar':
        return (
          <View style={styles.screenTitle}>
            <IconSymbol size={26} name="calendar" color="#6366F1" />
            <Text style={[styles.screenTitleText, { color: colors.text }]}>{t('calendar.title')}</Text>
          </View>
        );
      case 'settings':
        return (
          <View style={styles.screenTitle}>
            <IconSymbol size={26} name="gear" color="#8E8E93" />
            <Text style={[styles.screenTitleText, { color: colors.text }]}>{t('settings.title')}</Text>
          </View>
        );
      case 'subscription':
        return (
          <View style={styles.screenTitle}>
            <IconSymbol size={26} name="crown.fill" color="#FFD700" />
            <Text style={[styles.screenTitleText, { color: colors.text }]}>{t('subscription.title')}</Text>
          </View>
        );
      case 'chatbot':
        return t('chatbot.title') || 'Chatbot IA';
      default:
        return (
          <View style={styles.workTrackTitle}>
            <IconSymbol size={26} name="clock.fill" color="#34C759" />
            <Text style={[styles.workText, { color: '#007AFF' }]}>Work</Text>
            <Text style={[styles.trackText, { color: '#34C759' }]}>Track</Text>
          </View>
        );
    }
  };

  if (showOnboarding === null) {
    return <Loading showMessage={false} />;
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


  // Renderizar siempre con header y menu para mantener consistencia
  return (
    <View style={styles.container}>
      {(currentScreen === 'mapa' || currentScreen === 'chatbot' || currentScreen === 'timer' || currentScreen === 'reports' || currentScreen === 'calendar' || currentScreen === 'settings' || currentScreen === 'subscription') && (
        <Header 
          title={getScreenTitle()} 
          onProfilePress={() => setShowProfile(true)}
          onMenuPress={() => setShowMenu(true)}
        />
      )}
      {renderCurrentScreen()}
      <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} />
      <SideMenu 
        visible={showMenu} 
        onClose={() => setShowMenu(false)} 
        onMenuToggle={() => setShowMenu(!showMenu)}
        onNavigate={handleNavigate}
      />
      
      {/* Features Modal */}
      <Modal
        visible={showFeaturesModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleFeaturesModalClose}
      >
        <View style={featuresModalStyles.overlay}>
          <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={[featuresModalStyles.container, { backgroundColor: isDark ? colors.surface : '#FFFFFF' }]}>
            <View style={featuresModalStyles.header}>
              <Text style={[featuresModalStyles.title, { color: colors.text }]}>News! 🎉</Text>
              <TouchableOpacity
                style={featuresModalStyles.closeButton}
                onPress={handleFeaturesModalClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={featuresModalStyles.content}>
              {/* Features copied from WelcomeMessage */}
              <View style={featuresModalStyles.featuresList}>
                <View style={featuresModalStyles.featureItem}>
                  <View style={[featuresModalStyles.featureIcon, { backgroundColor: isDark ? colors.primary + '15' : colors.primary + '10' }]}>
                    <Ionicons name="document-text" size={16} color={colors.primary} />
                  </View>
                  <Text style={[featuresModalStyles.featureText, { color: colors.text }]}>{t('chatbot.feature_analyze')}</Text>
                </View>

                <View style={featuresModalStyles.featureItem}>
                  <View style={[featuresModalStyles.featureIcon, { backgroundColor: isDark ? colors.primary + '15' : colors.primary + '10' }]}>
                    <Ionicons name="search" size={16} color={colors.primary} />
                  </View>
                  <Text style={[featuresModalStyles.featureText, { color: colors.text }]}>{t('chatbot.feature_extract')}</Text>
                </View>

                <View style={featuresModalStyles.featureItem}>
                  <View style={[featuresModalStyles.featureIcon, { backgroundColor: isDark ? colors.primary + '15' : colors.primary + '10' }]}>
                    <Ionicons name="calendar" size={16} color={colors.primary} />
                  </View>
                  <Text style={[featuresModalStyles.featureText, { color: colors.text }]}>{t('chatbot.feature_identify')}</Text>
                </View>

                <View style={featuresModalStyles.featureItem}>
                  <View style={[featuresModalStyles.featureIcon, { backgroundColor: isDark ? colors.primary + '15' : colors.primary + '10' }]}>
                    <Ionicons name="people" size={16} color={colors.primary} />
                  </View>
                  <Text style={[featuresModalStyles.featureText, { color: colors.text }]}>{t('chatbot.feature_detect')}</Text>
                </View>

                <View style={featuresModalStyles.featureItem}>
                  <View style={[featuresModalStyles.featureIcon, { backgroundColor: isDark ? colors.primary + '15' : colors.primary + '10' }]}>
                    <Ionicons name="download" size={16} color={colors.primary} />
                  </View>
                  <Text style={[featuresModalStyles.featureText, { color: colors.text }]}>{t('chatbot.feature_export')}</Text>
                </View>

                <View style={featuresModalStyles.featureItem}>
                  <View style={[featuresModalStyles.featureIcon, { backgroundColor: isDark ? colors.primary + '15' : colors.primary + '10' }]}>
                    <Ionicons name="sync" size={16} color={colors.primary} />
                  </View>
                  <Text style={[featuresModalStyles.featureText, { color: colors.text }]}>{t('chatbot.feature_sync')}</Text>
                </View>
              </View>
              
              {/* Analyze Bot Button */}
              <TouchableOpacity
                style={[featuresModalStyles.analyzeButton, { backgroundColor: colors.primary }]}
                onPress={handleAnalyzeBotPress}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                <Text style={featuresModalStyles.analyzeButtonText}>Analyze bot</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>
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
  screenTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitleText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
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

const featuresModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});