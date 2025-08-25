import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import SimpleAutoTimer from '../services/SimpleAutoTimer';
import { JobService } from '../services/JobService';
import LiveActivityService from '../services/LiveActivityService';
import WidgetSyncService from '../services/WidgetSyncService';
import { Job } from '../types/WorkTypes';

// Tipos para el estado del AutoTimer
export interface AutoTimerState {
  isActive: boolean;
  isMonitoring: boolean;
  currentJobId: string | null;
  currentJobName: string | null;
  elapsedTime: number;
  startTime: Date | null;
  isPaused: boolean;
}

// Interfaz del Context
interface AutoTimerContextType {
  // Estado
  state: AutoTimerState;
  
  // Métodos de control
  startMonitoring: (jobs: Job[]) => Promise<boolean>;
  stopMonitoring: () => void;
  
  // Métodos del timer
  startTimer: (jobId: string) => Promise<boolean>;
  stopTimer: () => Promise<boolean>;
  pauseTimer: () => Promise<boolean>;
  resumeTimer: () => Promise<boolean>;
  
  // Utilidades
  refresh: () => Promise<void>;
  isServiceEnabled: () => boolean;
}

// Estado inicial
const initialState: AutoTimerState = {
  isActive: false,
  isMonitoring: false,
  currentJobId: null,
  currentJobName: null,
  elapsedTime: 0,
  startTime: null,
  isPaused: false,
};

// Crear el Context
const AutoTimerContext = createContext<AutoTimerContextType | undefined>(undefined);

// Hook personalizado para usar el Context
export const useAutoTimer = () => {
  const context = useContext(AutoTimerContext);
  if (context === undefined) {
    throw new Error('useAutoTimer must be used within an AutoTimerProvider');
  }
  return context;
};

// Provider Component
export const AutoTimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AutoTimerState>(initialState);
  const [autoTimerService] = useState(() => SimpleAutoTimer.getInstance());
  const [liveActivityService] = useState(() => LiveActivityService.getInstance());
  const [jobs, setJobs] = useState<Job[]>([]);

  // Actualizar estado desde el servicio
  const updateState = async () => {
    try {
      // Obtener sesión activa
      const activeSession = await JobService.getActiveSession();
      const isServiceEnabled = autoTimerService.isServiceEnabled();
      
      if (activeSession) {
        // Encontrar el job actual
        const currentJob = jobs.find(job => job.id === activeSession.jobId);
        
        // Calcular tiempo transcurrido
        const isPaused = (activeSession as any).isPaused || false;
        const pausedElapsedTime = (activeSession as any).pausedElapsedTime || 0;
        
        let elapsedTime = 0;
        if (isPaused && pausedElapsedTime > 0) {
          elapsedTime = pausedElapsedTime;
        } else {
          const startTime = new Date(activeSession.startTime);
          elapsedTime = Math.floor((Date.now() - startTime.getTime()) / 1000);
        }

        setState({
          isActive: true,
          isMonitoring: isServiceEnabled,
          currentJobId: activeSession.jobId,
          currentJobName: currentJob?.name || null,
          elapsedTime,
          startTime: new Date(activeSession.startTime),
          isPaused,
        });
      } else {
        setState({
          isActive: false,
          isMonitoring: isServiceEnabled,
          currentJobId: null,
          currentJobName: null,
          elapsedTime: 0,
          startTime: null,
          isPaused: false,
        });
      }
    } catch (error) {
      console.error('Error updating AutoTimer state:', error);
    }
  };

  // Cargar trabajos
  const loadJobs = async () => {
    try {
      const loadedJobs = await JobService.getJobs();
      setJobs(loadedJobs);
      return loadedJobs;
    } catch (error) {
      console.error('Error loading jobs:', error);
      return [];
    }
  };

  // Configurar listeners y timer de actualización
  useEffect(() => {
    let updateInterval: NodeJS.Timeout;
    let jobsLoadInterval: NodeJS.Timeout;

    // Cargar trabajos inicialmente
    loadJobs();

    // Configurar listener para cambios de estado del servicio
    const handleStatusChange = (status: any) => {
      console.log('📡 AutoTimer Context: Status changed:', status);
      updateState();
    };

    // Agregar listener
    autoTimerService.on('statusChanged', handleStatusChange);

    // Actualizar estado cada segundo cuando hay timer activo
    updateInterval = setInterval(async () => {
      await updateState();
    }, 1000);

    // Recargar trabajos cada 30 segundos para mantener sincronización
    jobsLoadInterval = setInterval(async () => {
      await loadJobs();
    }, 30000);

    // Estado inicial
    updateState();

    return () => {
      if (updateInterval) clearInterval(updateInterval);
      if (jobsLoadInterval) clearInterval(jobsLoadInterval);
      autoTimerService.off('statusChanged', handleStatusChange);
    };
  }, [jobs.length]); // Depend on jobs length to reload when jobs change

  // Métodos del Context
  const startMonitoring = async (jobsList: Job[] = []) => {
    try {
      console.log('🚀 AutoTimerContext: Starting monitoring with', jobsList.length, 'jobs');
      
      // Si no se pasan jobs, usar los cargados
      if (jobsList.length === 0) {
        jobsList = await loadJobs();
      } else {
        setJobs(jobsList);
      }

      // Iniciar el servicio de monitoreo
      await autoTimerService.startSimpleMonitoring();
      
      console.log('✅ AutoTimer monitoring started successfully');
      await updateState();
      return true;
    } catch (error) {
      console.error('Error starting AutoTimer monitoring:', error);
      return false;
    }
  };

  const stopMonitoring = () => {
    try {
      console.log('🛑 AutoTimerContext: Stopping monitoring');
      autoTimerService.stop();
      updateState();
    } catch (error) {
      console.error('Error stopping AutoTimer monitoring:', error);
    }
  };

  const startTimer = async (jobId: string) => {
    try {
      console.log('▶️ AutoTimerContext: Starting timer for job', jobId);
      
      // Encontrar el trabajo
      const job = jobs.find(j => j.id === jobId);
      if (!job) {
        console.error('Job not found:', jobId);
        return false;
      }

      // Verificar si ya hay una sesión activa
      const existingSession = await JobService.getActiveSession();
      if (existingSession && existingSession.jobId === jobId) {
        console.log('⚠️ Session already active for this job');
        await updateState();
        return true;
      }

      // Crear nueva sesión
      const startTime = new Date();
      const sessionForStorage = {
        jobId: job.id,
        startTime: startTime.toISOString(),
        notes: 'Manual timer start',
      };

      await JobService.saveActiveSession(sessionForStorage);

      // Iniciar Live Activity
      await liveActivityService.startLiveActivity(job.name, job.address || '', startTime);
      console.log('📱 Live Activity started for manual timer');

      // Sincronizar Widget específicamente para el timer
      try {
        await WidgetSyncService.syncActiveTimerToWidget();
        console.log('📱 Widget synchronized after timer start');
      } catch (error) {
        console.error('Error syncing widget:', error);
      }

      await updateState();
      return true;
    } catch (error) {
      console.error('Error starting timer:', error);
      return false;
    }
  };

  const stopTimer = async () => {
    try {
      console.log('⏹️ AutoTimerContext: Stopping timer');
      
      const activeSession = await JobService.getActiveSession();
      if (!activeSession) {
        console.log('⚠️ No active session to stop');
        return false;
      }

      // Calcular tiempo transcurrido
      const startTime = new Date(activeSession.startTime);
      const endTime = new Date();
      const elapsedMs = endTime.getTime() - startTime.getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);

      // Obtener tiempos reales
      const actualStartTime = startTime.toTimeString().split(' ')[0];
      const actualEndTime = endTime.toTimeString().split(' ')[0];

      // Crear registro de trabajo
      const today = endTime.toISOString().split('T')[0];
      const workDay = {
        date: today,
        jobId: activeSession.jobId,
        hours: elapsedHours,
        notes: activeSession.notes || 'Manual timer stop',
        overtime: elapsedHours > 8,
        type: 'work' as const,
        actualStartTime,
        actualEndTime,
      };

      // Verificar si ya existe un trabajo para hoy
      const allWorkDays = await JobService.getWorkDays();
      const existingWorkDay = allWorkDays.find(day => 
        day.date === today && 
        day.jobId === activeSession.jobId && 
        day.type === 'work'
      );

      if (existingWorkDay) {
        // Actualizar trabajo existente
        const updatedHours = existingWorkDay.hours + elapsedHours;
        const combinedNotes = existingWorkDay.notes && workDay.notes 
          ? `${existingWorkDay.notes}\n---\n${workDay.notes}` 
          : existingWorkDay.notes || workDay.notes;
          
        const updatedWorkDay = {
          ...workDay,
          hours: updatedHours,
          notes: combinedNotes,
          overtime: updatedHours > 8,
          actualEndTime, // Siempre actualizar la hora de fin
        };
        
        await JobService.updateWorkDay(existingWorkDay.id, updatedWorkDay);
      } else {
        // Crear nuevo registro
        await JobService.addWorkDay(workDay);
      }

      // Limpiar sesión activa
      await JobService.clearActiveSession();

      // Terminar Live Activity
      const elapsedSeconds = Math.floor(elapsedHours * 3600);
      await liveActivityService.endLiveActivity(elapsedSeconds);
      console.log('📱 Live Activity ended');

      // Sincronizar Widget específicamente para el timer
      try {
        await WidgetSyncService.syncActiveTimerToWidget();
        console.log('📱 Widget synchronized after timer stop');
      } catch (error) {
        console.error('Error syncing widget:', error);
      }

      await updateState();
      return true;
    } catch (error) {
      console.error('Error stopping timer:', error);
      return false;
    }
  };

  const pauseTimer = async () => {
    try {
      console.log('⏸️ AutoTimerContext: Pausing timer');
      await autoTimerService.pauseTimer();
      await updateState();
      return true;
    } catch (error) {
      console.error('Error pausing timer:', error);
      return false;
    }
  };

  const resumeTimer = async () => {
    try {
      console.log('▶️ AutoTimerContext: Resuming timer');
      await autoTimerService.resumeTimer();
      await updateState();
      return true;
    } catch (error) {
      console.error('Error resuming timer:', error);
      return false;
    }
  };

  const refresh = async () => {
    await loadJobs();
    await updateState();
  };

  const isServiceEnabled = () => {
    return autoTimerService.isServiceEnabled();
  };

  const contextValue: AutoTimerContextType = {
    state,
    startMonitoring,
    stopMonitoring,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    refresh,
    isServiceEnabled,
  };

  return (
    <AutoTimerContext.Provider value={contextValue}>
      {children}
    </AutoTimerContext.Provider>
  );
};

export default AutoTimerProvider;