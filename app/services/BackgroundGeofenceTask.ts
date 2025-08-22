import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JobService } from './JobService';

// Nombre único de la tarea de geofencing en segundo plano
export const BACKGROUND_GEOFENCE_TASK = 'background-geofence-task';

// Interfaz para los datos del evento de geofencing
interface BackgroundGeofenceData {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

// Interfaz para la configuración de trabajos
interface BackgroundJob {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  autoTimerEnabled: boolean;
}

/**
 * Definir la tarea de geofencing que se ejecuta en segundo plano
 * Esta tarea se activa cuando iOS/Android detecta entrada/salida de geocerca
 */
TaskManager.defineTask(BACKGROUND_GEOFENCE_TASK, async ({ data, error }) => {
  console.log('🎯 BACKGROUND GEOFENCE TASK EJECUTADA');
  console.log('📱 Task ejecutada a las:', new Date().toLocaleTimeString());
  
  // Log immediate para debugging
  await AsyncStorage.setItem('@last_geofence_event', JSON.stringify({
    timestamp: new Date().toISOString(),
    data: data,
    error: error
  }));
  
  if (error) {
    console.error('❌ Error en background geofence task:', error);
    return;
  }

  if (!data) {
    console.error('❌ No hay datos en background geofence task');
    return;
  }

  const geofenceData = data as BackgroundGeofenceData;
  
  if (!geofenceData.eventType || !geofenceData.region) {
    console.error('❌ Datos inválidos en background geofence task:', geofenceData);
    return;
  }

  const { eventType, region } = geofenceData;
  const now = new Date();
  const timestamp = now.toISOString();
  
  const eventTypeString = eventType === Location.GeofencingEventType.Enter ? 'ENTER' : 'EXIT';
  console.log(`🎯 BACKGROUND GEOFENCE ${eventTypeString} detectado en background`);
  console.log(`📍 Región: ${region.identifier} a las ${now.toLocaleTimeString()}`);
  console.log(`🔍 Event details:`, { eventType, region });
  
  // NO enviar notificación de debug - solo logs

  try {
    // PRIMERO: Procesar acciones pendientes de CUALQUIER trabajo
    await processPendingActions();
    // Obtener la configuración de trabajos guardada
    const jobsData = await AsyncStorage.getItem('jobs');
    if (!jobsData) {
      console.log('⚠️ No hay trabajos configurados en storage');
      return;
    }

    const jobs = JSON.parse(jobsData);
    const job = jobs.find((j: any) => j.id === region.identifier);
    
    if (!job) {
      console.log(`⚠️ Trabajo no encontrado para región ${region.identifier}`);
      return;
    }

    if (!job.autoTimer?.enabled) {
      console.log(`⚠️ AutoTimer no habilitado para trabajo ${job.name}`);
      return;
    }

    console.log(`🎯 Procesando evento para trabajo: ${job.name}`);

    if (eventType === Location.GeofencingEventType.Enter) {
      await handleBackgroundEnter(job, timestamp);
    } else if (eventType === Location.GeofencingEventType.Exit) {
      await handleBackgroundExit(job, timestamp);
    }

  } catch (error) {
    console.error('❌ Error procesando evento de geofencing:', error);
  }
});

/**
 * Manejar entrada a geocerca desde segundo plano
 */
async function handleBackgroundEnter(job: any, timestamp: string): Promise<void> {
  console.log(`🚀 ENTRANDO al área de trabajo: ${job.name}`);
  
  try {
    // Verificar si ya hay una sesión activa
    const activeSession = await JobService.getActiveSession();
    if (activeSession && activeSession.jobId === job.id) {
      console.log(`⚡ Ya hay una sesión activa para ${job.name}, continuando`);
      // NO RETURN - La sesión debe continuar activa
      return; // Solo salimos si ya está activa para este trabajo
    }

    // Verificar delay configurado - usar mismos nombres que SimpleAutoTimer
    const delayMinutes = Number(
      job.autoTimer?.startDelayMinutes ?? job.autoTimer?.startDelay ?? job.autoTimer?.delayStart ?? 0
    );
    
    if (delayMinutes > 0) {
      // Guardar tiempo de entrada y delay para procesar después
      const pendingStart = {
        timestamp,
        delayMinutes,
        targetTime: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()
      };
      await AsyncStorage.setItem(`@auto_timer_pending_start_${job.id}`, JSON.stringify(pendingStart));
      
      // NO notificar cuando se programa - solo cuando realmente inicie
      console.log(`⏱️ Timer programado para iniciar en ${delayMinutes} minutos`);
      
      // NO usar setTimeout - el timer se iniciará cuando la app vuelva a foreground
      // o cuando se procese el siguiente evento de geofencing
    } else {
      // Iniciar inmediatamente si no hay delay
      console.log(`🔴 INICIANDO TIMER INMEDIATAMENTE para ${job.name}`);
      
      const sessionForStorage = {
        jobId: job.id,
        startTime: timestamp,
        notes: 'Auto-started (Background)',
      };

      await JobService.saveActiveSession(sessionForStorage);
      console.log(`✅ Sesión guardada en storage para ${job.name}`);

      // Enviar UNA sola notificación cuando realmente inicia
      await sendBackgroundNotificationForced(
        '✅ Timer Started',
        `Automatic timer started at ${job.name}`,
        { jobId: job.id, action: 'started' }
      );
      
      console.log(`🔔 Notificación de inicio enviada para ${job.name}`);
    }

    // Guardar evento en historial
    await saveBackgroundEvent('enter', job, timestamp);

  } catch (error) {
    console.error('❌ Error manejando entrada en background:', error);
  }
}

/**
 * Manejar salida de geocerca desde segundo plano
 */
async function handleBackgroundExit(job: any, timestamp: string): Promise<void> {
  console.log(`🛑 SALIENDO del área de trabajo: ${job.name}`);
  
  try {
    // Verificar si hay sesión activa para este trabajo
    const activeSession = await JobService.getActiveSession();
    if (!activeSession) {
      console.log(`⚠️ No hay sesión activa al salir de ${job.name}`);
      return;
    }

    if (activeSession.jobId !== job.id) {
      console.log(`⚠️ Sesión activa es para otro trabajo, ignorando salida de ${job.name}`);
      return;
    }

    // Verificar delay configurado - usar mismos nombres que SimpleAutoTimer
    const delayMinutes = Number(
      job.autoTimer?.stopDelayMinutes ?? job.autoTimer?.stopDelay ?? job.autoTimer?.delayStop ?? 0
    );
    
    if (delayMinutes > 0) {
      // Guardar tiempo de salida y delay para procesar después
      const pendingStop = {
        timestamp,
        delayMinutes,
        targetTime: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()
      };
      await AsyncStorage.setItem(`@auto_timer_pending_stop_${job.id}`, JSON.stringify(pendingStop));
      
      // NO notificar cuando se programa - solo cuando realmente pare
      console.log(`⏱️ Timer programado para detenerse en ${delayMinutes} minutos`);
      
      // NO usar setTimeout - el timer se parará cuando la app vuelva a foreground
      // o cuando se procese el siguiente evento de geofencing
    } else {
      // Parar inmediatamente si no hay delay
      const startTime = new Date(activeSession.startTime);
      const endTime = new Date(timestamp);
      const elapsedMs = endTime.getTime() - startTime.getTime();
      const elapsedHours = Math.max(0.01, parseFloat((elapsedMs / (1000 * 60 * 60)).toFixed(2)));

      const today = endTime.toISOString().split('T')[0];
      const workDay = {
        date: today,
        jobId: job.id,
        hours: elapsedHours,
        notes: activeSession.notes || 'Auto-stopped (Background)',
        overtime: elapsedHours > 8,
        type: 'work' as const,
      };

      await JobService.addWorkDay(workDay);
      await JobService.clearActiveSession();

      await sendBackgroundNotification(
        '⏹️ Timer Stopped',
        `Timer stopped for ${job.name}: ${elapsedHours.toFixed(2)}h recorded`,
        { jobId: job.id, action: 'stopped', hours: elapsedHours }
      );
    }

    // Guardar evento en historial
    await saveBackgroundEvent('exit', job, timestamp);

  } catch (error) {
    console.error('❌ Error manejando salida en background:', error);
  }
}

/**
 * Enviar notificación desde background
 */
async function sendBackgroundNotification(title: string, body: string, data: any): Promise<void> {
  try {
    // Check if this notification was recently sent
    const recentNotificationsKey = '@recent_background_notifications';
    const recentData = await AsyncStorage.getItem(recentNotificationsKey);
    const recentNotifications = recentData ? JSON.parse(recentData) : [];
    
    // Create unique notification ID
    const notificationId = `${data.action}_${data.jobId}_${Date.now()}`;
    const now = Date.now();
    
    // Check if similar notification was sent in last 5 seconds
    const similarRecent = recentNotifications.find((n: any) => 
      n.action === data.action && 
      n.jobId === data.jobId && 
      (now - n.timestamp) < 5000
    );
    
    if (similarRecent) {
      console.log(`⚠️ Similar notification recently sent, skipping: ${title}`);
      return;
    }
    
    // Send notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Inmediatamente
    });
    
    console.log(`🔔 Notificación enviada: ${title}`);
    
    // Save to recent notifications
    recentNotifications.push({
      id: notificationId,
      action: data.action,
      jobId: data.jobId,
      timestamp: now
    });
    
    // Keep only notifications from last 30 seconds
    const filtered = recentNotifications.filter((n: any) => 
      (now - n.timestamp) < 30000
    );
    
    await AsyncStorage.setItem(recentNotificationsKey, JSON.stringify(filtered));
  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
  }
}

/**
 * Enviar notificación forzada sin deduplicación (para eventos críticos)
 */
async function sendBackgroundNotificationForced(title: string, body: string, data: any): Promise<void> {
  try {
    console.log(`🔴 FORZANDO envío de notificación: ${title}`);
    
    // Send notification immediately without any checks
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'timer_actions',
      },
      trigger: null, // Inmediatamente
    });
    
    console.log(`✅ Notificación forzada enviada con ID: ${notificationId}`);
  } catch (error) {
    console.error('❌ Error enviando notificación forzada:', error);
    // Try alternative method
    try {
      console.log('🔄 Intentando método alternativo de notificación...');
      await Notifications.presentNotificationAsync({
        title,
        body,
        data,
        sound: true,
      });
      console.log('✅ Notificación enviada con método alternativo');
    } catch (altError) {
      console.error('❌ Error con método alternativo:', altError);
    }
  }
}

/**
 * Guardar evento de background en historial para debug
 */
async function saveBackgroundEvent(eventType: 'enter' | 'exit', job: any, timestamp: string): Promise<void> {
  try {
    const eventsData = await AsyncStorage.getItem('@background_events');
    let events = eventsData ? JSON.parse(eventsData) : [];
    
    events.push({
      type: eventType,
      jobId: job.id,
      jobName: job.name,
      timestamp,
      id: `${eventType}_${job.id}_${Date.now()}`
    });

    // Mantener solo los últimos 50 eventos
    if (events.length > 50) {
      events = events.slice(-50);
    }

    await AsyncStorage.setItem('@background_events', JSON.stringify(events));
    console.log(`📝 Evento background guardado: ${eventType} para ${job.name}`);
  } catch (error) {
    console.error('❌ Error guardando evento background:', error);
  }
}

/**
 * Iniciar monitoreo de geofencing en background
 */
export async function startBackgroundGeofencing(jobs: any[]): Promise<boolean> {
  try {
    console.log('🚀 Iniciando background geofencing...');

    // Verificar permisos de notificaciones primero
    const notificationStatus = await Notifications.getPermissionsAsync();
    if (!notificationStatus.granted) {
      console.log('📱 Solicitando permisos de notificaciones...');
      const { granted } = await Notifications.requestPermissionsAsync();
      if (!granted) {
        console.error('❌ Permisos de notificaciones no otorgados');
      }
    }

    // Verificar permisos de ubicación
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('❌ Permisos de ubicación en background no otorgados');
      return false;
    }

    // Filtrar trabajos con AutoTimer habilitado y ubicación válida
    const validJobs = jobs.filter(job => 
      job.autoTimer?.enabled && 
      job.location?.latitude && 
      job.location?.longitude
    );

    if (validJobs.length === 0) {
      console.log('⚠️ No hay trabajos válidos para background geofencing');
      return false;
    }

    // Crear regiones de geofencing - usar el mismo radio que SimpleAutoTimer
    const regions: Location.LocationRegion[] = validJobs.map(job => {
      // Usar EXACTAMENTE el mismo radio que SimpleAutoTimer
      const configuredRadius = Number(job.autoTimer?.geofenceRadius ?? job.autoTimer?.radius ?? 50);
      const baseRadius = Math.max(30, isNaN(configuredRadius) ? 50 : configuredRadius);
      // NO añadir margen extra - usar el radio exacto
      
      return {
        identifier: job.id,
        latitude: job.location.latitude,
        longitude: job.location.longitude,
        radius: baseRadius, // Radio exacto sin margen
        notifyOnEnter: true,
        notifyOnExit: true,
      };
    });

    console.log(`📍 Configurando ${regions.length} regiones de geofencing:`);
    regions.forEach(region => {
      const job = validJobs.find(j => j.id === region.identifier);
      console.log(`  - ${job?.name}: radio ${region.radius}m (exacto)`);
    });

    // Verificar si la tarea está definida
    const isTaskDefined = TaskManager.isTaskDefined(BACKGROUND_GEOFENCE_TASK);
    if (!isTaskDefined) {
      console.error('❌ La tarea de geofencing no está definida');
      return false;
    }
    
    console.log('✅ Tarea de geofencing verificada y definida');
    
    // Detener cualquier geofencing previo
    try {
      await Location.stopGeofencingAsync(BACKGROUND_GEOFENCE_TASK);
      console.log('🛑 Geofencing previo detenido');
    } catch (e) {
      // Ignorar si no había geofencing previo
    }
    
    // Iniciar monitoreo
    await Location.startGeofencingAsync(BACKGROUND_GEOFENCE_TASK, regions);
    
    console.log('✅ Background geofencing iniciado exitosamente');
    
    // NO enviar notificación de confirmación al activar - es molesto
    console.log(`🌍 Monitoreando ${regions.length} ubicación(es) de trabajo`);
    
    return true;

  } catch (error) {
    console.error('❌ Error iniciando background geofencing:', error);
    return false;
  }
}

/**
 * Detener monitoreo de geofencing en background
 */
export async function stopBackgroundGeofencing(): Promise<void> {
  try {
    await Location.stopGeofencingAsync(BACKGROUND_GEOFENCE_TASK);
    console.log('🛑 Background geofencing detenido');
  } catch (error) {
    console.error('❌ Error deteniendo background geofencing:', error);
  }
}

/**
 * Verificar si la tarea está registrada
 */
export function isTaskRegistered(): boolean {
  return TaskManager.isTaskDefined(BACKGROUND_GEOFENCE_TASK);
}

/**
 * Procesar acciones pendientes que ya deberían haberse ejecutado
 */
async function processPendingActions(): Promise<void> {
  try {
    const now = new Date();
    
    // Buscar acciones pendientes de inicio
    const keys = await AsyncStorage.getAllKeys();
    const pendingKeys = keys.filter(key => 
      key.startsWith('@auto_timer_pending_start_') || 
      key.startsWith('@auto_timer_pending_stop_')
    );
    
    // Track processed notifications to avoid duplicates
    const processedNotifications = new Set<string>();
    
    for (const key of pendingKeys) {
      const pendingData = await AsyncStorage.getItem(key);
      if (!pendingData) continue;
      
      const pending = JSON.parse(pendingData);
      const targetTime = new Date(pending.targetTime);
      
      // Si ya pasó el tiempo objetivo, ejecutar la acción
      if (now >= targetTime) {
        const jobId = key.split('_').pop();
        if (!jobId) {
          console.error('❌ No se pudo extraer jobId del key:', key);
          await AsyncStorage.removeItem(key);
          continue;
        }
        
        const notificationKey = `${key.includes('pending_start') ? 'start' : 'stop'}_${jobId}_${pending.timestamp}`;
        
        // Skip if we already processed this notification
        if (processedNotifications.has(notificationKey)) {
          console.log(`⚠️ Notification ${notificationKey} already processed, skipping`);
          await AsyncStorage.removeItem(key);
          continue;
        }
        
        if (key.includes('pending_start')) {
          console.log('⏰ Ejecutando inicio pendiente desde background');
          // Iniciar timer
          const activeSession = await JobService.getActiveSession();
          if (!activeSession) {
            const sessionForStorage = {
              jobId: jobId,
              startTime: now.toISOString(),
              notes: 'Auto-started (Background)',
            };
            await JobService.saveActiveSession(sessionForStorage);
            
            // Obtener nombre del trabajo
            const jobsData = await AsyncStorage.getItem('jobs');
            const jobs = jobsData ? JSON.parse(jobsData) : [];
            const job = jobs.find((j: any) => j.id === jobId);
            
            // Mark as processed before sending notification
            processedNotifications.add(notificationKey);
            
            // Enviar notificación cuando el timer realmente inicia después del delay
            await sendBackgroundNotificationForced(
              '✅ Timer Started',
              `Automatic timer started at ${job?.name || 'work'}`,
              { jobId, action: 'started', timestamp: pending.timestamp }
            );
          } else {
            console.log(`⚠️ Session already active, skipping pending start for job ${jobId}`);
          }
        } else if (key.includes('pending_stop')) {
          console.log('⏰ Ejecutando parada pendiente desde background');
          // Parar timer
          const activeSession = await JobService.getActiveSession();
          if (activeSession && activeSession.jobId === jobId) {
            const startTime = new Date(activeSession.startTime);
            const elapsedMs = now.getTime() - startTime.getTime();
            const elapsedHours = Math.max(0.01, parseFloat((elapsedMs / (1000 * 60 * 60)).toFixed(2)));
            
            const today = now.toISOString().split('T')[0];
            const workDay = {
              date: today,
              jobId: jobId as string,
              hours: elapsedHours,
              notes: activeSession.notes || 'Auto-stopped (Background)',
              overtime: elapsedHours > 8,
              type: 'work' as const,
            };
            
            await JobService.addWorkDay(workDay);
            await JobService.clearActiveSession();
            
            // Obtener nombre del trabajo
            const jobsData = await AsyncStorage.getItem('jobs');
            const jobs = jobsData ? JSON.parse(jobsData) : [];
            const job = jobs.find((j: any) => j.id === jobId);
            
            // Mark as processed before sending notification
            processedNotifications.add(notificationKey);
            
            // Enviar notificación cuando el timer realmente para después del delay
            await sendBackgroundNotificationForced(
              '⏹️ Timer Stopped',
              `Timer stopped for ${job?.name || 'work'}: ${elapsedHours.toFixed(2)}h recorded`,
              { jobId, action: 'stopped', hours: elapsedHours, timestamp: pending.timestamp }
            );
          } else {
            console.log(`⚠️ No active session for job ${jobId}, skipping pending stop`);
          }
        }
        
        // Limpiar la acción pendiente
        await AsyncStorage.removeItem(key);
      }
    }
    
    // Save processed notifications for deduplication
    if (processedNotifications.size > 0) {
      const existingProcessed = await AsyncStorage.getItem('@processed_notifications');
      const existing = existingProcessed ? JSON.parse(existingProcessed) : [];
      const allProcessed = [...existing, ...Array.from(processedNotifications)];
      
      // Keep only last 100 processed notifications
      const trimmed = allProcessed.slice(-100);
      await AsyncStorage.setItem('@processed_notifications', JSON.stringify(trimmed));
    }
  } catch (error) {
    console.error('❌ Error procesando acciones pendientes:', error);
  }
}

/**
 * Obtener eventos de background para debug
 */
export async function getBackgroundEvents(): Promise<any[]> {
  try {
    const eventsData = await AsyncStorage.getItem('@background_events');
    return eventsData ? JSON.parse(eventsData) : [];
  } catch (error) {
    console.error('❌ Error obteniendo eventos background:', error);
    return [];
  }
}