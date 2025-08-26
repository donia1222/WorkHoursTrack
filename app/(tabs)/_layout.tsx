import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Stack, useNavigation as useExpoNavigation } from 'expo-router';
import { SubscriptionProvider } from '@/app/hooks/useSubscription';
import { IconSymbol } from '@/components/ui/IconSymbol';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { JobService } from '../services/JobService';
import * as Location from 'expo-location';
import AutoTimerBanner from '../components/AutoTimerBanner';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { NavigationProvider, useNavigation } from '../context/NavigationContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useSubscription } from '../hooks/useSubscription';
import { AutoBackupService } from '../services/AutoBackupService';

// globals para las funciones de los botones
declare global {
  var reportsScreenExportHandler: (() => void) | undefined;
  var reportsScreenFocusHandler: (() => void) | undefined;
  var calendarScreenSyncHandler: (() => void) | undefined;
  var timerScreenNotesHandler: (() => void) | undefined;
  var chatbotScreenHistoryHandler: (() => void) | undefined;
  var showFeaturesModalHandler: (() => void) | undefined;
  var showHelpSupportHandler: (() => void) | undefined;
  var showAutoBackupHandler: (() => void) | undefined;
}

function LayoutContent() {
  const [showBanner, setShowBanner] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);
  const [showInfoButton, setShowInfoButton] = useState(true);
  const [showAutoBackupModal, setShowAutoBackupModal] = useState(false);
  
  const { t } = useLanguage?.() ?? { t: (k: string) => k };
  const { colors, isDark } = useTheme?.() ?? { colors: {}, isDark: false };
  const { currentScreen, navigateTo } = useNavigation();
  const [headerTitle, setHeaderTitle] = useState('VixTime');
  const { triggerHaptic } = useHapticFeedback();
  const { isSubscribed } = useSubscription();
  const navigation = useExpoNavigation();


  // Cargar estado del botón info
  useEffect(() => {
    const loadInfoButtonState = async () => {
      const infoPressed = await AsyncStorage.getItem('headerInfoPressed');
      setShowInfoButton(infoPressed !== 'true');
    };
    loadInfoButtonState();
  }, []);

  // Auto-timer check logic
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3;
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;
      const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const checkAutoTimerStatus = async () => {
      try {
        const jobs = await JobService.getJobs();
        const jobWithAutoTimer = jobs.find((j) => j.autoTimer?.enabled);
        if (!jobWithAutoTimer) {
          setShowBanner(false);
          return;
        }

        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          setShowBanner(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        const user = loc.coords;

        if (jobWithAutoTimer.location?.latitude && jobWithAutoTimer.location?.longitude) {
          const distance = calculateDistance(
            user.latitude,
            user.longitude,
            jobWithAutoTimer.location.latitude,
            jobWithAutoTimer.location.longitude
          );
          const radius = jobWithAutoTimer.autoTimer?.geofenceRadius || 50;
          const isInside = distance <= radius;

          if (!isInside && jobWithAutoTimer.autoTimer?.enabled && !hasShownThisSession) {
            setShowBanner(true);
            setHasShownThisSession(true);
          } else if (isInside && showBanner) {
            setShowBanner(false);
          }
        } else {
          setShowBanner(false);
        }
      } catch {
        // silencioso
      }
    };

    checkAutoTimerStatus();
    interval = setInterval(checkAutoTimerStatus, 5000);
    return () => interval && clearInterval(interval);
  }, [showBanner, hasShownThisSession]);

  const loadAutoBackupConfig = useCallback(async () => {
    // Función para cargar config de backup si es necesario
  }, []);


  return (
    <View style={styles.container}>
        <Stack screenOptions={{ 
          headerShown: true,
          headerStyle: { 
            backgroundColor: isDark ? 'rgba(0, 0, 0, 1)' : 'hsla(239, 98%, 80%, 0.05)',
          },
          headerTintColor: colors.text || '#000000ff',
          headerTitleStyle: { fontWeight: '700', fontSize: 20 },
          headerBlurEffect: isDark ? 'dark' : 'light',
      
        }}>
          <Stack.Screen 
            name="index" 
            options={{
              headerTitle: () => {
                const title = currentScreen === 'timer' ? (t('timer.title') || 'Timer') :
                             currentScreen === 'reports' ? (t('reports.title') || 'Reportes') :
                             currentScreen === 'calendar' ? (t('calendar.title') || 'Calendario') :
                             currentScreen === 'settings' ? (t('settings.title') || 'Configuración') :
                             currentScreen === 'subscription' ? (t('subscription.title') || 'Premium') :
                             currentScreen === 'chatbot' ? (t('chatbot.title') || 'Chatbot IA') :
                             'VixTime';
                
                if (currentScreen === 'mapa') {
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-start' }}>
                    
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                        <Text style={{ fontSize: 22, fontWeight: '700', color: '#007AFF' }}>Vix</Text>
                        <Text style={{ fontSize: 22, fontWeight: '700', color: '#5856D6' }}>Time</Text>
                      </View>
                    </View>
                  );
                } else {
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-start' }}>
                      {currentScreen === 'timer' && <IconSymbol size={23} name="clock.fill" color="#34C759" />}
                      {currentScreen === 'reports' && <IconSymbol size={23} name="doc.text.fill" color="#FF9500" />}
                      {currentScreen === 'calendar' && <IconSymbol size={23} name="calendar" color="#6366F1" />}
                      {currentScreen === 'settings' && <IconSymbol size={23} name="gear" color="#8E8E93" />}
                      {currentScreen === 'subscription' && <IconSymbol size={23} name="crown.fill" color="#FFD700" />}
                      <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text || '#000000', marginLeft: 8 }}>{title}</Text>
                    </View>
                  );
                }
              },
              headerRight: () => {
                if (currentScreen === 'timer') {
                  return (
                    <TouchableOpacity onPress={() => { triggerHaptic('light'); globalThis.timerScreenNotesHandler?.(); }} style={styles.headerButton}>
                      <View style={[styles.headerButtonInner, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)' }]}>
                        <IconSymbol size={18} name="pencil" color="#34C759" />
                      </View>
                    </TouchableOpacity>
                  );
                } else if (currentScreen === 'reports') {
                  return (
                    <TouchableOpacity onPress={() => { triggerHaptic('light'); globalThis.reportsScreenExportHandler?.(); }} style={styles.headerButton}>
                      <View style={[styles.headerButtonInner, { backgroundColor: isDark ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.1)' }]}>
                        <IconSymbol size={18} name="square.and.arrow.up" color="#FF9500" />
                      </View>
                    </TouchableOpacity>
                  );
                } else if (currentScreen === 'calendar') {
                  return (
                    <TouchableOpacity onPress={() => { triggerHaptic('light'); globalThis.calendarScreenSyncHandler?.(); }} style={styles.headerButton}>
                      <View style={[styles.headerButtonInner, { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(167, 139, 250, 0.1)' }]}>
                        <IconSymbol size={20} name="calendar.badge.plus" color="#A78BFA" />
                      </View>
                    </TouchableOpacity>
                  );
                } else if (currentScreen === 'chatbot') {
                  return (
                    <TouchableOpacity onPress={() => { triggerHaptic('light'); globalThis.chatbotScreenHistoryHandler?.(); }} style={styles.headerButton}>
                      <View style={[styles.headerButtonInner, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)' }]}>
                        <IconSymbol size={18} name="clock.arrow.circlepath" color="#007AFF" />
                      </View>
                    </TouchableOpacity>
                  );
                } else if (currentScreen === 'settings' && !isSubscribed) {
                  return (
                    <TouchableOpacity onPress={() => { triggerHaptic('light'); navigateTo('subscription'); }} style={styles.headerButton}>
                      <View style={[styles.headerButtonInner, styles.subscriptionButton]}>
                        <IconSymbol size={18} name="crown.fill" color="#2f2f2fff" />
                      </View>
                    </TouchableOpacity>
                  );
                } else if (currentScreen === 'mapa') {
                  return (
                    <TouchableOpacity 
                      onPress={async () => { 
                        triggerHaptic('light'); 
                        if (showInfoButton) {
                          globalThis.showHelpSupportHandler?.();
                          await AsyncStorage.setItem('headerInfoPressed', 'true');
                          setShowInfoButton(false);
                        } else {
                          globalThis.showAutoBackupHandler?.();
                        }
                      }} 
                      style={styles.headerButton}
                    >
                      <View style={[styles.headerButtonInner, { backgroundColor: isDark ? 'rgba(142, 142, 147, 0.15)' : 'rgba(142, 142, 147, 0.1)' }]}>
                        <IconSymbol 
                          size={20} 
                          name={showInfoButton ? "info.circle.fill" : "arrow.counterclockwise.circle.fill"} 
                          color="#8E8E93" 
                        />
                      </View>
                    </TouchableOpacity>
                  );
                }
                return null;
              }
            }}
          />
        </Stack>

        {showBanner && (
          <AutoTimerBanner
            message={t('timer.auto_timer.activation_alert')}
            onDismiss={() => setShowBanner(false)}
          />
        )}
      </View>
  );
}

export default function RootLayout() {
  return (
    <SubscriptionProvider>
      <NavigationProvider>
        <LayoutContent />
      </NavigationProvider>
    </SubscriptionProvider>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  headerIcon: {
    marginLeft: 16,
    marginRight: 4,
  },
  headerButton: {
    marginRight: 1,
    padding: 4,
  },
  headerButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  subscriptionButton: {
    backgroundColor: '#FFD700',
    borderColor: '#FFC107',
  },
});