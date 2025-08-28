import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
  Share,
  Clipboard,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import * as Location from 'expo-location';

export default function DebugScreen({ onBack }: { onBack?: () => void }) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [logs, setLogs] = useState<any[]>([]);
  const [geofenceState, setGeofenceState] = useState<any>(null);
  const [backgroundActive, setBackgroundActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoTimerMode, setAutoTimerMode] = useState<any>(null);

  const loadDebugInfo = async () => {
    try {
      // Cargar logs de ubicación
      const locationLogs = await AsyncStorage.getItem('@location_debug_log');
      if (locationLogs) {
        setLogs(JSON.parse(locationLogs));
      }

      // Cargar estado de geofence
      const state = await AsyncStorage.getItem('@background_location_state');
      if (state) {
        setGeofenceState(JSON.parse(state));
      }

      // Verificar si background está activo
      const bgActive = await AsyncStorage.getItem('@background_geofencing_active');
      if (bgActive) {
        setBackgroundActive(JSON.parse(bgActive).active);
      }

      // Cargar modo AutoTimer
      const mode = await AsyncStorage.getItem('@autotimer_mode_settings');
      if (mode) {
        setAutoTimerMode(JSON.parse(mode));
      }

      // Obtener ubicación actual
      let currentLoc = null;
      try {
        currentLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        setCurrentLocation({
          lat: currentLoc.coords.latitude.toFixed(6),
          lng: currentLoc.coords.longitude.toFixed(6),
          accuracy: currentLoc.coords.accuracy?.toFixed(1)
        });
      } catch (e) {
        console.log('No se pudo obtener ubicación');
      }

      // Obtener trabajos
      const jobs = await AsyncStorage.getItem('jobs');
      if (jobs) {
        const jobsArray = JSON.parse(jobs);
        const activeJobs = jobsArray.filter((j: any) => j.autoTimer?.enabled);
        
        // Calcular distancias a cada trabajo
        if (currentLoc && activeJobs.length > 0) {
          const distances = activeJobs.map((job: any) => {
            if (!job.location) return null;
            const dist = calculateDistance(
              currentLoc.coords.latitude,
              currentLoc.coords.longitude,
              job.location.latitude,
              job.location.longitude
            );
            return {
              name: job.name,
              distance: Math.round(dist),
              radius: job.autoTimer?.geofenceRadius || 100,
              inside: dist <= (job.autoTimer?.geofenceRadius || 100)
            };
          }).filter(Boolean);
          
          setCurrentLocation((prev: any) => ({
            ...prev,
            jobDistances: distances
          }));
        }
      }
    } catch (error) {
      console.error('Error loading debug info:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const clearLogs = async () => {
    Alert.alert(
      t('debug.clear_logs'),
      t('debug.clear_logs_confirmation'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('debug.clear'),
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('@location_debug_log');
            await AsyncStorage.removeItem('@background_location_state');
            setLogs([]);
            setGeofenceState(null);
            Alert.alert(t('debug.logs_cleared'));
          }
        }
      ]
    );
  };

  const shareLogs = async () => {
    try {
      // Crear reporte completo
      const now = new Date();
      const report = `=== AUTOTIMER DEBUG REPORT ===
Fecha: ${now.toLocaleString('es-ES')}
App: VixTime v1.0

=== ESTADO ACTUAL ===
Modo AutoTimer: ${autoTimerMode?.mode || 'No configurado'}
Background Tracking: ${backgroundActive ? 'Activo' : 'Inactivo'}
Ubicación actual: ${currentLocation ? `${currentLocation.lat}, ${currentLocation.lng}` : 'No disponible'}
Precisión GPS: ${currentLocation?.accuracy ? `${currentLocation.accuracy}m` : 'N/A'}

${currentLocation?.jobDistances ? `=== DISTANCIAS A TRABAJOS ===
${currentLocation.jobDistances.map((job: any) => 
  `${job.name}: ${job.distance}m / ${job.radius}m ${job.inside ? '✅ DENTRO' : '❌ FUERA'}`
).join('\n')}` : ''}

${geofenceState && Object.keys(geofenceState.insideByJobId || {}).length > 0 ? `
=== ESTADOS GEOFENCE ===
${Object.entries(geofenceState.insideByJobId || {}).map(([jobId, inside]) => 
  `Job ${jobId}: ${inside ? 'DENTRO 🟢' : 'FUERA 🔴'}`
).join('\n')}` : ''}

=== LOGS DE EVENTOS (${logs.length}) ===
${logs.map((log, i) => {
  const time = formatTime(log.timestamp);
  let details = `[${time}] ${log.type}`;
  if (log.jobName) details += ` - ${log.jobName}`;
  if (log.distance !== undefined) details += ` - Distancia: ${log.distance}m (Radio: ${log.radius}m)`;
  if (log.error) details += ` - ERROR: ${log.error}`;
  return details;
}).join('\n')}

=== FIN DEL REPORTE ===`;

      // Mostrar opciones para compartir
      Alert.alert(
        t('debug.share_logs'),
        t('debug.share_method_question'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('debug.copy_to_clipboard'),
            onPress: async () => {
              Clipboard.setString(report);
              Alert.alert(t('debug.copied'), t('debug.copied_message'));
            }
          },
          {
            text: t('debug.send_by_email'),
            onPress: async () => {
              try {
                const subject = encodeURIComponent('AutoTimer Debug Report - VixTime');
                const body = encodeURIComponent(report);
                const mailUrl = `mailto:report@vixtime.com?subject=${subject}&body=${body}`;
                
                const supported = await Linking.canOpenURL(mailUrl);
                if (supported) {
                  await Linking.openURL(mailUrl);
                } else {
                  Alert.alert(t('common.error'), t('debug.email_client_error'));
                }
              } catch (error) {
                Alert.alert(t('common.error'), t('debug.email_open_error'));
              }
            }
          },
          {
            text: t('debug.share'),
            onPress: async () => {
              try {
                await Share.share({
                  message: report,
                  title: 'AutoTimer Debug Report'
                });
              } catch (error) {
                Alert.alert(t('common.error'), t('debug.share_error'));
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('debug.report_generation_error'));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDebugInfo();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDebugInfo();
    // Auto-refresh cada 5 segundos
    const interval = setInterval(loadDebugInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ENTER': return '🟢';
      case 'EXIT': return '🔴';
      case 'ERROR': return '❌';
      default: return '📍';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    backButton: {
      padding: 8,
    },
    shareButton: {
      padding: 8,
      marginRight: 5,
    },
    clearButton: {
      padding: 8,
    },
    statusSection: {
      backgroundColor: isDark ? '#1c1c1e' : '#f2f2f7',
      margin: 15,
      padding: 15,
      borderRadius: 12,
    },
    statusTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 10,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 5,
    },
    statusLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    statusValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    activeIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginLeft: 5,
    },
    distanceItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 3,
      marginLeft: 10,
    },
    logSection: {
      flex: 1,
      paddingHorizontal: 15,
    },
    logTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 10,
      marginTop: 10,
    },
    logItem: {
      backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
      padding: 12,
      marginVertical: 4,
      borderRadius: 8,
      borderLeftWidth: 3,
    },
    logHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 5,
    },
    logType: {
      fontSize: 14,
      fontWeight: '600',
    },
    logTime: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    logDetails: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: 50,
      fontSize: 14,
    },
    refreshHint: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 10,
      fontStyle: 'italic',
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('debug.title')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={shareLogs} style={styles.shareButton}>
            <IconSymbol name="square.and.arrow.up" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
            <IconSymbol name="trash" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Estado actual */}
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>{t('debug.current_status')}</Text>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{t('debug.autotimer_mode')}:</Text>
            <Text style={styles.statusValue}>{autoTimerMode?.mode || t('debug.not_configured')}</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{t('debug.background_tracking')}:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.statusValue}>{backgroundActive ? t('debug.active') : t('debug.inactive')}</Text>
              <View style={[
                styles.activeIndicator,
                { backgroundColor: backgroundActive ? '#34c759' : '#ff3b30' }
              ]} />
            </View>
          </View>

          {/* Información de debugging */}
          <View style={[styles.statusRow, { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.separator }]}>
            <Text style={[styles.statusLabel, { fontSize: 12, fontStyle: 'italic' }]}>
              💡 {t('debug.logs_appear_when')}:
            </Text>
          </View>
          <Text style={[styles.statusLabel, { fontSize: 11, marginLeft: 10, marginTop: 2 }]}>
            • {t('debug.autotimer_enabled')}
          </Text>
          <Text style={[styles.statusLabel, { fontSize: 11, marginLeft: 10 }]}>
            • {t('debug.background_tracking_active')}
          </Text>
          <Text style={[styles.statusLabel, { fontSize: 11, marginLeft: 10 }]}>
            • {t('debug.entering_exiting_circle')}
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              padding: 8,
              borderRadius: 6,
              marginTop: 10,
              alignItems: 'center'
            }}
            onPress={async () => {
              // Generar logs de prueba
              const testLogs = [
                {
                  timestamp: new Date().toISOString(),
                  type: 'ENTER',
                  jobId: 'test-job',
                  jobName: 'Trabajo de Prueba',
                  distance: 45,
                  radius: 100
                },
                {
                  timestamp: new Date(Date.now() - 30000).toISOString(),
                  type: 'EXIT',
                  jobId: 'test-job',
                  jobName: 'Trabajo de Prueba',
                  distance: 150,
                  radius: 100
                }
              ];
              
              await AsyncStorage.setItem('@location_debug_log', JSON.stringify(testLogs));
              await loadDebugInfo();
              Alert.alert(t('debug.test_logs_generated'), t('debug.test_logs_message'));
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
              🧪 {t('debug.generate_test_logs')}
            </Text>
          </TouchableOpacity>


          {currentLocation && (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{t('debug.location')}:</Text>
                <Text style={styles.statusValue}>{currentLocation.lat}, {currentLocation.lng}</Text>
              </View>
              {currentLocation.accuracy && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>{t('debug.accuracy')}:</Text>
                  <Text style={styles.statusValue}>{currentLocation.accuracy}m</Text>
                </View>
              )}
            </>
          )}

          {currentLocation?.jobDistances && (
            <>
              <Text style={[styles.statusLabel, { marginTop: 10 }]}>{t('debug.job_distances')}:</Text>
              {currentLocation.jobDistances.map((job: any, idx: number) => (
                <View key={idx} style={styles.distanceItem}>
                  <Text style={styles.statusLabel}>{job.name}:</Text>
                  <Text style={[
                    styles.statusValue,
                    { color: job.inside ? '#34c759' : colors.text }
                  ]}>
                    {job.distance}m / {job.radius}m {job.inside ? '✅' : ''}
                  </Text>
                </View>
              ))}
            </>
          )}

          {geofenceState && (
            <>
              <Text style={[styles.statusLabel, { marginTop: 10 }]}>{t('debug.geofence_states')}:</Text>
              {Object.entries(geofenceState.insideByJobId || {}).map(([jobId, inside]) => (
                <View key={jobId} style={styles.distanceItem}>
                  <Text style={styles.statusLabel}>Job {jobId}:</Text>
                  <Text style={styles.statusValue}>{inside ? t('debug.inside') + ' 🟢' : t('debug.outside') + ' 🔴'}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Logs */}
        <View style={styles.logSection}>
          <Text style={styles.logTitle}>{t('debug.recent_events')} ({logs.length})</Text>
          
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <View
                key={index}
                style={[
                  styles.logItem,
                  {
                    borderLeftColor:
                      log.type === 'ENTER' ? '#34c759' :
                      log.type === 'EXIT' ? '#ff3b30' :
                      log.type === 'ERROR' ? '#ff9500' : colors.primary
                  }
                ]}
              >
                <View style={styles.logHeader}>
                  <Text style={[styles.logType, { color: colors.text }]}>
                    {getEventIcon(log.type)} {log.type}
                  </Text>
                  <Text style={styles.logTime}>{formatTime(log.timestamp)}</Text>
                </View>
                {log.jobName && (
                  <Text style={styles.logDetails}>{t('debug.job')}: {log.jobName}</Text>
                )}
                {log.distance !== undefined && (
                  <Text style={styles.logDetails}>
                    {t('debug.distance')}: {log.distance}m ({t('debug.radius')}: {log.radius}m)
                  </Text>
                )}
                {log.error && (
                  <Text style={[styles.logDetails, { color: colors.error }]}>{log.error}</Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('debug.no_events')}</Text>
          )}
          
          <Text style={styles.refreshHint}>{t('debug.pull_to_refresh')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}