import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import JobsManagementScreen from './JobsManagementScreen';
import { useBackNavigation } from '../context/NavigationContext';
import { Job } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import JobFormModal from '../components/JobFormModal';
import JobSelectorModal from '../components/JobSelectorModal';
import WelcomeModal from '../components/WelcomeModal';
import { Theme } from '../constants/Theme';

interface SettingsScreenProps {
  onNavigate: (screen: string) => void;
}

export default function SettingsScreen({ onNavigate }: SettingsScreenProps) {
  const [showJobsManagement, setShowJobsManagement] = useState(false);
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [selectedEditType, setSelectedEditType] = useState<'schedule' | 'location' | 'financial' | 'billing'>('schedule');
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const { handleBack } = useBackNavigation();

  const handleEditCategory = (category: 'schedule' | 'location' | 'financial' | 'billing') => {
    setSelectedEditType(category);
    setShowJobSelector(true);
  };

  const handleJobSelect = (job: Job) => {
    setEditingJob(job);
    setShowJobForm(true);
  };

  const handleJobFormSave = () => {
    setShowJobForm(false);
    setEditingJob(null);
  };

  const getEditInfo = (type: string) => {
    switch (type) {
      case 'schedule':
        return {
          title: 'Editar Horarios',
          subtitle: 'Selecciona un trabajo para configurar horarios, días laborables y descansos',
          tab: 'schedule' as const,
        };
      case 'location':
        return {
          title: 'Editar Ubicaciones',
          subtitle: 'Selecciona un trabajo para configurar su ubicación y geofencing',
          tab: 'billing' as const,
        };
      case 'financial':
        return {
          title: 'Editar Tarifas y Sueldos',
          subtitle: 'Selecciona un trabajo para configurar salarios y tarifas por hora',
          tab: 'financial' as const,
        };
      case 'billing':
        return {
          title: 'Editar Facturación',
          subtitle: 'Selecciona un trabajo para configurar la facturación automática',
          tab: 'billing' as const,
        };
      default:
        return {
          title: 'Editar Trabajo',
          subtitle: 'Selecciona un trabajo para editar',
          tab: 'basic' as const,
        };
    }
  };

  if (showJobsManagement) {
    return (
      <JobsManagementScreen onClose={() => setShowJobsManagement(false)} />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: Theme.colors.border }]}>
        <View style={styles.headerContent}>
          <View style={styles.placeholder} />
          <View style={styles.headerText}>
            <View style={styles.titleContainer}>
              <IconSymbol size={20} name="gear" color={Theme.colors.primary} />
              <Text style={styles.headerTitle}>Configuración</Text>
            </View>
            <Text style={styles.headerSubtitle}>Gestión de trabajos y preferencias</Text>
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
        {/* Jobs Management Section */}
        <BlurView 
          intensity={95} 
          tint="light" 
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Gestión de Trabajos</Text>
          <Text style={styles.sectionDescription}>
            Configura tus trabajos con horarios, tarifas y facturación
          </Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowJobsManagement(true)}
          >
            <View style={[styles.settingIcon, styles.primaryIconBg]}>
              <IconSymbol size={24} name="chart.bar.fill" color={Theme.colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Mis Trabajos</Text>
              <Text style={styles.settingDescription}>Agregar, editar y configurar trabajos</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        </BlurView>

        {/* Work Configuration Section */}
        <BlurView 
          intensity={95} 
          tint="light" 
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Configuración Laboral</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => handleEditCategory('schedule')}
          >
            <View style={[styles.settingIcon, styles.successIconBg]}>
              <IconSymbol size={24} name="clock.fill" color={Theme.colors.success} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Horarios Estándar</Text>
              <Text style={styles.settingDescription}>Configurar horarios por defecto</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => handleEditCategory('location')}
          >
            <View style={[styles.settingIcon, styles.warningIconBg]}>
              <IconSymbol size={24} name="location.fill" color={Theme.colors.warning} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Ubicaciones de Trabajo</Text>
              <Text style={styles.settingDescription}>Gestionar sitios y geofencing</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        </BlurView>

        {/* Financial Configuration Section */}
        <BlurView 
          intensity={95} 
          tint="light" 
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Configuración Financiera</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => handleEditCategory('financial')}
          >
            <View style={[styles.settingIcon, styles.successIconBg]}>
              <IconSymbol size={24} name="dollarsign.circle.fill" color={Theme.colors.success} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Tarifas y Sueldos</Text>
              <Text style={styles.settingDescription}>Configurar precios por hora y salarios</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => handleEditCategory('billing')}
          >
            <View style={[styles.settingIcon, styles.primaryIconBg]}>
              <IconSymbol size={24} name="chart.bar.fill" color={Theme.colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Facturación</Text>
              <Text style={styles.settingDescription}>Configurar facturación automática</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        </BlurView>

        {/* App Configuration Section */}
        <BlurView 
          intensity={95} 
          tint="light" 
          style={styles.sectionCard}
        >
          <Text style={styles.sectionTitle}>Configuración de la App</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
          >
            <View style={[styles.settingIcon, styles.secondaryIconBg]}>
              <IconSymbol size={24} name="gear" color={Theme.colors.textSecondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Preferencias Generales</Text>
              <Text style={styles.settingDescription}>Notificaciones, idioma, tema</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowWelcomeModal(true)}
          >
            <View style={[styles.settingIcon, styles.primaryIconBg]}>
              <IconSymbol size={24} name="lightbulb.fill" color={Theme.colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Cómo Funciona</Text>
              <Text style={styles.settingDescription}>Tutorial y guía de uso</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={[styles.settingIcon, styles.errorIconBg]}>
              <IconSymbol size={24} name="questionmark.circle" color={Theme.colors.error} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Ayuda y Soporte</Text>
              <Text style={styles.settingDescription}>FAQ, contacto, términos</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        </BlurView>

        {/* Quick Stats */}
        <BlurView 
          intensity={95} 
          tint="light" 
          style={styles.statsCard}
        >
          <Text style={styles.statsTitle}>Resumen Rápido</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <IconSymbol size={20} name="chart.bar.fill" color={Theme.colors.primary} />
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>Trabajos activos</Text>
            </View>
            <View style={styles.statItem}>
              <IconSymbol size={20} name="clock.fill" color={Theme.colors.success} />
              <Text style={styles.statNumber}>168h</Text>
              <Text style={styles.statLabel}>Este mes</Text>
            </View>
            <View style={styles.statItem}>
              <IconSymbol size={20} name="dollarsign.circle.fill" color={Theme.colors.warning} />
              <Text style={styles.statNumber}>€2,520</Text>
              <Text style={styles.statLabel}>Ingresos</Text>
            </View>
          </View>
        </BlurView>
      </ScrollView>

      {/* Job Selector Modal */}
      <JobSelectorModal
        visible={showJobSelector}
        onClose={() => setShowJobSelector(false)}
        onJobSelect={handleJobSelect}
        title={getEditInfo(selectedEditType).title}
        subtitle={getEditInfo(selectedEditType).subtitle}
      />

      {/* Job Form Modal */}
      <JobFormModal
        visible={showJobForm}
        editingJob={editingJob}
        onClose={() => {
          setShowJobForm(false);
          setEditingJob(null);
        }}
        onSave={handleJobFormSave}
        initialTab={getEditInfo(selectedEditType).tab}
      />

      {/* Welcome Modal */}
      <WelcomeModal
        visible={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />

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
    marginLeft: -8,
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
  sectionCard: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    color: Theme.colors.text,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 18,
    color: Theme.colors.textSecondary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    marginBottom: 2,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  settingDescription: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
  },
  statsCard: {
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
  statsTitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    color: Theme.colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    marginTop: 4,
    marginBottom: 2,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: Theme.colors.textSecondary,
  },
  primaryIconBg: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  successIconBg: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  warningIconBg: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
  },
  secondaryIconBg: {
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
  },
  errorIconBg: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
});