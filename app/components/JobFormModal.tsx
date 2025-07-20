import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { BlurView } from 'expo-blur';
import { Job, DEFAULT_COLORS } from '../types/WorkTypes';
import { JobService } from '../services/JobService';

interface JobFormModalProps {
  visible: boolean;
  onClose: () => void;
  editingJob?: Job | null;
  onSave: () => void;
  initialTab?: 'basic' | 'schedule' | 'financial' | 'billing';
}

export default function JobFormModal({ visible, onClose, editingJob, onSave, initialTab = 'basic' }: JobFormModalProps) {
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [formData, setFormData] = useState<Partial<Job>>({
    name: '',
    company: '',
    address: '',
    hourlyRate: 0,
    currency: 'EUR',
    color: DEFAULT_COLORS[0],
    defaultHours: 8,
    isActive: true,
    description: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    salary: {
      type: 'hourly',
      amount: 0,
      currency: 'EUR',
    },
    schedule: {
      startTime: '09:00',
      endTime: '17:00',
      workDays: [1, 2, 3, 4, 5], // Monday to Friday
      breakTime: 60,
    },
    billing: {
      enabled: false,
      invoicePrefix: 'INV',
      taxRate: 21,
      notes: '',
    },
    location: {
      address: '',
      radius: 100,
    },
  });

  const [currentTab, setCurrentTab] = useState<'basic' | 'schedule' | 'financial' | 'billing'>(initialTab);

  useEffect(() => {
    if (visible) {
      setCurrentTab(initialTab);
    }
  }, [visible, initialTab]);

  useEffect(() => {
    if (editingJob) {
      setFormData({
        ...editingJob,
        salary: editingJob.salary || {
          type: 'hourly',
          amount: editingJob.hourlyRate || 0,
          currency: editingJob.currency || 'EUR',
        },
        schedule: editingJob.schedule || {
          startTime: '09:00',
          endTime: '17:00',
          workDays: [1, 2, 3, 4, 5],
          breakTime: 60,
        },
        billing: editingJob.billing || {
          enabled: false,
          invoicePrefix: 'INV',
          taxRate: 21,
          notes: '',
        },
        location: editingJob.location || {
          address: editingJob.address || '',
          radius: 100,
        },
      });
    } else {
      setFormData({
        name: '',
        company: '',
        address: '',
        hourlyRate: 0,
        currency: 'EUR',
        color: DEFAULT_COLORS[0],
        defaultHours: 8,
        isActive: true,
        description: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        salary: {
          type: 'hourly',
          amount: 0,
          currency: 'EUR',
        },
        schedule: {
          startTime: '09:00',
          endTime: '17:00',
          workDays: [1, 2, 3, 4, 5],
          breakTime: 60,
        },
        billing: {
          enabled: false,
          invoicePrefix: 'INV',
          taxRate: 21,
          notes: '',
        },
        location: {
          address: '',
          radius: 100,
        },
      });
    }
  }, [editingJob, visible]);

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      Alert.alert('Error', 'El nombre del trabajo es obligatorio');
      return;
    }

    try {
      const jobData: Omit<Job, 'id' | 'createdAt'> = {
        name: formData.name.trim(),
        company: formData.company?.trim() || '',
        address: formData.address?.trim() || '',
        hourlyRate: Number(formData.hourlyRate) || 0,
        currency: formData.currency || 'EUR',
        color: formData.color || DEFAULT_COLORS[0],
        defaultHours: Number(formData.defaultHours) || 8,
        isActive: formData.isActive ?? true,
        description: formData.description?.trim() || '',
        contactPerson: formData.contactPerson?.trim() || '',
        contactEmail: formData.contactEmail?.trim() || '',
        contactPhone: formData.contactPhone?.trim() || '',
        salary: formData.salary,
        schedule: formData.schedule,
        billing: formData.billing,
        location: formData.location,
      };

      if (editingJob) {
        await JobService.updateJob(editingJob.id, jobData);
      } else {
        await JobService.addJob(jobData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving job:', error);
      Alert.alert('Error', 'No se pudo guardar el trabajo');
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedData = (section: string, field: string, value: any) => {
    setFormData(prev => {
      const sectionData = prev[section as keyof typeof prev] || {};
      return {
        ...prev,
        [section]: {
          ...(typeof sectionData === 'object' ? sectionData : {}),
          [field]: value,
        },
      };
    });
  };

  const detectCurrentLocation = async () => {
    setIsDetectingLocation(true);
    
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Necesitamos acceso a tu ubicación para detectar la dirección automáticamente.',
          [{ text: 'OK' }]
        );
        setIsDetectingLocation(false);
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Reverse geocode to get address
      const [addressData] = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (addressData) {
        // Build address string
        const addressParts = [];
        if (addressData.name) addressParts.push(addressData.name);
        if (addressData.street) addressParts.push(addressData.street);
        if (addressData.streetNumber) addressParts.push(addressData.streetNumber);
        if (addressData.city) addressParts.push(addressData.city);
        if (addressData.region) addressParts.push(addressData.region);
        if (addressData.country) addressParts.push(addressData.country);

        const detectedAddress = addressParts.join(', ');

        // Update form data
        updateFormData('address', detectedAddress);
        updateNestedData('location', 'address', detectedAddress);
        updateNestedData('location', 'latitude', currentLocation.coords.latitude);
        updateNestedData('location', 'longitude', currentLocation.coords.longitude);

        Alert.alert(
          'Ubicación detectada',
          `Se ha detectado la dirección: ${detectedAddress}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          'No se pudo obtener la dirección de tu ubicación actual.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error detecting location:', error);
      Alert.alert(
        'Error',
        'No se pudo detectar tu ubicación. Verifica que tengas GPS activado.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const toggleWorkDay = (day: number) => {
    const schedule = formData.schedule!;
    const workDays = schedule.workDays || [];
    const newWorkDays = workDays.includes(day)
      ? workDays.filter(d => d !== day)
      : [...workDays, day].sort();
    
    updateNestedData('schedule', 'workDays', newWorkDays);
  };

  const renderBasicTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <BlurView intensity={95} tint="light" style={styles.section}>
        <Text style={styles.sectionTitle}>Información Básica</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre del trabajo *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            placeholder="Ej: Desarrollador Frontend"
            placeholderTextColor={Theme.colors.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Empresa</Text>
          <TextInput
            style={styles.input}
            value={formData.company}
            onChangeText={(value) => updateFormData('company', value)}
            placeholder="Ej: Tech Solutions S.L."
            placeholderTextColor={Theme.colors.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dirección</Text>
          <View style={styles.addressInputContainer}>
            <TextInput
              style={[styles.input, styles.addressInput]}
              value={formData.address}
              onChangeText={(value) => updateFormData('address', value)}
              placeholder="Ej: Calle Mayor 123, Madrid"
              placeholderTextColor={Theme.colors.textTertiary}
            />
            <TouchableOpacity
              style={[
                styles.detectLocationButton,
                isDetectingLocation && styles.detectLocationButtonLoading
              ]}
              onPress={detectCurrentLocation}
              disabled={isDetectingLocation}
            >
              <IconSymbol 
                size={20} 
                name={isDetectingLocation ? "gear" : "location.fill"} 
                color={isDetectingLocation ? Theme.colors.textSecondary : Theme.colors.primary} 
              />
              {!isDetectingLocation && (
                <Text style={styles.detectLocationText}>Detectar</Text>
              )}
            </TouchableOpacity>
          </View>
          {isDetectingLocation && (
            <Text style={styles.detectingText}>
              Detectando tu ubicación actual...
            </Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(value) => updateFormData('description', value)}
            placeholder="Describe las responsabilidades del trabajo..."
            placeholderTextColor={Theme.colors.textTertiary}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Color identificativo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
            {DEFAULT_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  formData.color === color && styles.colorOptionSelected,
                ]}
                onPress={() => updateFormData('color', color)}
              >
                {formData.color === color && (
                  <IconSymbol size={16} name="checkmark" color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Trabajo activo</Text>
            <Switch
              value={formData.isActive}
              onValueChange={(value) => updateFormData('isActive', value)}
              trackColor={{ false: Theme.colors.separator, true: Theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </BlurView>

      <BlurView intensity={95} tint="light" style={styles.section}>
        <Text style={styles.sectionTitle}>Contacto</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Persona de contacto</Text>
          <TextInput
            style={styles.input}
            value={formData.contactPerson}
            onChangeText={(value) => updateFormData('contactPerson', value)}
            placeholder="Ej: Ana García"
            placeholderTextColor={Theme.colors.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.contactEmail}
            onChangeText={(value) => updateFormData('contactEmail', value)}
            placeholder="ana.garcia@empresa.com"
            placeholderTextColor={Theme.colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            value={formData.contactPhone}
            onChangeText={(value) => updateFormData('contactPhone', value)}
            placeholder="+34 600 123 456"
            placeholderTextColor={Theme.colors.textTertiary}
            keyboardType="phone-pad"
          />
        </View>
      </BlurView>
    </ScrollView>
  );

  const renderScheduleTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <BlurView intensity={95} tint="light" style={styles.section}>
        <Text style={styles.sectionTitle}>Horario Estándar</Text>
        
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hora de inicio</Text>
            <TextInput
              style={styles.input}
              value={formData.schedule?.startTime}
              onChangeText={(value) => updateNestedData('schedule', 'startTime', value)}
              placeholder="09:00"
              placeholderTextColor={Theme.colors.textTertiary}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hora de fin</Text>
            <TextInput
              style={styles.input}
              value={formData.schedule?.endTime}
              onChangeText={(value) => updateNestedData('schedule', 'endTime', value)}
              placeholder="17:00"
              placeholderTextColor={Theme.colors.textTertiary}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Horas por defecto</Text>
          <TextInput
            style={styles.input}
            value={String(formData.defaultHours)}
            onChangeText={(value) => updateFormData('defaultHours', Number(value) || 0)}
            placeholder="8"
            placeholderTextColor={Theme.colors.textTertiary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tiempo de descanso (minutos)</Text>
          <TextInput
            style={styles.input}
            value={String(formData.schedule?.breakTime || 0)}
            onChangeText={(value) => updateNestedData('schedule', 'breakTime', Number(value) || 0)}
            placeholder="60"
            placeholderTextColor={Theme.colors.textTertiary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Días laborables</Text>
          <View style={styles.workDaysContainer}>
            {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.workDayButton,
                  formData.schedule?.workDays?.includes(index) && styles.workDayButtonActive,
                ]}
                onPress={() => toggleWorkDay(index)}
              >
                <Text
                  style={[
                    styles.workDayText,
                    formData.schedule?.workDays?.includes(index) && styles.workDayTextActive,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </BlurView>
    </ScrollView>
  );

  const renderFinancialTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <BlurView intensity={95} tint="light" style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración Salarial</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tipo de sueldo</Text>
          <View style={styles.segmentedControl}>
            {[
              { key: 'hourly', label: 'Por hora' },
              { key: 'monthly', label: 'Mensual' },
              { key: 'annual', label: 'Anual' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.segmentButton,
                  formData.salary?.type === option.key && styles.segmentButtonActive,
                ]}
                onPress={() => updateNestedData('salary', 'type', option.key)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    formData.salary?.type === option.key && styles.segmentTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cantidad</Text>
            <TextInput
              style={styles.input}
              value={String(formData.salary?.amount || 0)}
              onChangeText={(value) => updateNestedData('salary', 'amount', Number(value) || 0)}
              placeholder="0"
              placeholderTextColor={Theme.colors.textTertiary}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Moneda</Text>
            <TextInput
              style={styles.input}
              value={formData.salary?.currency}
              onChangeText={(value) => updateNestedData('salary', 'currency', value)}
              placeholder="EUR"
              placeholderTextColor={Theme.colors.textTertiary}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tarifa por hora (para facturación)</Text>
          <TextInput
            style={styles.input}
            value={String(formData.hourlyRate || 0)}
            onChangeText={(value) => updateFormData('hourlyRate', Number(value) || 0)}
            placeholder="0"
            placeholderTextColor={Theme.colors.textTertiary}
            keyboardType="numeric"
          />
        </View>
      </BlurView>
    </ScrollView>
  );

  const renderBillingTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <BlurView intensity={95} tint="light" style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración de Facturación</Text>
        
        <View style={styles.inputGroup}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Facturación habilitada</Text>
            <Switch
              value={formData.billing?.enabled}
              onValueChange={(value) => updateNestedData('billing', 'enabled', value)}
              trackColor={{ false: Theme.colors.separator, true: Theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {formData.billing?.enabled && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Prefijo de factura</Text>
              <TextInput
                style={styles.input}
                value={formData.billing?.invoicePrefix}
                onChangeText={(value) => updateNestedData('billing', 'invoicePrefix', value)}
                placeholder="INV"
                placeholderTextColor={Theme.colors.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tasa de impuestos (%)</Text>
              <TextInput
                style={styles.input}
                value={String(formData.billing?.taxRate || 0)}
                onChangeText={(value) => updateNestedData('billing', 'taxRate', Number(value) || 0)}
                placeholder="21"
                placeholderTextColor={Theme.colors.textTertiary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notas para facturación</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.billing?.notes}
                onChangeText={(value) => updateNestedData('billing', 'notes', value)}
                placeholder="Términos de pago, información adicional..."
                placeholderTextColor={Theme.colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>
          </>
        )}
      </BlurView>

      <BlurView intensity={95} tint="light" style={styles.section}>
        <Text style={styles.sectionTitle}>Geolocalización</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dirección específica</Text>
          <View style={styles.addressInputContainer}>
            <TextInput
              style={[styles.input, styles.addressInput]}
              value={formData.location?.address}
              onChangeText={(value) => updateNestedData('location', 'address', value)}
              placeholder="Dirección exacta del trabajo"
              placeholderTextColor={Theme.colors.textTertiary}
            />
            <TouchableOpacity
              style={[
                styles.detectLocationButton,
                isDetectingLocation && styles.detectLocationButtonLoading
              ]}
              onPress={detectCurrentLocation}
              disabled={isDetectingLocation}
            >
              <IconSymbol 
                size={20} 
                name={isDetectingLocation ? "gear" : "location.fill"} 
                color={isDetectingLocation ? Theme.colors.textSecondary : Theme.colors.success} 
              />
              {!isDetectingLocation && (
                <Text style={[styles.detectLocationText, { color: Theme.colors.success }]}>GPS</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Radio de geofencing (metros)</Text>
          <TextInput
            style={styles.input}
            value={String(formData.location?.radius || 100)}
            onChangeText={(value) => updateNestedData('location', 'radius', Number(value) || 100)}
            placeholder="100"
            placeholderTextColor={Theme.colors.textTertiary}
            keyboardType="numeric"
          />
        </View>
      </BlurView>
    </ScrollView>
  );

  const tabs = [
    { key: 'basic', label: 'Básico', icon: 'gear' },
    { key: 'schedule', label: 'Horario', icon: 'clock.fill' },
    { key: 'financial', label: 'Financiero', icon: 'dollarsign.circle.fill' },
    { key: 'billing', label: 'Facturación', icon: 'chart.bar.fill' },
  ] as const;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol size={24} name="xmark" color={Theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editingJob ? 'Editar Trabajo' : 'Nuevo Trabajo'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Guardar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  currentTab === tab.key && styles.tabActive,
                ]}
                onPress={() => setCurrentTab(tab.key)}
              >
                <IconSymbol
                  size={20}
                  name={tab.icon as any}
                  color={currentTab === tab.key ? Theme.colors.primary : Theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabText,
                    currentTab === tab.key && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.content}>
          {currentTab === 'basic' && renderBasicTab()}
          {currentTab === 'schedule' && renderScheduleTab()}
          {currentTab === 'financial' && renderFinancialTab()}
          {currentTab === 'billing' && renderBillingTab()}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.separator,
  },
  closeButton: {
    padding: Theme.spacing.sm,
  },
  headerTitle: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.md,
  },
  saveButtonText: {
    ...Theme.typography.footnote,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.separator,
    backgroundColor: Theme.colors.surface,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    marginHorizontal: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.md,
  },
  tabActive: {
    backgroundColor: `${Theme.colors.primary}15`,
  },
  tabText: {
    ...Theme.typography.footnote,
    color: Theme.colors.textSecondary,
    marginLeft: Theme.spacing.xs,
  },
  tabTextActive: {
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: Theme.spacing.md,
  },
  section: {
    marginBottom: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.small,
  },
  sectionTitle: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    ...Theme.typography.footnote,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
    fontWeight: '600',
  },
  input: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.separator,
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  addressInput: {
    flex: 1,
  },
  detectLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: `${Theme.colors.primary}15`,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: `${Theme.colors.primary}30`,
    minWidth: 80,
    justifyContent: 'center',
  },
  detectLocationButtonLoading: {
    backgroundColor: `${Theme.colors.textSecondary}15`,
    borderColor: `${Theme.colors.textSecondary}30`,
  },
  detectLocationText: {
    ...Theme.typography.footnote,
    color: Theme.colors.primary,
    marginLeft: Theme.spacing.xs,
    fontWeight: '600',
  },
  detectingText: {
    ...Theme.typography.caption2,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.xs,
    fontStyle: 'italic',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorPicker: {
    flexDirection: 'row',
    marginTop: Theme.spacing.xs,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.1 }],
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.separator,
    borderRadius: Theme.borderRadius.md,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    ...Theme.shadows.small,
  },
  segmentText: {
    ...Theme.typography.footnote,
    color: Theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: Theme.colors.text,
    fontWeight: '600',
  },
  workDaysContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.xs,
  },
  workDayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.separator,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workDayButtonActive: {
    backgroundColor: Theme.colors.primary,
  },
  workDayText: {
    ...Theme.typography.footnote,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  workDayTextActive: {
    color: '#FFFFFF',
  },
});