import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JobService } from './JobService';

const BACKGROUND_LOCATION_TASK = 'background-location-tracking';
const DEBOUNCE_MS = 5000; // Evita rebotes (5 segundos)

// Estado persistente para tracking
interface LocationState {
  insideByJobId: Record<string, boolean>;
  lastEventTimeByJobId: Record<string, number>;
}

async function getLocationState(): Promise<LocationState> {
  try {
    const raw = await AsyncStorage.getItem('@background_location_state');
    return raw ? JSON.parse(raw) : { insideByJobId: {}, lastEventTimeByJobId: {} };
  } catch {
    return { insideByJobId: {}, lastEventTimeByJobId: {} };
  }
}

async function setLocationState(state: LocationState) {
  await AsyncStorage.setItem('@background_location_state', JSON.stringify(state));
}

async function logLocationEvent(event: any) {
  try {
    const logs = await AsyncStorage.getItem('@location_debug_log') || '[]';
    const logArray = JSON.parse(logs);
    logArray.unshift({ 
      timestamp: new Date().toISOString(), 
      ...event 
    });
    // Mantener solo los últimos 100 eventos
    await AsyncStorage.setItem('@location_debug_log', JSON.stringify(logArray.slice(0, 100)));
  } catch (e) {
    console.error('Error logging event:', e);
  }
}

// Definir la tarea de tracking en background
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('❌ Error en background location task:', error);
    await logLocationEvent({ type: 'ERROR', error: String(error) });
    return;
  }

  if ('locations' in data) {
    const { locations } = data as any;
    const location = locations[0];
    
    if (location) {
      console.log('📍 Background location update:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        timestamp: new Date(location.timestamp).toLocaleTimeString()
      });
      
      // Procesar la ubicación para verificar geofences
      await processLocationForGeofencing(location);
    }
  }
});

async function processLocationForGeofencing(location: any) {
  try {
    // Obtener trabajos del storage
    const jobsData = await AsyncStorage.getItem('jobs');
    if (!jobsData) return;
    
    const jobs = JSON.parse(jobsData);
    const activeJobs = jobs.filter((j: any) => j.autoTimer?.enabled);
    
    if (activeJobs.length === 0) return;
    
    // Obtener estado persistente
    const state = await getLocationState();
    const now = Date.now();
    
    for (const job of activeJobs) {
      if (!job.location?.latitude || !job.location?.longitude) continue;
      
      const distance = calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        job.location.latitude,
        job.location.longitude
      );
      
      const radius = job.autoTimer?.geofenceRadius || 100;
      const isInside = distance <= radius;
      const wasInside = state.insideByJobId[job.id] || false;
      
      // DEBOUNCE: Evitar cambios muy rápidos (rebotes en el borde)
      const lastEventTime = state.lastEventTimeByJobId[job.id] || 0;
      if (now - lastEventTime < DEBOUNCE_MS) {
        console.log(`⏳ Debounce activo para ${job.name} (${Math.round((DEBOUNCE_MS - (now - lastEventTime))/1000)}s restantes)`);
        continue;
      }
      
      // Detectar cambios de estado
      if (isInside && !wasInside) {
        console.log(`🟢 ENTERING geofence for ${job.name} (distancia: ${Math.round(distance)}m, radio: ${radius}m)`);
        state.insideByJobId[job.id] = true;
        state.lastEventTimeByJobId[job.id] = now;
        await handleGeofenceEnter(job);
        await logLocationEvent({ 
          type: 'ENTER', 
          jobId: job.id, 
          jobName: job.name, 
          distance: Math.round(distance), 
          radius 
        });
      } else if (!isInside && wasInside) {
        console.log(`🔴 EXITING geofence for ${job.name} (distancia: ${Math.round(distance)}m, radio: ${radius}m)`);
        state.insideByJobId[job.id] = false;
        state.lastEventTimeByJobId[job.id] = now;
        await handleGeofenceExit(job);
        await logLocationEvent({ 
          type: 'EXIT', 
          jobId: job.id, 
          jobName: job.name, 
          distance: Math.round(distance), 
          radius 
        });
      }
    }
    
    // Guardar estado actualizado
    await setLocationState(state);
  } catch (error) {
    console.error('❌ Error processing location for geofencing:', error);
    await logLocationEvent({ type: 'PROCESSING_ERROR', error: String(error) });
  }
}

async function handleGeofenceEnter(job: any) {
  try {
    // Verificar si ya hay una sesión activa
    const activeSession = await JobService.getActiveSession();
    if (activeSession && activeSession.jobId === job.id) {
      console.log(`⚡ Ya hay una sesión activa para ${job.name}`);
      return;
    }
    
    const delayMinutes = job.autoTimer?.delayStart || 0;
    
    if (delayMinutes > 0) {
      // Programar inicio con delay
      const pendingStart = {
        timestamp: new Date().toISOString(),
        delayMinutes,
        targetTime: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()
      };
      await AsyncStorage.setItem(`@auto_timer_pending_start_${job.id}`, JSON.stringify(pendingStart));
      console.log(`⏱️ Timer programado para iniciar en ${delayMinutes} minutos`);
    } else {
      // Iniciar inmediatamente
      const sessionForStorage = {
        jobId: job.id,
        startTime: new Date().toISOString(),
        notes: 'Auto-started (Background)',
      };
      await JobService.saveActiveSession(sessionForStorage);
      console.log(`✅ Sesión iniciada para ${job.name}`);
    }
  } catch (error) {
    console.error('❌ Error handling geofence enter:', error);
  }
}

async function handleGeofenceExit(job: any) {
  try {
    const activeSession = await JobService.getActiveSession();
    if (!activeSession || activeSession.jobId !== job.id) {
      console.log(`⚠️ No hay sesión activa para ${job.name}`);
      return;
    }
    
    const delayMinutes = job.autoTimer?.delayStop || 0;
    
    if (delayMinutes > 0) {
      // Programar parada con delay
      const pendingStop = {
        timestamp: new Date().toISOString(),
        delayMinutes,
        targetTime: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()
      };
      await AsyncStorage.setItem(`@auto_timer_pending_stop_${job.id}`, JSON.stringify(pendingStop));
      console.log(`⏱️ Timer programado para detenerse en ${delayMinutes} minutos`);
    } else {
      // Detener inmediatamente
      const sessionStart = new Date(activeSession.startTime);
      const now = new Date();
      const elapsedMs = now.getTime() - sessionStart.getTime();
      const elapsedHours = Math.max(0.01, parseFloat(((elapsedMs / (1000 * 60 * 60))).toFixed(2)));
      
      const today = new Date().toISOString().split('T')[0];
      const workDay = {
        date: today,
        jobId: activeSession.jobId,
        hours: elapsedHours,
        notes: 'Auto-stopped',
        type: 'work' as const,
        actualStartTime: sessionStart.toTimeString().substring(0, 5),
        actualEndTime: now.toTimeString().substring(0, 5),
      };
      
      await JobService.addWorkDay(workDay);
      await JobService.clearActiveSession();
      console.log(`✅ Sesión detenida para ${job.name}: ${elapsedHours}h`);
    }
  } catch (error) {
    console.error('❌ Error handling geofence exit:', error);
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

/**
 * Iniciar tracking de ubicación en background
 */
export async function startBackgroundLocationTracking(jobs: any[]): Promise<boolean> {
  try {
    console.log('🚀 Iniciando background location tracking (alternativa a geofencing)...');
    
    // Verificar permisos
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('❌ Permisos de ubicación no otorgados');
      return false;
    }
    
    // Filtrar trabajos válidos
    const validJobs = jobs.filter(job => 
      job.autoTimer?.enabled && 
      job.location?.latitude && 
      job.location?.longitude
    );
    
    if (validJobs.length === 0) {
      console.log('⚠️ No hay trabajos válidos para tracking');
      return false;
    }
    
    // Calcular el radio más pequeño para optimizar el intervalo
    const radii = validJobs.map(job => job.autoTimer?.geofenceRadius || 100);
    const smallestRadius = Math.min(...radii);
    
    // Configurar tracking basado en el radio más pequeño
    const distanceInterval = smallestRadius <= 50 ? 10 : 20;
    
    // Detener tracking previo si existe
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch (e) {
      // Ignorar si no había tracking previo
    }
    
    // Iniciar tracking con opciones de background
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5000, // Actualizar cada 5 segundos
      distanceInterval: distanceInterval, // Actualizar según distancia
      pausesUpdatesAutomatically: false, // No pausar automáticamente
      activityType: Location.ActivityType.AutomotiveNavigation, // Optimizado para movimiento
      showsBackgroundLocationIndicator: true, // Mostrar indicador en iOS
      foregroundService: {
        notificationTitle: "VixTime",
        notificationBody: "AutoTimer está monitoreando tu ubicación",
        notificationColor: "#007AFF"
      },
      deferredUpdatesInterval: 5000,
      deferredUpdatesDistance: distanceInterval,
    });
    
    console.log('✅ Background location tracking iniciado');
    console.log(`📍 Monitoreando ${validJobs.length} trabajo(s) con intervalo de ${distanceInterval}m`);
    
    return true;
  } catch (error) {
    console.error('❌ Error iniciando background location tracking:', error);
    return false;
  }
}

/**
 * Detener tracking de ubicación en background
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('🛑 Background location tracking detenido');
    }
  } catch (error) {
    console.error('❌ Error deteniendo background location tracking:', error);
  }
}

export default {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking
};