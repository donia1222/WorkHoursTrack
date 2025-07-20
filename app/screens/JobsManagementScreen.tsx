import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { BlurView } from 'expo-blur';
import { Job, DEFAULT_COLORS } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import JobFormModal from '../components/JobFormModal';

interface JobsManagementScreenProps {
  onNavigate?: (screen: string) => void;
  onClose?: () => void;
}

export default function JobsManagementScreen({ onNavigate, onClose }: JobsManagementScreenProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const loadedJobs = await JobService.getJobs();
      setJobs(loadedJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const handleAddJob = () => {
    setEditingJob(null);
    setShowAddModal(true);
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setShowAddModal(true);
  };

  const handleDeleteJob = (job: Job) => {
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
              Alert.alert('Éxito', 'Trabajo eliminado correctamente');
            } catch (error) {
              console.error('Error deleting job:', error);
              Alert.alert('Error', 'No se pudo eliminar el trabajo');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (job: Job) => {
    try {
      await JobService.updateJob(job.id, { isActive: !job.isActive });
      await loadJobs();
    } catch (error) {
      console.error('Error toggling job status:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado del trabajo');
    }
  };

  const activeJobs = jobs.filter(job => job.isActive);
  const inactiveJobs = jobs.filter(job => !job.isActive);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={handleAddJob}
            style={styles.addButton}
          >
            <IconSymbol size={24} name="plus" color={Theme.colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <View style={styles.titleContainer}>
              <IconSymbol size={20} name="briefcase.fill" color={Theme.colors.primary} />
              <Text style={styles.headerTitle}>Mis Trabajos</Text>
            </View>
            <Text style={styles.headerSubtitle}>Gestiona tus trabajos y proyectos</Text>
          </View>
          <TouchableOpacity 
            onPress={onClose}
            style={styles.closeButton}
          >
            <IconSymbol size={24} name="xmark" color={Theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trabajos activos ({activeJobs.length})</Text>
          {activeJobs.length > 0 ? (
            activeJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onEdit={() => handleEditJob(job)}
                onDelete={() => handleDeleteJob(job)}
                onToggleActive={() => handleToggleActive(job)}
              />
            ))
          ) : (
            <BlurView intensity={95} tint="light" style={styles.emptyCard}>
              <IconSymbol size={32} name="calendar" color={Theme.colors.textTertiary} />
              <Text style={styles.emptyText}>No tienes trabajos activos</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleAddJob}>
                <Text style={styles.emptyButtonText}>Agregar trabajo</Text>
              </TouchableOpacity>
            </BlurView>
          )}
        </View>

        {/* Inactive jobs */}
        {inactiveJobs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trabajos inactivos ({inactiveJobs.length})</Text>
            {inactiveJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onEdit={() => handleEditJob(job)}
                onDelete={() => handleDeleteJob(job)}
                onToggleActive={() => handleToggleActive(job)}
                isInactive
              />
            ))}
          </View>
        )}
      </ScrollView>

      <JobFormModal
        visible={showAddModal}
        editingJob={editingJob}
        onClose={() => {
          setShowAddModal(false);
          setEditingJob(null);
        }}
        onSave={async () => {
          await loadJobs();
          setShowAddModal(false);
          setEditingJob(null);
        }}
      />
    </SafeAreaView>
  );
}

interface JobCardProps {
  job: Job;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isInactive?: boolean;
}

function JobCard({ job, onEdit, onDelete, onToggleActive, isInactive }: JobCardProps) {
  return (
    <BlurView intensity={95} tint="light" style={[styles.jobCard, isInactive && styles.inactiveCard]}>
      <View style={styles.jobCardHeader}>
        <View style={styles.jobInfo}>
          <View style={[styles.jobColorIndicator, { backgroundColor: job.color }]} />
          <View style={styles.jobMainInfo}>
            <Text style={[styles.jobName, isInactive && styles.inactiveText]}>{job.name}</Text>
            {job.company && (
              <Text style={[styles.jobCompany, isInactive && styles.inactiveText]}>{job.company}</Text>
            )}
          </View>
        </View>
        <View style={styles.jobActions}>
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <IconSymbol size={18} name="gear" color={Theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onToggleActive}>
            <IconSymbol 
              size={18} 
              name={isInactive ? "play.fill" : "pause.fill"} 
              color={isInactive ? Theme.colors.success : Theme.colors.warning} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
            <IconSymbol size={18} name="xmark" color={Theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.jobDetailRow}>
          <IconSymbol size={16} name="clock.fill" color={Theme.colors.textSecondary} />
          <Text style={styles.jobDetailText}>{job.defaultHours}h por defecto</Text>
        </View>
        
        {job.salary && job.salary.amount > 0 && (
          <View style={styles.jobDetailRow}>
            <IconSymbol size={16} name="dollarsign.circle.fill" color={Theme.colors.success} />
            <Text style={styles.jobDetailText}>
              {job.salary.amount} {job.salary.currency}/{job.salary.type === 'hourly' ? 'h' : job.salary.type === 'monthly' ? 'mes' : 'año'}
            </Text>
          </View>
        )}
        
        {job.schedule && (
          <View style={styles.jobDetailRow}>
            <IconSymbol size={16} name="clock.fill" color={Theme.colors.primary} />
            <Text style={styles.jobDetailText}>
              {job.schedule.startTime} - {job.schedule.endTime}
            </Text>
          </View>
        )}
        
        {job.billing?.enabled && (
          <View style={styles.jobDetailRow}>
            <IconSymbol size={16} name="chart.bar.fill" color={Theme.colors.warning} />
            <Text style={styles.jobDetailText}>Facturación habilitada</Text>
          </View>
        )}
        
        {job.hourlyRate && job.hourlyRate > 0 && (
          <View style={styles.jobDetailRow}>
            <IconSymbol size={16} name="chart.bar.fill" color={Theme.colors.textSecondary} />
            <Text style={styles.jobDetailText}>
              {job.hourlyRate} {job.currency || 'EUR'}/h (facturación)
            </Text>
          </View>
        )}
        
        {job.location?.address && (
          <View style={styles.jobDetailRow}>
            <IconSymbol size={16} name="location.fill" color={Theme.colors.textSecondary} />
            <Text style={styles.jobDetailText} numberOfLines={1}>{job.location.address}</Text>
          </View>
        )}
      </View>
    </BlurView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.separator,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
  },
  closeButton: {
    padding: Theme.spacing.sm,
    marginRight: -Theme.spacing.sm,
  },
  headerText: {
    flex: 1,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  headerTitle: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...Theme.typography.footnote,
    color: Theme.colors.textSecondary,
  },
  addButton: {
    padding: Theme.spacing.sm,
    marginLeft: -Theme.spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
  },
  section: {
    marginVertical: Theme.spacing.md,
  },
  sectionTitle: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
    fontWeight: '600',
  },
  jobCard: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.medium,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobColorIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: Theme.spacing.sm,
  },
  jobMainInfo: {
    flex: 1,
  },
  jobName: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  jobCompany: {
    ...Theme.typography.footnote,
    color: Theme.colors.textSecondary,
  },
  inactiveText: {
    opacity: 0.7,
  },
  jobActions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  actionButton: {
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  jobDetails: {
    gap: Theme.spacing.xs,
  },
  jobDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobDetailText: {
    ...Theme.typography.footnote,
    color: Theme.colors.textSecondary,
    marginLeft: Theme.spacing.xs,
    flex: 1,
  },
  emptyCard: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    ...Theme.shadows.medium,
  },
  emptyText: {
    ...Theme.typography.callout,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  emptyButton: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.md,
  },
  emptyButtonText: {
    ...Theme.typography.footnote,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});