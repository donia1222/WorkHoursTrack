import React, { useEffect, useState } from 'react';
import { View, Alert, StyleSheet, Text, TouchableOpacity, SafeAreaView, Linking, AppState, Modal, Image } from 'react-native';
import * as Location from 'expo-location';

import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

// Type declaration for global handlers
declare global {
  var reportsScreenExportHandler: (() => void) | undefined;
  var calendarScreenSyncHandler: (() => void) | undefined;
  var timerScreenNotesHandler: (() => void) | undefined;
  var chatbotScreenHistoryHandler: (() => void) | undefined;
}

import Loading from '../components/Loading';
import SplashLoader from '../components/SplashLoader';
import MapLocation from '../components/MapLocation';
import NoLocationMapView from '../components/NoLocationMapView';
import WelcomeModal from '../components/WelcomeModal';
import Header from '../components/Header';
import ProfileModal from '../components/ProfileModal';
import PrivacyLocationModal from '../components/PrivacyLocationModal';
// import SideMenu from '../components/SideMenu'; // Removed - using BottomNavigation
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
import AutoTimerService from '../services/AutoTimerService';
import { AutoBackupService, BackupFrequency } from '../services/AutoBackupService';
import { JobService } from '../services/JobService';
import { Job } from '../types/WorkTypes';
import SimpleQuickActionsManager from '../services/SimpleQuickActionsManager';

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isReload, setIsReload] = useState(false);
  // const [showMenu, setShowMenu] = useState(false); // Removed - using BottomNavigation
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
  const [showAutoTimerAlert, setShowAutoTimerAlert] = useState(false);
  const [autoTimerJob, setAutoTimerJob] = useState<Job | null>(null);
  const [hasShownAutoTimerAlert, setHasShownAutoTimerAlert] = useState(false); // Track if already shown this session
  const { currentScreen, navigateTo } = useNavigation();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { isSubscribed, isLoading: subscriptionLoading, customerInfo } = useSubscription();

  // Auto Backup Functions
  const loadAutoBackupConfig = async () => {
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
  };

  useEffect(() => {
    // Check if this is a reload (app was already used recently)
    const checkReloadStatus = async () => {
      try {
        const lastOpenTime = await AsyncStorage.getItem('lastAppOpenTime');
        const currentTime = Date.now();
        
        if (lastOpenTime) {
          const timeDiff = currentTime - parseInt(lastOpenTime);
          // If app was opened less than 5 minutes ago, consider it a reload
          if (timeDiff < 5 * 60 * 1000) {
            setIsReload(true);
          }
        }
        
        // Save current time
        await AsyncStorage.setItem('lastAppOpenTime', currentTime.toString());
      } catch (error) {
        console.log('Error checking reload status:', error);
      }
    };
    
    checkReloadStatus();
    
    // Use different timing for reload vs first load
    const loadingDuration = isReload ? 400 : 1600; // 0.4s for reload, 1.6s for first load
    
    // Set a timer for initial loading with fade out effect
    const timer = setTimeout(() => {
      setIsExiting(true);
      // Wait for fade out animation to complete
      setTimeout(() => {
        setInitialLoading(false);
      }, 400);
    }, loadingDuration); // Dynamic duration based on reload status

    // Check if privacy/location modal has been shown
    AsyncStorage.getItem('privacyLocationSeen').then((value) => {
      setShowPrivacyLocationModal(value !== 'true'); // true = ya visto
    });
    
    // Verificar si ya se mostró el onboarding
    AsyncStorage.getItem('onboardingSeen').then((value) => {
      setShowOnboarding(value !== 'true'); // true = ya visto
    });
    
    // Verificar si el botón de info ya fue presionado
    AsyncStorage.getItem('infoButtonPressed').then((value) => {
      setShowInfoButton(value !== 'true'); // true = ya presionado
    });
    
    // Load auto backup config
    loadAutoBackupConfig();

    return () => clearTimeout(timer);
  }, [isReload]);
  
  // Manejar Quick Actions con eventos (LA FORMA CORRECTA)
  useEffect(() => {
    console.log('🎯 Setting up Quick Actions listener in index.tsx');
    
    const handleQuickAction = (screen: string) => {
      console.log('📱 Quick Action evento recibido - Navegando a:', screen);
      console.log('📱 Current screen:', currentScreen);
      
      // SimpleQuickActionsManager envía el nombre de la pantalla directamente
      // Las pantallas válidas de Quick Actions son: timer, reports, calendar, chatbot
      const quickActionScreens = ['timer', 'reports', 'calendar', 'chatbot'];
      
      if (quickActionScreens.includes(screen)) {
        // Pequeño delay para asegurar que la navegación esté lista
        setTimeout(() => {
          console.log('✅ Ejecutando navegación a:', screen);
          navigateTo(screen as ScreenName);
          console.log('✅ Navegación completada a:', screen);
        }, 100);
      } else {
        console.warn('⚠️ Pantalla no válida desde Quick Action:', screen);
      }
    };

    // Mark navigation as ready once the component is mounted
    console.log('🎯 Marking navigation as ready');
    SimpleQuickActionsManager.setNavigationReady(true);

    // Subscribe to quick action events
    console.log('🎯 Subscribing to quick action events');
    SimpleQuickActionsManager.on('quickAction', handleQuickAction);

    // Clean up on unmount
    return () => {
      console.log('🎯 Cleaning up Quick Actions listener');
      SimpleQuickActionsManager.off('quickAction', handleQuickAction);
      SimpleQuickActionsManager.setNavigationReady(false);
    };
  }, [navigateTo, currentScreen]);

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

  // Monitor AutoTimer status and check if user is outside work radius
  useEffect(() => {
    const checkAutoTimerStatus = async () => {
      try {
        // Get all jobs
        const jobs = await JobService.getJobs();
        console.log('🔍 Checking AutoTimer status, found jobs:', jobs.length);
        
        // Find job with AutoTimer enabled
        const jobWithAutoTimer = jobs.find(job => job.autoTimer?.enabled);
        console.log('🔍 Job with AutoTimer enabled:', jobWithAutoTimer?.name);
        
        if (jobWithAutoTimer && location) {
          setAutoTimerJob(jobWithAutoTimer);
          
          // Check if user is outside the work radius
          if (jobWithAutoTimer.location?.latitude && jobWithAutoTimer.location?.longitude) {
            const distance = calculateDistance(
              location.latitude,
              location.longitude,
              jobWithAutoTimer.location.latitude,
              jobWithAutoTimer.location.longitude
            );
            
            const radius = jobWithAutoTimer.autoTimer?.geofenceRadius || 50;
            const isInsideRadius = distance <= radius;
            
            console.log('🔍 Distance from job:', distance, 'meters');
            console.log('🔍 Geofence radius:', radius, 'meters');
            console.log('🔍 Is inside radius:', isInsideRadius);
            console.log('🔍 Has shown alert before:', hasShownAutoTimerAlert);
            
            // Show alert only once per session if user is outside radius (when AutoTimer is enabled)
            if (!isInsideRadius && jobWithAutoTimer.autoTimer?.enabled && !hasShownAutoTimerAlert) {
              console.log('✅ Showing AutoTimer alert - outside radius! (First time this session)');
              setShowAutoTimerAlert(true);
              setHasShownAutoTimerAlert(true); // Mark as shown for this session
            } else if (isInsideRadius && showAutoTimerAlert) {
              // If user enters the radius and alert is showing, hide it
              console.log('❌ User entered radius - hiding alert');
              setShowAutoTimerAlert(false);
            }
          } else {
            console.log('⚠️ Job has no location coordinates');
          }
        } else {
          console.log('⚠️ No job with AutoTimer or no location');
          setAutoTimerJob(null);
          // Don't reset hasShownAutoTimerAlert here
          if (showAutoTimerAlert) {
            setShowAutoTimerAlert(false);
          }
        }
      } catch (error) {
        console.error('Error checking AutoTimer status:', error);
      }
    };

    // Helper function to calculate distance between two coordinates
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3; // Earth radius in meters
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

    // Check initially
    checkAutoTimerStatus();

    // Check periodically
    const interval = setInterval(checkAutoTimerStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [location, hasShownAutoTimerAlert, showAutoTimerAlert]); // Include dependencies to track state properly

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

            <View style={{overflow: 'hidden', borderRadius: 10}}>

           <Text style={styles.workText}>
            <Text style={{ color: '#007AFF', fontWeight: '700' }}>Vix</Text>
            <Text style={{ color: '#5856D6', fontWeight: '700' }}>Time</Text>


            </Text>
          </View>
        );
      case 'timer':
        return (
          <View style={styles.screenTitle}>
            <IconSymbol size={20} name="clock.fill" color="#34C759" />
            <Text style={[styles.screenTitleText, { color: colors.text }]}>{t('timer.title')}</Text>
          </View>
        );
      case 'reports':
        return (
          <View style={styles.screenTitle}>
            <IconSymbol size={23} name="doc.text.fill" color="#FF9500" />
            <Text style={[styles.screenTitleText, { color: colors.text }]}>{t('reports.title')}</Text>
          </View>
        );
      case 'calendar':
        return (
          <View style={styles.screenTitle}>
            <IconSymbol size={23} name="calendar" color="#6366F1" />
            <Text style={[styles.screenTitleText, { color: colors.text }]}>{t('calendar.title')}</Text>
          </View>
        );
      case 'settings':
        return (
          <View style={styles.screenTitle}>
            <IconSymbol size={23} name="gear" color="#8E8E93" />
            <Text style={[styles.screenTitleText, { color: colors.text }]}>{t('settings.title')}</Text>
          </View>
        );
      case 'subscription':
        return (
          <View style={styles.screenTitle}>
            <IconSymbol size={23} name="crown.fill" color="#FFD700" />
            <Text style={[styles.screenTitleText, { color: colors.text }]}>{t('subscription.title')}</Text>
          </View>
        );
      case 'chatbot':
        return t('chatbot.title') || 'Chatbot IA';
      default:
        return (
          <View style={styles.workTrackTitle}>
            <IconSymbol size={22} name="clock.fill" color="#007AFF" />
            <Text style={styles.workText}>
           <Text style={{ color: '#0056CC' }}>Vix</Text>
              <Text style={{ color: '#007AFF' }}>Time</Text>

            </Text>
          </View>
        );
    }
  };

  // Show initial loading for 2 seconds with fade out
  if (initialLoading) {
    return <SplashLoader isExiting={isExiting} />;
  }

  // Show privacy/location modal as the very first thing
  if (showPrivacyLocationModal === null || showOnboarding === null) {
    return <Loading showMessage={false} />;
  }

  // Show privacy/location modal first before anything else
  if (showPrivacyLocationModal) {
    return (
      <PrivacyLocationModal
        visible={true}
        onClose={() => {
          setShowPrivacyLocationModal(false);
          // After closing without accepting, check onboarding
        }}
        onAccept={() => {
          setShowPrivacyLocationModal(false);
          // After accepting location, check onboarding
        }}
      />
    );
  }

  if (showOnboarding) {
    return (
      <WelcomeModal
        visible={true}
        isOnboarding={true}
        onClose={() => setShowOnboarding(false)}
        onDone={async () => {
          await AsyncStorage.setItem('onboardingSeen', 'true');
          setShowOnboarding(false);
        }}
      />
    );
  }


  // Renderizar siempre con header y menu para mantener consistencia
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {(currentScreen === 'mapa' || currentScreen === 'chatbot' || currentScreen === 'timer' || currentScreen === 'reports' || currentScreen === 'calendar' || currentScreen === 'settings' || currentScreen === 'subscription') && (
        <Header 
          title={getScreenTitle()} 
          onProfilePress={() => navigateTo('settings')}
          isSettingsActive={currentScreen === 'settings'}
          currentScreen={currentScreen}
          onExportPress={currentScreen === 'reports' ? () => {
            // This will be handled by ReportsScreen's export functionality
            if (globalThis.reportsScreenExportHandler) {
              globalThis.reportsScreenExportHandler();
            }
          } : undefined}
          onSyncPress={currentScreen === 'calendar' ? () => {
            // This will be handled by CalendarScreen's sync functionality
            if (globalThis.calendarScreenSyncHandler) {
              globalThis.calendarScreenSyncHandler();
            }
          } : undefined}
          onNotesPress={currentScreen === 'timer' ? () => {
            // This will be handled by TimerScreen's notes functionality
            if (globalThis.timerScreenNotesHandler) {
              globalThis.timerScreenNotesHandler();
            }
          } : undefined}
          onInfoPress={currentScreen === 'mapa' && showInfoButton ? async () => {
            setShowHelpSupport(true);
            // Guardar que el botón fue presionado
            await AsyncStorage.setItem('infoButtonPressed', 'true');
            setShowInfoButton(false);
          } : undefined}
          onBackupPress={currentScreen === 'mapa' && !showInfoButton ? async () => {
            await loadAutoBackupConfig();
            setShowAutoBackupModal(true);
          } : undefined}
        />
      )}
      
      {/* AutoTimer Alert - Shown globally when AutoTimer is active but user is outside work radius */}
      {showAutoTimerAlert && autoTimerJob && (
        <View 
          style={{
            position: 'absolute',
            top: 85, // Below the header
            left: 12,
            right: 12,
            zIndex: 1000,
            backgroundColor: isDark ? 'rgba(255, 149, 0, 0.98)' : 'rgba(255, 149, 0, 0.98)',
            borderRadius: 20,
            padding: 20,
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'space-between',
            shadowColor: '#FF9500',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.4)',
            minHeight: 140,
          }}>
          {/* Decorative background pattern */}
          <View style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }} />
          <View style={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          }} />
          
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 16,
              padding: 12,
              marginRight: 14,
            }}>
              <IconSymbol size={32} name="location.slash.fill" color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 16,
                color: '#FFFFFF',
                fontWeight: '700',
                marginBottom: 4,
                letterSpacing: 0.3,
              }}>
                AutoTimer Activo
              </Text>
              <Text style={{
                fontSize: 13,
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: '500',
                lineHeight: 18,
              }}>
                {t('timer.auto_timer.activation_alert')}
              </Text>
            </View>
          </View>
          
          <View style={{
            flexDirection: 'row',
            gap: 10,
          }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
              onPress={() => {
                setShowAutoTimerAlert(false);
                // Don't re-show - it will only show once per session
              }}
            >
              <Text style={{
                fontSize: 14,
                color: '#FF9500',
                fontWeight: '700',
                letterSpacing: 0.2,
              }}>
                {t('timer.auto_timer.dismiss_notice')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      

      
      <View style={{ flex: 1 }}>
        {renderCurrentScreen()}
      </View>
      <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} />
      {/* SideMenu removed - using BottomNavigation */}
      <BottomNavigation />
      
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
      
      {/* Help Support Modal */}
      <Modal
        visible={showHelpSupport}
        animationType="slide"
        presentationStyle="formSheet"
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
            
            // If enabling auto backup, create a backup immediately
            if (enabled) {
              console.log('🎯 Auto backup enabled, creating initial backup...');
              await AutoBackupService.createAutoBackup();
            }
            
            await loadAutoBackupConfig();
          } catch (error) {
            console.error('Error updating auto backup config:', error);
          }
        }}
        onDownloadBackup={async (backup) => {
          try {
            await AutoBackupService.downloadBackup(backup);
          } catch (error) {
            console.error('Error downloading backup:', error);
          }
        }}
        onRefreshBackups={async () => {
          try {
            await loadAutoBackupConfig();
            // Also create new backup if auto backup is enabled
            if (autoBackupEnabled) {
              await AutoBackupService.createBackupNow();
              await loadAutoBackupConfig(); // Reload to show the new backup
            }
          } catch (error) {
            console.error('Error refreshing backups:', error);
          }
        }}
        onDeleteBackup={async (backup) => {
          try {
            await AutoBackupService.deleteBackup(backup);
            await loadAutoBackupConfig(); // Reload to update the list
          } catch (error) {
            console.error('Error deleting backup:', error);
          }
        }}
      />
    </SafeAreaView>
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
    backgroundColor: 'transparent',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workTrackTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -6,
    gap: 0,
    flex: 1,
  },
  titleIcon: {
    marginRight: 4,
  },
  headerLogo: {
    width: 80,
    height: 30,

    borderRadius: 10,
  },
  workText: {
    fontSize: 23,
    fontWeight: '500',
    letterSpacing: -0.3,
  
  },
  trackText: {
    fontSize: 23,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  screenTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitleText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
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