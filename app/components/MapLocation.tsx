import React, { useState, useEffect, useRef } from 'react';
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { Job } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import JobFormModal from '../components/JobFormModal';
import JobStatisticsModal from '../components/JobStatisticsModal';
import { useNavigation } from '../context/NavigationContext';
import { Theme } from '../constants/Theme';

type Props = {
  location: {
    latitude: number;
    longitude: number;
  };
  onNavigate?: (screen: string) => void;
};


export default function MapLocation({ location, onNavigate }: Props) {
  const { navigateTo } = useNavigation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [showStatistics, setShowStatistics] = useState(false);
  const [selectedJobForStats, setSelectedJobForStats] = useState<Job | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const loadedJobs = await JobService.getJobs();
      setJobs(loadedJobs.filter(job => job.isActive));
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };


  const handleAddJob = () => {
    setEditingJob(null);
    setShowJobForm(true);
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setShowJobForm(true);
    setSelectedJob(null);
  };

  const handleJobAction = (job: Job, action: 'timer' | 'calendar' | 'edit' | 'statistics' | 'delete') => {
    if (action === 'statistics') {
      setSelectedJobForStats(job);
      setShowStatistics(true);
      setSelectedJob(null);
      return;
    }

    if (action === 'delete') {
      Alert.alert(
        'Eliminar trabajo',
        `¿Estás seguro de que quieres eliminar "${job.name}"? Esto también eliminará todos los registros de tiempo asociados.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                await JobService.deleteJob(job.id);
                await loadJobs();
                setSelectedJob(null);
                Alert.alert('Éxito', 'Trabajo eliminado correctamente');
              } catch (error) {
                console.error('Error deleting job:', error);
                Alert.alert('Error', 'No se pudo eliminar el trabajo');
              }
            },
          },
        ]
      );
      return;
    }
    
    setSelectedJob(null);
    
    switch (action) {
      case 'timer':
        navigateTo('timer', job);
        break;
      case 'calendar':
        navigateTo('calendar', job);
        break;
      case 'edit':
        handleEditJob(job);
        break;
    }
  };

  const handleJobFormSave = async () => {
    await loadJobs();
    setShowJobForm(false);
    setEditingJob(null);
  };

  const handleJobPress = (job: Job) => {
    // Navigate to job location if it has coordinates
    if (job.location?.latitude && job.location?.longitude && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: job.location.latitude,
        longitude: job.location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
    
    // Open action modal
    setSelectedJob(job);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
      >
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          title="Estás aquí"
          pinColor={Theme.colors.primary}
        />
        
        {/* Job location markers */}
        {jobs.map((job) => 
          job.location?.latitude && job.location?.longitude ? (
            <Marker
              key={job.id}
              coordinate={{
                latitude: job.location.latitude,
                longitude: job.location.longitude,
              }}
              title={job.name}
              description={job.location.address}
              pinColor={job.color}
              onPress={() => handleJobPress(job)}
            />
          ) : null
        )}
        
      </MapView>

      {/* Simple info overlay */}
      {jobs.length === 0 && (
        <View style={styles.overlay}>
          <View style={styles.centeredContent}>
            <TouchableOpacity
              style={styles.mainActionCard}
              onPress={handleAddJob}
            >
              <BlurView intensity={90} tint="light" style={styles.mainActionCardInner}>
                <View style={[styles.mainActionIcon, styles.successIconBg]}>
                  <IconSymbol size={32} name="plus" color={Theme.colors.success} />
                </View>
                <Text style={styles.mainActionTitle}>Agregar Trabajo</Text>
                <Text style={styles.mainActionDescription}>
                  Configura tu primer trabajo para comenzar
                </Text>
              </BlurView>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Job buttons overlay */}
      {jobs.length > 0 && (
        <View style={styles.jobButtonsOverlay}>
          <View style={styles.jobButtonsContainer}>
            {jobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobButton}
                onPress={() => handleJobPress(job)}
              >
                <BlurView intensity={90} tint="light" style={styles.jobButtonInner}>
                  <View style={[styles.jobButtonColorDot, { backgroundColor: job.color }]} />
                  <Text style={styles.jobButtonText} numberOfLines={1}>
                    {job.name}
                  </Text>
                  <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
                </BlurView>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Job action modal */}
      {selectedJob && (
        <View style={styles.actionModal}>
          <TouchableOpacity 
            style={styles.actionModalBackdrop}
            onPress={() => setSelectedJob(null)}
          />
          <BlurView intensity={95} tint="light" style={styles.actionModalContent}>
            <View style={styles.actionModalHeader}>
              <View style={[styles.actionModalColorDot, { backgroundColor: selectedJob.color }]} />
              <View style={styles.actionModalInfo}>
                <Text style={styles.actionModalTitle}>{selectedJob.name}</Text>
                {selectedJob.company && (
                  <Text style={styles.actionModalSubtitle}>{selectedJob.company}</Text>
                )}
              </View>
            </View>

            <View style={styles.actionModalButtons}>
              <TouchableOpacity
                style={[styles.actionModalButton, styles.successButtonBg]}
                onPress={() => handleJobAction(selectedJob, 'timer')}
              >
                <IconSymbol size={24} name="clock.fill" color={Theme.colors.success} />
                <Text style={styles.actionModalButtonText}>
                  Iniciar Timer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionModalButton, styles.primaryButtonBg]}
                onPress={() => handleJobAction(selectedJob, 'calendar')}
              >
                <IconSymbol size={24} name="calendar" color={Theme.colors.primary} />
                <Text style={styles.actionModalButtonText}>
                  Ver Calendario
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionModalButton, styles.warningButtonBg]}
                onPress={() => handleJobAction(selectedJob, 'statistics')}
              >
                <IconSymbol size={24} name="chart.bar.fill" color={Theme.colors.warning} />
                <Text style={styles.actionModalButtonText}>
                  Ver Estadísticas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionModalButton, styles.secondaryButtonBg]}
                onPress={() => handleJobAction(selectedJob, 'edit')}
              >
                <IconSymbol size={24} name="gear" color={Theme.colors.textSecondary} />
                <Text style={styles.actionModalButtonText}>
                  Editar Trabajo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionModalButton, styles.errorButtonBg]}
                onPress={() => handleJobAction(selectedJob, 'delete')}
              >
                <IconSymbol size={24} name="trash.fill" color={Theme.colors.error} />
                <Text style={styles.actionModalButtonText}>
                  Eliminar Trabajo
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.actionModalCancelButton}
              onPress={() => setSelectedJob(null)}
            >
              <Text style={styles.actionModalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingAddButton} onPress={handleAddJob}>
        <View style={styles.floatingAddButtonInner}>
          <IconSymbol size={28} name="plus" color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* Job Form Modal */}
      <JobFormModal
        visible={showJobForm}
        editingJob={editingJob}
        onClose={() => {
          setShowJobForm(false);
          setEditingJob(null);
        }}
        onSave={handleJobFormSave}
      />
      
      {/* Job Statistics Modal */}
      <JobStatisticsModal
        visible={showStatistics}
        onClose={() => {
          setShowStatistics(false);
          setSelectedJobForStats(null);
        }}
        job={selectedJobForStats}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  centeredContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  mainActionCard: {
    width: 280,
    pointerEvents: 'auto',
  },
  mainActionCardInner: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    
    position: 'relative',
  },
  mainActionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  mainActionTitle: {
    fontSize: 20,
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  mainActionDescription: {
    fontSize: 16,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  mainActionBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: Theme.colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainActionBadgeText: {
    
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  // New simple info overlay styles
  infoOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    pointerEvents: 'none',
  },
  infoCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: Theme.colors.text,
    fontWeight: '500',
  },
  // Job buttons overlay styles
  jobButtonsOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    bottom: 120,
  },
  jobButtonsContainer: {
    gap: 12,
  },
  jobButton: {
    marginBottom: 8,
  },
  jobButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    
  },
  jobButtonColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  jobButtonText: {
    fontSize: 16,
    color: Theme.colors.text,
    fontWeight: '600',
    flex: 1,
  },
  // Jobs overlay styles
  jobsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  jobsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  jobsTitle: {
    fontSize: 18,
    color: Theme.colors.text,
    fontWeight: '600',
  },
  closeOverlayButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  jobsList: {
    maxHeight: '60%',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  jobMapCard: {
    marginBottom: 12,
  },
  jobMapCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Theme.colors.separator,
    
  },
  jobMapInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobMapActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  jobMapEditButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  jobMapColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  jobMapDetails: {
    flex: 1,
  },
  jobMapName: {
    fontSize: 16,
    color: Theme.colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  jobMapCompany: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    marginBottom: 2,
  },
  jobMapAddress: {
    fontSize: 12,
    color: Theme.colors.textTertiary,
  },
  // Action modal styles
  actionModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  actionModalContent: {
    borderRadius: 16,
    margin: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    
    minWidth: 280,
  },
  actionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  actionModalColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  actionModalInfo: {
    flex: 1,
  },
  actionModalTitle: {
    fontSize: 18,
    color: Theme.colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionModalSubtitle: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
  },
  actionModalButtons: {
    gap: 12,
    marginBottom: 16,
  },
  actionModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  actionModalButtonText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  actionModalCancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  actionModalCancelText: {
    fontSize: 16,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  // Floating button styles
  floatingAddButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 8,
    shadowColor: Theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingAddButtonInner: {
    flex: 1,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  successIconBg: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },
  successButtonBg: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  primaryButtonBg: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  warningButtonBg: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
  },
  secondaryButtonBg: {
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
  },
  errorButtonBg: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
});
