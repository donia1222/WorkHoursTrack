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
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { BlurView } from 'expo-blur';
import { Job, DEFAULT_COLORS } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import { AutoScheduleService } from '../services/AutoScheduleService';

interface JobFormModalProps {
  visible: boolean;
  onClose: () => void;
  editingJob?: Job | null;
  onSave: () => void;
  initialTab?: 'basic' | 'schedule' | 'financial' | 'billing' | 'auto';
  onNavigateToCalendar?: () => void; // Optional callback to navigate to calendar
}


const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  closeButton: {
    padding: Theme.spacing.sm,
  },
  headerTitle: {
    ...Theme.typography.headline,
    color: colors.text,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: Theme.borderRadius.md,
  },
  saveButtonText: {
    ...Theme.typography.footnote,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
    backgroundColor: colors.surface,
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
    backgroundColor: `${colors.primary}15`,
  },
  tabText: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    marginLeft: Theme.spacing.xs,
  },
  tabTextActive: {
    color: colors.primary,
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
    color: colors.text,
    marginBottom: Theme.spacing.md,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    ...Theme.typography.footnote,
    color: colors.text,
    marginBottom: Theme.spacing.xs,
    fontWeight: '600',
  },
  input: {
    ...Theme.typography.body,
    color: colors.text,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.separator,
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
    backgroundColor: `${colors.primary}15`,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    minWidth: 80,
    justifyContent: 'center',
  },
  detectLocationButtonLoading: {
    backgroundColor: `${colors.textSecondary}15`,
    borderColor: `${colors.textSecondary}30`,
  },
  detectLocationText: {
    ...Theme.typography.footnote,
    color: colors.primary,
    marginLeft: Theme.spacing.xs,
    fontWeight: '600',
  },
  addressHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  autoFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 12,
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 120,
    justifyContent: 'center',
  },
  autoFillButtonLoading: {
    backgroundColor: colors.textSecondary,
    shadowColor: colors.textSecondary,
    shadowOpacity: 0.2,
  },
  autoFillText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  addressRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  addressField: {
    flex: 1,
  },
  subLabel: {
    ...Theme.typography.caption2,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  detectingText: {
    ...Theme.typography.caption2,
    color: colors.textSecondary,
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
    backgroundColor: colors.separator,
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
    backgroundColor: isDark ? colors.surface : '#FFFFFF',
    ...Theme.shadows.small,
  },
  segmentText: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.text,
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
    backgroundColor: colors.separator,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workDayButtonActive: {
    backgroundColor: colors.primary,
  },
  workDayText: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  workDayTextActive: {
    color: '#FFFFFF',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.lg,
  },
  switchContent: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  switchLabel: {
    ...Theme.typography.callout,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  switchDescription: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.separator,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  unitLabel: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    minWidth: 60,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.md,
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 122, 255, 0.2)',
  },
  counterValue: {
    alignItems: 'center',
    minWidth: 60,
  },
  counterText: {
    ...Theme.typography.title,
    color: colors.text,
    fontWeight: '600',
    fontSize: 20,
  },
  counterUnit: {
    ...Theme.typography.caption2,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewCard: {
    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)',
    borderRadius: 12,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 122, 255, 0.2)',
  },
  previewTitle: {
    ...Theme.typography.headline,
    color: colors.text,
    marginBottom: Theme.spacing.xs,
  },
  previewText: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default function JobFormModal({ visible, onClose, editingJob, onSave, initialTab = 'basic', onNavigateToCalendar }: JobFormModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [previousAutoSchedule, setPreviousAutoSchedule] = useState<boolean | undefined>(undefined);

  const [formData, setFormData] = useState<Partial<Job>>({
    name: '',
    company: '',
    address: '',
    street: '',
    city: '',
    postalCode: '',
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
      hasSplitShift: false,
      secondStartTime: '15:00',
      secondEndTime: '19:00',
      autoSchedule: false,
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
    autoTimer: {
      enabled: false,
      geofenceRadius: 100,
      delayStart: 2,
      delayStop: 2,
      notifications: true,
    },
  });

  const [currentTab, setCurrentTab] = useState<'basic' | 'schedule' | 'financial' | 'billing' | 'auto'>(initialTab || 'basic');
  
  const styles = getStyles(colors, isDark);

  useEffect(() => {
    if (visible) {
      setCurrentTab(initialTab);
    }
  }, [visible, initialTab]);

  useEffect(() => {
    let scheduleToUse;
    
    if (editingJob) {
      scheduleToUse = {
        startTime: '09:00',
        endTime: '17:00',
        workDays: [1, 2, 3, 4, 5],
        breakTime: 60,
        hasSplitShift: false,
        secondStartTime: '15:00',
        secondEndTime: '19:00',
        autoSchedule: false,
        ...editingJob.schedule,
      };
      
      setFormData({
        ...editingJob,
        street: editingJob.street || '',
        city: editingJob.city || '',
        postalCode: editingJob.postalCode || '',
        salary: editingJob.salary || {
          type: 'hourly',
          amount: editingJob.hourlyRate || 0,
          currency: editingJob.currency || 'EUR',
        },
        schedule: scheduleToUse,
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
        autoTimer: editingJob.autoTimer || {
          enabled: false,
          geofenceRadius: 100,
          delayStart: 2,
          delayStop: 2,
          notifications: true,
        },
      });
    } else {
      setFormData({
        name: '',
        company: '',
        address: '',
        street: '',
        city: '',
        postalCode: '',
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
        schedule: scheduleToUse,
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
    
    // Initialize previous autoSchedule value
    setPreviousAutoSchedule(scheduleToUse?.autoSchedule || false);
  }, [editingJob, visible]);

  // Track changes in autoSchedule to clean up when disabled
  useEffect(() => {
    const currentAutoSchedule = formData.schedule?.autoSchedule;
    
    // If we have an editing job and autoSchedule was enabled but now disabled
    if (editingJob && 
        previousAutoSchedule === true && 
        currentAutoSchedule === false) {
      
      // Show confirmation dialog before clearing
      Alert.alert(
        t('job_form.auto_schedule.disable_title'),
        t('job_form.auto_schedule.disable_message'),
        [
          { 
            text: t('job_form.auto_schedule.disable_cancel'), 
            style: 'cancel',
            onPress: () => {
              // Revert the autoSchedule back to true
              updateNestedData('schedule', 'autoSchedule', true);
            }
          },
          { 
            text: t('job_form.auto_schedule.disable_confirm'),
            style: 'destructive',
            onPress: async () => {
              try {
                await AutoScheduleService.clearAutoSchedule(editingJob.id);
                Alert.alert(
                  t('job_form.auto_schedule.cleared_title'),
                  t('job_form.auto_schedule.cleared_message')
                );
              } catch (error) {
                console.error('Error clearing auto schedule:', error);
                Alert.alert(
                  t('job_form.auto_schedule.error_title'),
                  t('job_form.auto_schedule.clear_error')
                );
                // Revert on error too
                updateNestedData('schedule', 'autoSchedule', true);
              }
            }
          }
        ]
      );
    }
    
    // Update previous value
    setPreviousAutoSchedule(currentAutoSchedule);
  }, [formData.schedule?.autoSchedule, editingJob, t, previousAutoSchedule]);

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      Alert.alert(t('job_form.errors.error_title'), t('job_form.errors.name_required'));
      return;
    }

    try {
      // Combine address fields into full address
      const addressParts = [];
      if (formData.street?.trim()) addressParts.push(formData.street.trim());
      if (formData.city?.trim()) addressParts.push(formData.city.trim());
      if (formData.postalCode?.trim()) addressParts.push(formData.postalCode.trim());
      const fullAddress = addressParts.join(', ');

      const jobData: Omit<Job, 'id' | 'createdAt'> = {
        name: formData.name.trim(),
        company: formData.company?.trim() || '',
        address: fullAddress || formData.address?.trim() || '',
        street: formData.street?.trim() || '',
        city: formData.city?.trim() || '',
        postalCode: formData.postalCode?.trim() || '',
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
        autoTimer: formData.autoTimer,
      };

      let savedJob: Job;
      if (editingJob) {
        await JobService.updateJob(editingJob.id, jobData);
        savedJob = { ...editingJob, ...jobData };
      } else {
        savedJob = await JobService.addJob(jobData);
      }

      // Handle auto scheduling if enabled
      if (formData.schedule?.autoSchedule && savedJob) {
        try {
          const result = await AutoScheduleService.applyAutoSchedule(savedJob);
          
          // Show confirmation with conflicts if any
          if (result.conflicts.length > 0) {
            Alert.alert(
              t('job_form.auto_schedule.applied_title'),
              t('job_form.auto_schedule.applied_conflicts', {
                workDays: result.generatedDays.length.toString(),
                freeDays: result.freeDays.length.toString(),
                conflicts: result.conflicts.length.toString()
              }),
              [
                { 
                  text: 'OK', 
                  style: 'cancel',
                  onPress: () => {
                    onSave();
                    onClose();
                  }
                },
                { 
                  text: t('job_form.auto_schedule.view_calendar'), 
                  onPress: () => {
                    onSave();
                    onClose();
                    setTimeout(() => {
                      onNavigateToCalendar?.();
                    }, 300);
                  }
                }
              ]
            );
          } else {
            Alert.alert(
              t('job_form.auto_schedule.applied_title'),
              t('job_form.auto_schedule.applied_success', {
                workDays: result.generatedDays.length.toString(),
                freeDays: result.freeDays.length.toString()
              }),
              [
                { 
                  text: 'OK', 
                  style: 'cancel',
                  onPress: () => {
                    onSave();
                    onClose();
                  }
                },
                { 
                  text: t('job_form.auto_schedule.view_calendar'), 
                  onPress: () => {
                    onSave();
                    onClose();
                    setTimeout(() => {
                      onNavigateToCalendar?.();
                    }, 300);
                  }
                }
              ]
            );
            return; // Exit early when showing alert with calendar navigation
          }
        } catch (error) {
          console.error('Error applying auto schedule:', error);
          Alert.alert(
            t('job_form.auto_schedule.error_title'),
            t('job_form.auto_schedule.error_message')
          );
        }
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving job:', error);
      Alert.alert(t('job_form.errors.error_title'), t('job_form.errors.save_error'));
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
          t('job_form.location_detection.permission_title'),
          t('job_form.location_detection.permission_message')
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
        // Build full address string
        const addressParts = [];
        if (addressData.name) addressParts.push(addressData.name);
        if (addressData.street) addressParts.push(addressData.street);
        if (addressData.streetNumber) addressParts.push(addressData.streetNumber);
        if (addressData.city) addressParts.push(addressData.city);
        if (addressData.region) addressParts.push(addressData.region);
        if (addressData.country) addressParts.push(addressData.country);

        const detectedAddress = addressParts.join(', ');

        // Build street address (street + number)
        const streetParts = [];
        if (addressData.street) streetParts.push(addressData.street);
        if (addressData.streetNumber) streetParts.push(addressData.streetNumber);
        const streetAddress = streetParts.join(' ');

        // Update form data with separated fields
        updateFormData('address', detectedAddress);
        updateFormData('street', streetAddress);
        updateFormData('city', addressData.city || '');
        updateFormData('postalCode', addressData.postalCode || '');
        
        updateNestedData('location', 'address', detectedAddress);
        updateNestedData('location', 'latitude', currentLocation.coords.latitude);
        updateNestedData('location', 'longitude', currentLocation.coords.longitude);

        Alert.alert(
          t('job_form.location_detection.detected_title'),
          t('job_form.location_detection.detected_message', { address: detectedAddress })
        );
      } else {
        Alert.alert(
          t('job_form.location_detection.error_title'),
          t('job_form.location_detection.error_address')
        );
      }
    } catch (error) {
      console.error('Error detecting location:', error);
      Alert.alert(
        t('job_form.location_detection.error_title'),
        t('job_form.location_detection.error_location')
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
      <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.section}>
        <Text style={styles.sectionTitle}>{t('job_form.basic.title')}</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('job_form.basic.name')} {t('job_form.basic.name_required')}</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            placeholder={t('job_form.basic.name_placeholder')}
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('job_form.basic.company')}</Text>
          <TextInput
            style={styles.input}
            value={formData.company}
            onChangeText={(value) => updateFormData('company', value)}
            placeholder={t('job_form.basic.company_placeholder')}
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.addressHeaderContainer}>
            <Text style={styles.label}>{t('job_form.basic.address')}</Text>
            <TouchableOpacity
              style={[
                styles.autoFillButton,
                isDetectingLocation && styles.autoFillButtonLoading
              ]}
              onPress={detectCurrentLocation}
              disabled={isDetectingLocation}
            >
              <IconSymbol 
                size={18} 
                name={isDetectingLocation ? "gear" : "location.fill"} 
                color="#FFFFFF"
              />
              <Text style={styles.autoFillText}>
                {isDetectingLocation ? t('job_form.basic.detecting') : t('job_form.basic.auto_fill')}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.addressRow}>
            <View style={[styles.addressField, { flex: 2 }]}>
              <Text style={styles.subLabel}>{t('job_form.basic.street')}</Text>
              <TextInput
                style={styles.input}
                value={formData.street}
                onChangeText={(value) => updateFormData('street', value)}
                placeholder={t('job_form.basic.street_placeholder')}
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={[styles.addressField, { flex: 1 }]}>
              <Text style={styles.subLabel}>{t('job_form.basic.postal_code')}</Text>
              <TextInput
                style={styles.input}
                value={formData.postalCode}
                onChangeText={(value) => updateFormData('postalCode', value)}
                placeholder={t('job_form.basic.postal_code_placeholder')}
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
          </View>
          
          <View style={styles.addressField}>
            <Text style={styles.subLabel}>{t('job_form.basic.city')}</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(value) => updateFormData('city', value)}
              placeholder={t('job_form.basic.city_placeholder')}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('job_form.basic.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(value) => updateFormData('description', value)}
            placeholder={t('job_form.basic.description_placeholder')}
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('job_form.basic.color')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
            {DEFAULT_COLORS.map((color, index) => (
              <TouchableOpacity
                key={`color-${index}`}
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
            <Text style={styles.label}>{t('job_form.basic.active')}</Text>
            <Switch
              value={formData.isActive}
              onValueChange={(value) => updateFormData('isActive', value)}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </BlurView>

      <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.section}>
        <Text style={styles.sectionTitle}>{t('job_form.contact.title')}</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('job_form.contact.person')}</Text>
          <TextInput
            style={styles.input}
            value={formData.contactPerson}
            onChangeText={(value) => updateFormData('contactPerson', value)}
            placeholder={t('job_form.contact.person_placeholder')}
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('job_form.contact.email')}</Text>
          <TextInput
            style={styles.input}
            value={formData.contactEmail}
            onChangeText={(value) => updateFormData('contactEmail', value)}
            placeholder={t('job_form.contact.email_placeholder')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('job_form.contact.phone')}</Text>
          <TextInput
            style={styles.input}
            value={formData.contactPhone}
            onChangeText={(value) => updateFormData('contactPhone', value)}
            placeholder={t('job_form.contact.phone_placeholder')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
          />
        </View>
      </BlurView>
    </ScrollView>
  );

  const renderScheduleTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.section}>
        <Text style={styles.sectionTitle}>{t('job_form.schedule.title')}</Text>
        
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('job_form.schedule.start_time')}</Text>
            <TextInput
              style={styles.input}
              value={formData.schedule?.startTime}
              onChangeText={(value) => updateNestedData('schedule', 'startTime', value)}
              placeholder={t('job_form.schedule.start_time_placeholder')}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('job_form.schedule.end_time')}</Text>
            <TextInput
              style={styles.input}
              value={formData.schedule?.endTime}
              onChangeText={(value) => updateNestedData('schedule', 'endTime', value)}
              placeholder={t('job_form.schedule.end_time_placeholder')}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        {/* Split Shift Section */}
        <View style={styles.switchContainer}>
          <View style={styles.switchContent}>
            <Text style={styles.switchLabel}>{t('job_form.schedule.split_shift')}</Text>
            <Text style={styles.switchDescription}>{t('job_form.schedule.split_shift_desc')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.switch, formData.schedule?.hasSplitShift && styles.switchActive]}
            onPress={() => updateNestedData('schedule', 'hasSplitShift', !formData.schedule?.hasSplitShift)}
          >
            <View style={[styles.switchThumb, formData.schedule?.hasSplitShift && styles.switchThumbActive]} />
          </TouchableOpacity>
        </View>

        {/* Second shift times - only show if split shift is enabled */}
        {formData.schedule?.hasSplitShift && (
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('job_form.schedule.second_start_time')}</Text>
              <TextInput
                style={styles.input}
                value={formData.schedule?.secondStartTime}
                onChangeText={(value) => updateNestedData('schedule', 'secondStartTime', value)}
                placeholder={t('job_form.schedule.second_start_time_placeholder')}
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('job_form.schedule.second_end_time')}</Text>
              <TextInput
                style={styles.input}
                value={formData.schedule?.secondEndTime}
                onChangeText={(value) => updateNestedData('schedule', 'secondEndTime', value)}
                placeholder={t('job_form.schedule.second_end_time_placeholder')}
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('job_form.schedule.default_hours')}</Text>
          <TextInput
            style={styles.input}
            value={String(formData.defaultHours)}
            onChangeText={(value) => updateFormData('defaultHours', Number(value) || 0)}
            placeholder={t('job_form.schedule.default_hours_placeholder')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('job_form.schedule.break_time')}</Text>
          <TextInput
            style={styles.input}
            value={String(formData.schedule?.breakTime || 0)}
            onChangeText={(value) => updateNestedData('schedule', 'breakTime', Number(value) || 0)}
            placeholder={t('job_form.schedule.break_time_placeholder')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('job_form.schedule.work_days')}</Text>
          <View style={styles.workDaysContainer}>
            {(t('job_form.schedule.days') as unknown as string[]).map((day: string, index: number) => (
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

        {/* Auto Schedule Section */}
        <View style={styles.switchContainer}>
          <View style={styles.switchContent}>
            <Text style={styles.switchLabel}>{t('job_form.schedule.auto_schedule')}</Text>
            <Text style={styles.switchDescription}>{t('job_form.schedule.auto_schedule_desc')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.switch, formData.schedule?.autoSchedule && styles.switchActive]}
            onPress={() => updateNestedData('schedule', 'autoSchedule', !formData.schedule?.autoSchedule)}
          >
            <View style={[styles.switchThumb, formData.schedule?.autoSchedule && styles.switchThumbActive]} />
          </TouchableOpacity>
        </View>
      </BlurView>
    </ScrollView>
  );

  const renderFinancialTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.section}>
        <Text style={styles.sectionTitle}>{t('job_form.financial.title')}</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('job_form.financial.salary_type')}</Text>
          <View style={styles.segmentedControl}>
            {[
              { key: 'hourly', label: t('job_form.financial.hourly') },
              { key: 'monthly', label: t('job_form.financial.monthly') },
              { key: 'annual', label: t('job_form.financial.annual') },
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
            <Text style={styles.label}>{t('job_form.financial.amount')}</Text>
            <TextInput
              style={styles.input}
              value={String(formData.salary?.amount || 0)}
              onChangeText={(value) => updateNestedData('salary', 'amount', Number(value) || 0)}
              placeholder={t('job_form.financial.amount_placeholder')}
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('job_form.financial.currency')}</Text>
            <TextInput
              style={styles.input}
              value={formData.salary?.currency}
              onChangeText={(value) => updateNestedData('salary', 'currency', value)}
              placeholder={t('job_form.financial.currency_placeholder')}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('job_form.financial.hourly_rate')}</Text>
          <TextInput
            style={styles.input}
            value={String(formData.hourlyRate || 0)}
            onChangeText={(value) => updateFormData('hourlyRate', Number(value) || 0)}
            placeholder={t('job_form.financial.hourly_rate_placeholder')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
          />
        </View>
      </BlurView>
    </ScrollView>
  );

  const renderBillingTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.section}>
        <Text style={styles.sectionTitle}>{t('job_form.billing.title')}</Text>
        
        <View style={styles.inputGroup}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>{t('job_form.billing.enabled')}</Text>
            <Switch
              value={formData.billing?.enabled}
              onValueChange={(value) => updateNestedData('billing', 'enabled', value)}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {formData.billing?.enabled && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('job_form.billing.invoice_prefix')}</Text>
              <TextInput
                style={styles.input}
                value={formData.billing?.invoicePrefix}
                onChangeText={(value) => updateNestedData('billing', 'invoicePrefix', value)}
                placeholder={t('job_form.billing.invoice_prefix_placeholder')}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('job_form.billing.tax_rate')}</Text>
              <TextInput
                style={styles.input}
                value={String(formData.billing?.taxRate || 0)}
                onChangeText={(value) => updateNestedData('billing', 'taxRate', Number(value) || 0)}
                placeholder={t('job_form.billing.tax_rate_placeholder')}
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('job_form.billing.notes')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.billing?.notes}
                onChangeText={(value) => updateNestedData('billing', 'notes', value)}
                placeholder={t('job_form.billing.notes_placeholder')}
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>
          </>
        )}
      </BlurView>

      <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.section}>
        <Text style={styles.sectionTitle}>{t('job_form.location.title')}</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('job_form.location.address')}</Text>
          <View style={styles.addressInputContainer}>
            <TextInput
              style={[styles.input, styles.addressInput]}
              value={formData.location?.address}
              onChangeText={(value) => updateNestedData('location', 'address', value)}
              placeholder={t('job_form.location.address_placeholder')}
              placeholderTextColor={colors.textTertiary}
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
                color={isDetectingLocation ? colors.textSecondary : colors.success} 
              />
              {!isDetectingLocation && (
                <Text style={[styles.detectLocationText, { color: colors.success }]}>GPS</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('job_form.location.radius')}</Text>
          <TextInput
            style={styles.input}
            value={String(formData.location?.radius || 100)}
            onChangeText={(value) => updateNestedData('location', 'radius', Number(value) || 100)}
            placeholder={t('job_form.location.radius_placeholder')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
          />
        </View>
      </BlurView>
    </ScrollView>
  );

  const renderAutoTab = () => {
    const hasAddress = () => {
      return !!(formData.address?.trim() || 
                formData.street?.trim() || 
                formData.city?.trim() || 
                formData.postalCode?.trim());
    };

    const handleAutoTimerToggle = (value: boolean) => {
      if (value && !hasAddress()) {
        Alert.alert(
          t('job_form.auto_timer.address_required_title'),
          t('job_form.auto_timer.address_required_message'),
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
      updateNestedData('autoTimer', 'enabled', value);
    };

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.section}>
          <Text style={styles.sectionTitle}>{t('job_form.auto_timer.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('job_form.auto_timer.subtitle')}</Text>

          <View style={styles.inputGroup}>
            <View style={styles.switchRow}>
              <View style={styles.switchContent}>
                <Text style={styles.label}>{t('job_form.auto_timer.enabled')}</Text>
                <Text style={styles.labelDescription}>{t('job_form.auto_timer.enabled_desc')}</Text>
              </View>
              <Switch
                value={formData.autoTimer?.enabled || false}
                onValueChange={handleAutoTimerToggle}
                trackColor={{ false: colors.separator, true: colors.primary + '40' }}
                thumbColor={formData.autoTimer?.enabled ? colors.primary : colors.textTertiary}
              />
            </View>
          </View>

        {formData.autoTimer?.enabled && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('job_form.auto_timer.geofence_radius')}</Text>
              <Text style={styles.labelDescription}>{t('job_form.auto_timer.geofence_radius_desc')}</Text>
              <View style={styles.sliderContainer}>
                <TextInput
                  style={styles.input}
                  value={String(formData.autoTimer?.geofenceRadius || 100)}
                  onChangeText={(value) => updateNestedData('autoTimer', 'geofenceRadius', Math.max(50, Math.min(500, Number(value) || 100)))}
                  keyboardType="numeric"
                  placeholder="100"
                  placeholderTextColor={colors.textTertiary}
                />
                <Text style={styles.unitLabel}>metros</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('job_form.auto_timer.delay_start')}</Text>
              <Text style={styles.labelDescription}>{t('job_form.auto_timer.delay_start_desc')}</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => {
                    const currentValue = formData.autoTimer?.delayStart || 2;
                    const newValue = Math.max(1, currentValue - 1);
                    updateNestedData('autoTimer', 'delayStart', newValue);
                  }}
                >
                  <IconSymbol size={20} name="minus" color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.counterValue}>
                  <Text style={styles.counterText}>{formData.autoTimer?.delayStart || 2}</Text>
                  <Text style={styles.counterUnit}>min</Text>
                </View>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => {
                    const currentValue = formData.autoTimer?.delayStart || 2;
                    const newValue = Math.min(10, currentValue + 1);
                    updateNestedData('autoTimer', 'delayStart', newValue);
                  }}
                >
                  <IconSymbol size={20} name="plus" color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('job_form.auto_timer.delay_stop')}</Text>
              <Text style={styles.labelDescription}>{t('job_form.auto_timer.delay_stop_desc')}</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => {
                    const currentValue = formData.autoTimer?.delayStop || 2;
                    const newValue = Math.max(1, currentValue - 1);
                    updateNestedData('autoTimer', 'delayStop', newValue);
                  }}
                >
                  <IconSymbol size={20} name="minus" color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.counterValue}>
                  <Text style={styles.counterText}>{formData.autoTimer?.delayStop || 2}</Text>
                  <Text style={styles.counterUnit}>min</Text>
                </View>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => {
                    const currentValue = formData.autoTimer?.delayStop || 2;
                    const newValue = Math.min(10, currentValue + 1);
                    updateNestedData('autoTimer', 'delayStop', newValue);
                  }}
                >
                  <IconSymbol size={20} name="plus" color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.switchRow}>
                <View style={styles.switchContent}>
                  <Text style={styles.label}>{t('job_form.auto_timer.notifications')}</Text>
                  <Text style={styles.labelDescription}>{t('job_form.auto_timer.notifications_desc')}</Text>
                </View>
                <Switch
                  value={formData.autoTimer?.notifications !== false}
                  onValueChange={(value) => updateNestedData('autoTimer', 'notifications', value)}
                  trackColor={{ false: colors.separator, true: colors.primary + '40' }}
                  thumbColor={formData.autoTimer?.notifications !== false ? colors.primary : colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>📍 Vista Previa</Text>
              <Text style={styles.previewText}>
                {t('job_form.auto_timer.preview', {
                  delayStart: formData.autoTimer?.delayStart || 2,
                  delayStop: formData.autoTimer?.delayStop || 2
                })}
              </Text>
            </View>
          </>
        )}
      </BlurView>
    </ScrollView>
    );
  };

  const tabs = [
    { key: 'basic', label: t('job_form.tabs.basic'), icon: 'gear' },
    { key: 'schedule', label: t('job_form.tabs.schedule'), icon: 'clock.fill' },
    { key: 'financial', label: t('job_form.tabs.financial'), icon: 'dollarsign.circle.fill' },
    { key: 'billing', label: t('job_form.tabs.billing'), icon: 'chart.bar.fill' },
    { key: 'auto', label: t('job_form.tabs.auto'), icon: 'location.fill' },
  ] as const;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol size={24} name="xmark" color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editingJob ? t('job_form.title_edit') : t('job_form.title_new')}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{t('job_form.save')}</Text>
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
                  color={currentTab === tab.key ? colors.primary : colors.textSecondary}
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
          {currentTab === 'auto' && renderAutoTab()}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

