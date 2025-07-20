import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import JobSelector from '../components/JobSelector';
import { Job, WorkDay } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import { useBackNavigation, useNavigation } from '../context/NavigationContext';
import { Theme } from '../constants/Theme';

interface TimerScreenProps {
  onNavigate: (screen: string) => void;
}

interface ActiveSession {
  jobId: string;
  startTime: Date;
  notes: string;
}

interface StoredActiveSession {
  jobId: string;
  startTime: string;
  notes: string;
}

export default function TimerScreen({ onNavigate }: TimerScreenProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [notes, setNotes] = useState('');
  const { handleBack } = useBackNavigation();
  const { selectedJob, setSelectedJob } = useNavigation();

  useEffect(() => {
    loadJobs();
    loadActiveSession();
  }, []);

  // Auto-select job if coming from map
  useEffect(() => {
    if (selectedJob && !isRunning && !activeSession) {
      setSelectedJobId(selectedJob.id);
      // Clear the selected job after using it
      setSelectedJob(null);
    }
  }, [selectedJob, isRunning, activeSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && activeSession) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - activeSession.startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, activeSession]);

  const loadJobs = async () => {
    try {
      const loadedJobs = await JobService.getJobs();
      setJobs(loadedJobs);
      
      // Only auto-select if no job is selected AND no job is coming from navigation
      if (loadedJobs.length > 0 && !selectedJobId && !selectedJob) {
        const activeJob = loadedJobs.find(job => job.isActive) || loadedJobs[0];
        setSelectedJobId(activeJob.id);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      Alert.alert('Error', 'No se pudieron cargar los trabajos');
    }
  };

  const loadActiveSession = async () => {
    try {
      const sessionData: StoredActiveSession | null = await JobService.getActiveSession();
      if (sessionData) {
        setActiveSession({
          ...sessionData,
          startTime: new Date(sessionData.startTime),
        });
        setSelectedJobId(sessionData.jobId);
        setNotes(sessionData.notes || '');
        setIsRunning(true);
        
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - new Date(sessionData.startTime).getTime()) / 1000);
        setElapsedTime(elapsed);
      }
    } catch (error) {
      console.error('Error loading active session:', error);
    }
  };

  const startTimer = async () => {
    if (!selectedJobId) {
      Alert.alert('Error', 'Por favor selecciona un trabajo antes de comenzar');
      return;
    }

    try {
      const sessionForStorage: StoredActiveSession = {
        jobId: selectedJobId,
        startTime: new Date().toISOString(),
        notes: notes,
      };

      const session: ActiveSession = {
        jobId: selectedJobId,
        startTime: new Date(),
        notes: notes,
      };

      await JobService.saveActiveSession(sessionForStorage);
      setActiveSession(session);
      setIsRunning(true);
      setElapsedTime(0);
    } catch (error) {
      console.error('Error starting timer:', error);
      Alert.alert('Error', 'No se pudo iniciar el timer');
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resumeTimer = () => {
    setIsRunning(true);
  };

  const stopTimer = async () => {
    if (!activeSession) return;

    try {
      const hours = getSessionHours();
      const workDay: Omit<WorkDay, 'id' | 'createdAt' | 'updatedAt'> = {
        date: new Date().toISOString().split('T')[0],
        jobId: activeSession.jobId,
        hours: hours,
        notes: notes,
        overtime: hours > 8,
        type: 'work',
      };

      await JobService.addWorkDay(workDay);
      await JobService.clearActiveSession();
      
      setActiveSession(null);
      setIsRunning(false);
      setElapsedTime(0);
      setNotes('');
      
      Alert.alert('Éxito', `Sesión guardada: ${hours} horas`);
    } catch (error) {
      console.error('Error stopping timer:', error);
      Alert.alert('Error', 'No se pudo guardar la sesión');
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const getSessionHours = () => {
    return Math.round(elapsedTime / 1800) * 0.5; // Round to nearest 0.5 hour
  };

  const currentSelectedJob = jobs.find(job => job.id === selectedJobId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.placeholder} />
          <View style={styles.headerText}>
            <View style={styles.titleContainer}>
              <IconSymbol size={20} name="clock.fill" color={Theme.colors.primary} />
              <Text style={styles.headerTitle}>Timer</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {isRunning ? 'Sesión activa' : 'Listo para trabajar'}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={handleBack}
            style={styles.backButton}
          >
            <IconSymbol size={24} name="xmark" color={Theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!isRunning && !activeSession && (
          <View style={styles.section}>
            <JobSelector
              jobs={jobs}
              selectedJobId={selectedJobId}
              onJobSelect={setSelectedJobId}
              showAddButton={false}
            />
          </View>
        )}

        <BlurView 
          intensity={95} 
          tint="light" 
          style={styles.timerCard}
        >
          <View style={styles.timerContent}>
            <View style={styles.timerDisplay}>
              <Text style={styles.timerTime}>
                {formatTime(elapsedTime)}
              </Text>
              <Text style={styles.timerHours}>
                ≈ {getSessionHours()}h{getSessionHours() > 8 ? ' (overtime)' : ''}
              </Text>
            </View>

            {activeSession && currentSelectedJob && (
              <View style={styles.activeJobInfo}>
                <View style={[styles.jobColorDot, { backgroundColor: currentSelectedJob.color }]} />
                <Text style={styles.activeJobName}>{currentSelectedJob.name}</Text>
              </View>
            )}

            <View style={styles.timerControls}>
              {!isRunning && !activeSession ? (
                <TouchableOpacity
                  style={[styles.controlButton, styles.startButton]}
                  onPress={startTimer}
                  disabled={!selectedJobId}
                >
                  <IconSymbol size={20} name="play.fill" color="#FFFFFF" />
                  <Text style={styles.controlButtonText}>Iniciar</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.activeControls}>
                  {isRunning ? (
                    <TouchableOpacity
                      style={[styles.controlButton, styles.pauseButton]}
                      onPress={pauseTimer}
                    >
                      <IconSymbol size={20} name="pause.fill" color="#FFFFFF" />
                      <Text style={styles.controlButtonText}>Pausar</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.controlButton, styles.resumeButton]}
                      onPress={resumeTimer}
                    >
                      <IconSymbol size={20} name="play.fill" color="#FFFFFF" />
                      <Text style={styles.controlButtonText}>Continuar</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.controlButton, styles.stopButton]}
                    onPress={stopTimer}
                  >
                    <IconSymbol size={20} name="stop.fill" color="#FFFFFF" />
                    <Text style={styles.controlButtonText}>Finalizar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </BlurView>

        <BlurView 
          intensity={95} 
          tint="light" 
          style={styles.notesCard}
        >
          <Text style={styles.notesTitle}>Notas de la sesión</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Agregar notas sobre el trabajo realizado..."
            placeholderTextColor={Theme.colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            editable={!isRunning}
          />
          <Text style={styles.notesHint}>
            Las notas se guardarán con el registro de tiempo
          </Text>
        </BlurView>

        <BlurView 
          intensity={95} 
          tint="light" 
          style={styles.quickActions}
        >
          <Text style={styles.quickActionsTitle}>Acciones rápidas</Text>
          <View style={styles.quickActionButtons}>
            <TouchableOpacity style={styles.quickActionButton}>
              <IconSymbol size={16} name="lightbulb.fill" color={Theme.colors.warning} />
              <Text style={styles.quickActionText}>Consejos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <IconSymbol size={16} name="calendar" color={Theme.colors.primary} />
              <Text style={styles.quickActionText}>Calendario</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <IconSymbol size={16} name="pause.fill" color={Theme.colors.textSecondary} />
              <Text style={styles.quickActionText}>Descanso</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    marginRight: -8,
  },
  headerText: {
    flex: 1,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
    color: Theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 12,
  },
  timerCard: {
    marginVertical: 12,
    borderRadius: 16,
    padding: 24,
    backgroundColor: Theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  timerContent: {
    alignItems: 'center',
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerTime: {
    fontSize: 48,
    fontWeight: '300',
    fontFamily: 'System',
    marginBottom: 4,
    color: Theme.colors.text,
  },
  timerHours: {
    fontSize: 20,
    color: Theme.colors.textSecondary,
  },
  activeJobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  jobColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  activeJobName: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  timerControls: {
    alignItems: 'center',
  },
  activeControls: {
    flexDirection: 'row',
    gap: 16,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  startButton: {
    minWidth: 120,
    justifyContent: 'center',
    backgroundColor: Theme.colors.success,
  },
  pauseButton: {
    backgroundColor: Theme.colors.warning,
  },
  resumeButton: {
    backgroundColor: Theme.colors.success,
  },
  stopButton: {
    backgroundColor: Theme.colors.error,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
    color: '#FFFFFF',
  },
  notesCard: {
    marginVertical: 12,
    borderRadius: 16,
    padding: 20,
    backgroundColor: Theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: Theme.colors.text,
  },
  notesInput: {
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    color: Theme.colors.text,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  notesHint: {
    fontSize: 12,
    marginTop: 4,
    color: Theme.colors.textSecondary,
  },
  quickActions: {
    marginVertical: 12,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    backgroundColor: Theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: Theme.colors.text,
  },
  quickActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 8,
  },
  quickActionText: {
    fontSize: 12,
    marginTop: 4,
    color: Theme.colors.textSecondary,
  },
});