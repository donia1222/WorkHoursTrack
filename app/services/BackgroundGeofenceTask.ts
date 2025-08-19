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

  try {
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

    // Verificar delay configurado
    const delayMinutes = job.autoTimer?.delayStart ?? 2;
    
    if (delayMinutes > 0) {
      // Guardar tiempo de entrada para verificar delay después
      await AsyncStorage.setItem(`@auto_timer_enter_${job.id}`, timestamp);
      
      // Programar notificación para cuando se cumpla el delay
      await sendBackgroundNotification(
        '⏱️ AutoTimer Programado',
        `Timer se iniciará para ${job.name} en ${delayMinutes} minutos`,
        { jobId: job.id, action: 'scheduled_start' }
      );
      
      // Programar el inicio real después del delay
      setTimeout(async () => {
        // Verificar que no haya sesión activa antes de iniciar
        const currentSession = await JobService.getActiveSession();
        if (!currentSession) {
          const sessionForStorage = {
            jobId: job.id,
            startTime: new Date().toISOString(),
            notes: 'Auto-started (Background)',
          };
          await JobService.saveActiveSession(sessionForStorage);
          
          await sendBackgroundNotification(
            '✅ Timer Iniciado',
            `Timer iniciado automáticamente en ${job.name}`,
            { jobId: job.id, action: 'started' }
          );
        }
      }, delayMinutes * 60 * 1000);
    } else {
      // Iniciar inmediatamente si no hay delay
      const sessionForStorage = {
        jobId: job.id,
        startTime: timestamp,
        notes: 'Auto-started (Background)',
      };

      await JobService.saveActiveSession(sessionForStorage);
      console.log(`✅ Sesión iniciada desde background para ${job.name} a las ${new Date(timestamp).toLocaleTimeString()}`);

      await sendBackgroundNotification(
        '✅ Timer Iniciado',
        `Timer iniciado automáticamente en ${job.name}`,
        { jobId: job.id, action: 'started' }
      );
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

    // Verificar delay configurado
    const delayMinutes = job.autoTimer?.delayStop ?? 2;
    
    if (delayMinutes > 0) {
      // Guardar tiempo de salida para verificar delay después
      await AsyncStorage.setItem(`@auto_timer_exit_${job.id}`, timestamp);
      
      // Programar notificación
      await sendBackgroundNotification(
        '⏱️ AutoTimer Programado',
        `Timer se detendrá para ${job.name} en ${delayMinutes} minutos`,
        { jobId: job.id, action: 'scheduled_stop' }
      );
      
      // Programar la parada real después del delay
      setTimeout(async () => {
        // Verificar que la sesión siga activa antes de parar
        const currentSession = await JobService.getActiveSession();
        if (currentSession && currentSession.jobId === job.id) {
          // Calcular tiempo trabajado
          const startTime = new Date(currentSession.startTime);
          const endTime = new Date();
          const elapsedMs = endTime.getTime() - startTime.getTime();
          const elapsedHours = Math.max(0.01, parseFloat((elapsedMs / (1000 * 60 * 60)).toFixed(2)));

          // Crear registro de día laboral
          const today = endTime.toISOString().split('T')[0];
          const workDay = {
            date: today,
            jobId: job.id,
            hours: elapsedHours,
            notes: currentSession.notes || 'Auto-stopped (Background)',
            overtime: elapsedHours > 8,
            type: 'work' as const,
          };

          await JobService.addWorkDay(workDay);
          await JobService.clearActiveSession();
          
          await sendBackgroundNotification(
            '⏹️ Timer Detenido',
            `Timer detenido para ${job.name}: ${elapsedHours.toFixed(2)}h registradas`,
            { jobId: job.id, action: 'stopped', hours: elapsedHours }
          );
        }
      }, delayMinutes * 60 * 1000);
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
        '⏹️ Timer Detenido',
        `Timer detenido para ${job.name}: ${elapsedHours.toFixed(2)}h registradas`,
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
  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
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

    // Verificar permisos
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

    // Crear regiones de geofencing con histéresis
    // NOTA: iOS/Android no soportan radios diferentes para entrada/salida nativamente
    // Usamos el radio base para entrada y lo aumentamos para salida
    const regions: Location.LocationRegion[] = validJobs.map(job => {
      const baseRadius = job.autoTimer?.geofenceRadius || 50;
      // Usamos un radio intermedio (15% más) para el geofence nativo
      // Esto reduce falsos positivos manteniendo buena detección
      const effectiveRadius = Math.round(baseRadius * 1.15);
      
      return {
        identifier: job.id,
        latitude: job.location.latitude,
        longitude: job.location.longitude,
        radius: effectiveRadius, // Radio con margen de seguridad
        notifyOnEnter: true,
        notifyOnExit: true,
      };
    });

    console.log(`📍 Configurando ${regions.length} regiones de geofencing:`);
    regions.forEach(region => {
      const job = validJobs.find(j => j.id === region.identifier);
      const baseRadius = job?.autoTimer?.geofenceRadius || 50;
      console.log(`  - ${job?.name}: radio base ${baseRadius}m → efectivo ${region.radius}m (+15% margen)`);
    });

    // Iniciar monitoreo
    await Location.startGeofencingAsync(BACKGROUND_GEOFENCE_TASK, regions);
    
    console.log('✅ Background geofencing iniciado exitosamente');
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

/**
 * Método para simular eventos de geofencing (solo para pruebas)
 */
// export async function simulateGeofenceEvent(jobId: string, eventType: 'enter' | 'exit'): Promise<void> {
//   console.log(`🧪 Simulando evento ${eventType} para trabajo ${jobId}`);
  
//   const mockData = {
//     eventType: eventType === 'enter' ? Location.GeofencingEventType.Enter : Location.GeofencingEventType.Exit,
//     region: {
//       identifier: jobId,
//       latitude: 0,
//       longitude: 0,
//       radius: 100,
//       notifyOnEnter: true,
//       notifyOnExit: true,
//     }
//   };

//   // Ejecutar la tarea como si fuera un evento real
//   // TaskManager no expone getTaskOptions
//   // const taskExecutor = TaskManager.getTaskOptions(BACKGROUND_GEOFENCE_TASK);
//   // if (taskExecutor) {
//   //   await (taskExecutor as any).taskExecutor({ data: mockData, error: null });
//   // }
// }