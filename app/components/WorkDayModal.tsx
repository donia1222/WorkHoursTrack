import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { BlurView } from 'expo-blur';
import HourSelector from './HourSelector';
import JobSelector from './JobSelector';
import JobStatisticsModal from './JobStatisticsModal';
import { Job, WorkDay, DAY_TYPES } from '../types/WorkTypes';

interface WorkDayModalProps {
  visible: boolean;
  onClose: () => void;
  date: string;
  existingWorkDay?: WorkDay;
  jobs: Job[];
  preselectedJobId?: string;
  onSave: (workDay: Omit<WorkDay, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
}

export default function WorkDayModal({
  visible,
  onClose,
  date,
  existingWorkDay,
  jobs,
  preselectedJobId,
  onSave,
  onDelete,
}: WorkDayModalProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [hours, setHours] = useState<number>(8);
  const [notes, setNotes] = useState<string>('');
  const [dayType, setDayType] = useState<'work' | 'free' | 'vacation' | 'sick'>('work');
  const [showStatistics, setShowStatistics] = useState(false);

  useEffect(() => {
    if (existingWorkDay) {
      setSelectedJobId(existingWorkDay.jobId || '');
      setHours(existingWorkDay.hours);
      setNotes(existingWorkDay.notes || '');
      setDayType(existingWorkDay.type);
    } else {
      // Set preselected job if provided, otherwise use default
      if (preselectedJobId) {
        const preselectedJob = jobs.find(job => job.id === preselectedJobId);
        if (preselectedJob) {
          setSelectedJobId(preselectedJob.id);
          setHours(preselectedJob.defaultHours);
        }
      } else {
        // Set default job and hours
        const defaultJob = jobs.find(job => job.isActive) || jobs[0];
        if (defaultJob) {
          setSelectedJobId(defaultJob.id);
          setHours(defaultJob.defaultHours);
        }
      }
      setNotes('');
      setDayType('work');
    }
  }, [existingWorkDay, jobs, visible, preselectedJobId]);

  const handleSave = () => {
    if (dayType === 'work' && !selectedJobId) {
      Alert.alert('Error', 'Por favor selecciona un trabajo para días trabajados');
      return;
    }

    const workDay: Omit<WorkDay, 'id' | 'createdAt' | 'updatedAt'> = {
      date,
      jobId: dayType === 'work' ? selectedJobId : undefined,
      hours: dayType === 'work' ? hours : 0,
      notes: notes.trim(),
      overtime: dayType === 'work' && hours > 8,
      type: dayType,
    };

    onSave(workDay);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar día trabajado',
      '¿Estás seguro de que quieres eliminar este registro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => {
            onDelete?.();
            onClose();
          }
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const selectedJob = jobs.find(job => job.id === selectedJobId);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <BlurView intensity={95} tint="light" style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={handleSave}
              style={styles.saveButton}
            >
              <IconSymbol size={24} name="checkmark" color={Theme.colors.primary} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <View style={styles.titleContainer}>
                <IconSymbol size={20} name="calendar" color={Theme.colors.primary} />
                <Text style={styles.headerTitle}>
                  {existingWorkDay ? 'Editar día' : 'Registrar día'}
                </Text>
              </View>
              <Text style={styles.headerSubtitle}>
                {formatDate(date)}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.backButton}
            >
              <IconSymbol size={24} name="xmark" color={Theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </BlurView>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Day type selector */}
          <View style={styles.section}>
            <BlurView intensity={95} tint="light" style={styles.dayTypeContainer}>
              <Text style={styles.dayTypeTitle}>Tipo de día</Text>
              <View style={styles.dayTypeButtons}>
                {(Object.keys(DAY_TYPES) as Array<keyof typeof DAY_TYPES>).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.dayTypeButton,
                      dayType === type && [styles.dayTypeButtonActive, { backgroundColor: DAY_TYPES[type].color }]
                    ]}
                    onPress={() => setDayType(type)}
                  >
                    <IconSymbol 
                      size={20} 
                      name={DAY_TYPES[type].icon as any}
                      color={dayType === type ? '#FFFFFF' : DAY_TYPES[type].color} 
                    />
                    <Text 
                      style={[
                        styles.dayTypeButtonText,
                        dayType === type && styles.dayTypeButtonTextActive
                      ]}
                    >
                      {DAY_TYPES[type].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </BlurView>
          </View>

          {/* Job selector - only for work days */}
          {dayType === 'work' && (
            <View style={styles.section}>
              <JobSelector
                jobs={jobs}
                selectedJobId={selectedJobId}
                onJobSelect={setSelectedJobId}
                showAddButton={false}
              />
            </View>
          )}

          {/* Hour selector - only for work days */}
          {dayType === 'work' && (
            <View style={styles.section}>
              <HourSelector
                hours={hours}
                onHoursChange={setHours}
              />
            </View>
          )}

          <View style={styles.section}>
            <BlurView intensity={95} tint="light" style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notas (opcional)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Agrega detalles sobre este día de trabajo..."
                placeholderTextColor={Theme.colors.textTertiary}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.characterCount}>
                {notes.length}/200 caracteres
              </Text>
            </BlurView>
          </View>

          <View style={styles.section}>
            <BlurView intensity={95} tint="light" style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Resumen</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tipo:</Text>
                <View style={styles.summaryJobInfo}>
                  <View 
                    style={[
                      styles.summaryJobColor, 
                      { backgroundColor: DAY_TYPES[dayType].color }
                    ]} 
                  />
                  <Text style={styles.summaryValue}>{DAY_TYPES[dayType].label}</Text>
                </View>
              </View>
              {dayType === 'work' && selectedJob && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Trabajo:</Text>
                  <View style={styles.jobSummaryRow}>
                    <Text style={styles.summaryValue}>{selectedJob.name}</Text>
                    <TouchableOpacity 
                      style={styles.statsButton}
                      onPress={() => setShowStatistics(true)}
                    >
                      <IconSymbol size={16} name="chart.bar.fill" color={Theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {dayType === 'work' && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Horas:</Text>
                  <Text style={styles.summaryValue}>
                    {hours}h {hours > 8 && '(con overtime)'}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fecha:</Text>
                <Text style={styles.summaryValue}>
                  {formatDate(date)}
                </Text>
              </View>
            </BlurView>
          </View>

          {existingWorkDay && onDelete && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <BlurView intensity={90} tint="light" style={styles.deleteButtonInner}>
                  <IconSymbol size={20} name="xmark" color={Theme.colors.error} />
                  <Text style={styles.deleteButtonText}>Eliminar registro</Text>
                </BlurView>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      
      <JobStatisticsModal
        visible={showStatistics}
        onClose={() => setShowStatistics(false)}
        job={selectedJob || null}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
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
  backButton: {
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
    textTransform: 'capitalize',
  },
  saveButton: {
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
  notesContainer: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.medium,
  },
  notesLabel: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
  },
  notesInput: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Theme.colors.separator,
  },
  characterCount: {
    ...Theme.typography.caption2,
    color: Theme.colors.textTertiary,
    textAlign: 'right',
    marginTop: Theme.spacing.xs,
  },
  summaryContainer: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.medium,
  },
  summaryTitle: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  summaryLabel: {
    ...Theme.typography.callout,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    ...Theme.typography.callout,
    color: Theme.colors.text,
    fontWeight: '600',
  },
  summaryJobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryJobColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Theme.spacing.xs,
  },
  deleteButton: {
    marginBottom: Theme.spacing.xl,
  },
  deleteButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: `${Theme.colors.error}30`,
  },
  deleteButtonText: {
    ...Theme.typography.callout,
    color: Theme.colors.error,
    marginLeft: Theme.spacing.sm,
    fontWeight: '600',
  },
  dayTypeContainer: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.medium,
  },
  dayTypeTitle: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  dayTypeButtons: {
    gap: Theme.spacing.sm,
  },
  dayTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 2,
    borderColor: Theme.colors.separator,
  },
  dayTypeButtonActive: {
    borderColor: 'transparent',
  },
  dayTypeButtonText: {
    ...Theme.typography.callout,
    color: Theme.colors.text,
    marginLeft: Theme.spacing.sm,
    fontWeight: '600',
  },
  dayTypeButtonTextActive: {
    color: '#FFFFFF',
  },
  jobSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  statsButton: {
    padding: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});