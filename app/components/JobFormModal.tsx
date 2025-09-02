import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Linking,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '../context/NavigationContext';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../hooks/useSubscription';
import { useTimeFormat } from '../hooks/useTimeFormat';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Job, DEFAULT_COLORS } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import { AutoScheduleService } from '../services/AutoScheduleService';
import AutoTimerService from '../services/AutoTimerService';
import AutoTimerModeService, { AutoTimerMode } from '../services/AutoTimerModeService';
import { FreeAddressSearch } from './FreeAddressSearch';
import AddressAutocompleteDropdown from './AddressAutocompleteDropdown';
import * as Updates from 'expo-updates';

// Custom TimeInput component that auto-formats time input (1200 -> 12:00)
const TimeInput = ({ value, onChangeText, style, placeholder, placeholderTextColor, ...props }: any) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const formatTimeFor24hInput = (timeString: string) => {
    if (!timeString) return '';
    return timeString.includes(':') ? timeString.substring(0, 5) : timeString;
  };
  
  const autoFormatTimeInput = (text: string) => {
    // Remove all non-digits
    const digitsOnly = text.replace(/\D/g, '');
    
    if (digitsOnly.length === 0) return '';
    if (digitsOnly.length <= 2) return digitsOnly;
    if (digitsOnly.length === 3) {
      // 123 -> 1:23
      return `${digitsOnly[0]}:${digitsOnly.slice(1)}`;
    }
    if (digitsOnly.length >= 4) {
      // 1234 -> 12:34
      return `${digitsOnly.slice(0, 2)}:${digitsOnly.slice(2, 4)}`;
    }
    return digitsOnly;
  };
  
  useEffect(() => {
    if (!hasInitialized && value) {
      setInternalValue(formatTimeFor24hInput(value));
      setHasInitialized(true);
    }
  }, [value, hasInitialized]);

  const handleChangeText = (text: string) => {
    const formatted = autoFormatTimeInput(text);
    setInternalValue(formatted);
    
    if (formatted.includes(':') && formatted.length >= 4) {
      onChangeText(formatted);
    }
  };

  const handleBlur = () => {
    if (internalValue && internalValue.includes(':') && internalValue.length >= 4) {
      onChangeText(internalValue);
    } else if (value) {
      setInternalValue(formatTimeFor24hInput(value));
    }
  };

  return (
    <TextInput
      style={style}
      value={internalValue}
      onChangeText={handleChangeText}
      onBlur={handleBlur}
      placeholder="HH:MM"
      placeholderTextColor={placeholderTextColor}
      keyboardType="numeric"
      maxLength={5}
      autoCorrect={false}
      {...props}
    />
  );
};

interface JobFormModalProps {
  visible: boolean;
  onClose: () => void;
  editingJob?: Job | null;
  onSave: (jobData: any) => void;
  initialTab?: 'basic' | 'schedule' | 'financial' | 'billing' | 'auto' | 'delete';
  onNavigateToCalendar?: () => void; // Optional callback to navigate to calendar
  onNavigateToSubscription?: () => void; // Callback to navigate to subscription screen
  isLocationEnabled?: boolean; // Para detectar si hay permisos de ubicación
  disableSubscriptionModal?: boolean; // Disable subscription modal when opened from JobsManagementScreen
}


const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    maxHeight: '100%',
  },
  transparentContainer: {
    flex: 1,
    backgroundColor: 'transparent',
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  
  headerTitle: {
    ...Theme.typography.headline,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'left',
  },
  closeButton: {
    padding: Theme.spacing.sm,
  },
  closeButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 18,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
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
  autoIndicatorDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: Theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' && Platform.isPad ? Theme.spacing.xl * 2 : Theme.spacing.md,
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

    transform: [{ scale: 1 }],
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
  workDayButtonSelected: {
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  workDayText: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  workDayTextActive: {
    color: '#FFFFFF',
  },
  monthButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.separator,
    marginHorizontal: 4,
  },
  monthButtonActive: {
    backgroundColor: colors.primary,
  },
  monthButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  monthButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  helperText: {
    ...Theme.typography.caption2,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: Theme.spacing.xs,
    fontStyle: 'italic',
  },
  locationSection: {
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  dayScheduleContainer: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: colors.separator + '20',
    borderRadius: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayScheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  dayScheduleTitle: {
    ...Theme.typography.headline,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
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
  scrollView: {
    flex: 1,
    flexGrow: 1,
  },
  sectionSubtitle: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    marginBottom: Theme.spacing.md,
    lineHeight: 18,
  },
  labelDescription: {
    ...Theme.typography.caption2,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  // Financial section styles
  financialCard: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(247, 248, 250, 1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  },
  financialCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  financialCardTitle: {
    ...Theme.typography.callout,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  currencyInputContainer: {
    alignItems: 'center',
  },
  currencyInput: {
    ...Theme.typography.title1,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 1)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    minWidth: 100,
  },
  salaryTypeSelector: {
    flexDirection: 'row',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    padding: 4,
  },
  salaryTypeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salaryTypeOptionActive: {
    backgroundColor: colors.primary,
  },
  salaryTypeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  salaryTypeText: {
    ...Theme.typography.footnote,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  salaryTypeTextActive: {
    color: '#FFFFFF',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.separator,
    overflow: 'hidden',
  },
  currencySymbol: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  currencySymbolText: {
    ...Theme.typography.callout,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  amountInput: {
    ...Theme.typography.title2,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  periodIndicator: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  periodIndicatorText: {
    ...Theme.typography.callout,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  amountHelper: {
    ...Theme.typography.caption2,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  locationDisabledContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: isDark ? 'rgba(255, 59, 48, 0.08)' : 'rgba(255, 59, 48, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 59, 48, 0.15)',
  },
  locationDisabledIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: isDark ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  locationDisabledTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  locationDisabledDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Premium Modal Styles
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  premiumModalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  premiumModalHeader: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  premiumIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  premiumModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  premiumModalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  premiumModalContent: {
    padding: 24,
  },
  premiumFeaturesList: {
    marginBottom: 24,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumFeatureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  premiumFeatureText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    fontWeight: '500',
  },
  premiumModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  premiumCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  premiumCancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  premiumSubscribeButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    elevation: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  premiumSubscribeButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  simplifiedOverlay: {
    ...StyleSheet.absoluteFillObject,

    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' && Platform.isPad ? 80 : (Platform.OS === 'ios' ? 120 : 100),
  },
  simplifiedKeyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  simplifiedCard: {
    width: Platform.OS === 'ios' && Platform.isPad ? '70%' : '90%',
    maxWidth: Platform.OS === 'ios' && Platform.isPad ? 600 : 400,
    maxHeight: Platform.OS === 'ios' && Platform.isPad ? '85%' : undefined,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(57, 131, 229, 0.12)',
  },
  simplifiedBlurCard: {
    padding: Theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' && Platform.isPad ? Theme.spacing.xl * 2 : Theme.spacing.lg,
    alignItems: 'center',
  },
  simplifiedCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  simplifiedCloseCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(142,142,147,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simplifiedWelcomeSection: {
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  simplifiedIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  simplifiedIconGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  simplifiedWelcome: {
    ...Theme.typography.title2,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  simplifiedCreateFirst: {
    ...Theme.typography.callout,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  simplifiedSubtitle: {
    ...Theme.typography.caption1,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Theme.spacing.md,
    lineHeight: 16,
  },
  simplifiedInputSection: {
    width: '100%',
    marginBottom: Theme.spacing.md,
  },
  simplifiedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
  },
  simplifiedLabel: {
    ...Theme.typography.callout,
    color: colors.text,
    fontWeight: '600',
  },
  simplifiedInput: {
    ...Theme.typography.body,
    color: colors.text,
    backgroundColor: isDark ? colors.surface : colors.background,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: colors.separator,
    fontSize: 16,
  },
  simplifiedSaveButton: {
    flexDirection: 'row',
    minHeight: 42,
    paddingVertical: 4,
    paddingHorizontal: 32,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    overflow: 'hidden',
    marginTop: Theme.spacing.sm,
  },
  simplifiedButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  simplifiedSaveButtonDisabled: {
    opacity: 0.5,
  },
  simplifiedSaveButtonText: {
    ...Theme.typography.headline,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
    fontSize: 17,
  },
  // Logo styles
  logoContainer: {
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  logoPreview: {
    width: '100%',
    height: 80,
    backgroundColor: colors.background,
  },
  logoActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  logoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  logoRemoveButton: {
    borderColor: colors.error + '40',
    backgroundColor: colors.error + '10',
  },
  logoActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  logoPickerButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  logoPickerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  // Map styles
  mapContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  mapWrapper: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.separator,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  userMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 144, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1E90FF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  // Sync button styles
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  syncButtonLoading: {
    backgroundColor: colors.textTertiary,
  },
  syncButtonSuccess: {
    backgroundColor: '#4CAF50',
  },
  syncButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Estilos para selección de modo AutoTimer
  modeOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.surface,
  },

  modeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },

  modeOptionContent: {
    padding: 16,
  },

  modeOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },

  modeOptionIcon: {
    fontSize: 20,
    marginRight: 12,
  },

  modeOptionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,

  },

  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioButtonSelected: {
    borderColor: colors.primary,
  },

  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  modeOptionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },

  modeOptionDetails: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },

  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.warning + '20',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },

  permissionWarningText: {
    fontSize: 12,
    color: colors.warning,
    marginLeft: 6,
    flex: 1,
  },

  // Estilos para la indicación del modo "Siempre Activo"
  backgroundModeNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.warning + '15',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },

  backgroundModeNoticeText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },

  // Navigation button styles
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.separator,
  },

  navigationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  navigationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },

  navigationTextContainer: {
    flex: 1,
  },

  navigationLabel: {
    ...Theme.typography.callout,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },

  navigationDescription: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  navigationArrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Theme.spacing.sm,
  },
});

export default function JobFormModal({ visible, onClose, editingJob, onSave, initialTab = 'basic', onNavigateToCalendar, onNavigateToSubscription, isLocationEnabled = true, disableSubscriptionModal = false }: JobFormModalProps) {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { isSubscribed } = useSubscription();
  const { navigateTo } = useNavigation();
  const { formatTimeWithPreferences, parseTimeInput, getTimePlaceholder, isValidTimeInput, autoFormatTimeInput } = useTimeFormat();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [showAutoTimerAlert, setShowAutoTimerAlert] = useState(false);
  const [hasShownAutoTimerAlert, setHasShownAutoTimerAlert] = useState(false);
  const [selectedAutoTimerMode, setSelectedAutoTimerMode] = useState<AutoTimerMode>('foreground-only');
  const [hasBackgroundPermission, setHasBackgroundPermission] = useState(false);
  const [previousAutoSchedule, setPreviousAutoSchedule] = useState<boolean | undefined>(undefined);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(isLocationEnabled);
  const [notificationSettings, setNotificationSettings] = useState({ enabled: false, autoTimer: false });
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [jobCoordinates, setJobCoordinates] = useState<{latitude: number; longitude: number} | null>(null);
  const [mapRegion, setMapRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);


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
      enabled: false, // Schedule disabled by default
      weeklySchedule: {
        0: null, // Domingo
        1: null, // Lunes
        2: null, // Martes
        3: null, // Miércoles
        4: null, // Jueves
        5: null, // Viernes
        6: null, // Sábado
      },
      autoSchedule: false,
    },
    billing: {
      enabled: false,
      invoicePrefix: 'INV',
      taxRate: 21,
      notes: '',
      userData: {
        name: '',
        address: '',
        phone: '',
        email: '',
        isCompany: false,
        companyName: '',
        taxId: '',
        bankAccount: '',
        bankName: '',
        swiftCode: '',
        website: '',
        logoUrl: '',
      },
    },
    location: {
      address: '',
      radius: 100,
    },

  });

  const [currentTab, setCurrentTab] = useState<'basic' | 'schedule' | 'financial' | 'billing' | 'auto' | 'delete'>(initialTab || 'basic');
  const [confirmationName, setConfirmationName] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [hasCheckedFirstTime, setHasCheckedFirstTime] = useState(false);
  const [activeTimerElapsed, setActiveTimerElapsed] = useState<number>(0);
  const [isAutoTimerPaused, setIsAutoTimerPaused] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [showNameError, setShowNameError] = useState(false);
  const [selectedSyncMonths, setSelectedSyncMonths] = useState<number[]>([new Date().getMonth()]); // Current month as default
  const monthScrollViewRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);
  
  const styles = getStyles(colors, isDark);

  useEffect(() => {
    if (visible) {
      setCurrentTab(initialTab);
      setHasUnsavedChanges(false); // Reset changes flag when opening modal
      setShowNameError(false); // Reset name error when opening modal
    }
  }, [visible, initialTab]);


  // Check if it's the first time user opens the form
  useEffect(() => {
    const checkFirstTimeUser = async () => {
      if (visible && !hasCheckedFirstTime && !editingJob) {
        try {
          const hasSeenFullForm = await AsyncStorage.getItem('hasSeenFullJobForm');
          setIsFirstTimeUser(hasSeenFullForm !== 'true');
          setHasCheckedFirstTime(true);
        } catch (error) {
          console.error('Error checking first time user:', error);
          setIsFirstTimeUser(false);
        }
      }
    };

    checkFirstTimeUser();
  }, [visible, hasCheckedFirstTime, editingJob]);

  // Verificar permisos de ubicación cuando se abre el modal
  useEffect(() => {
    const checkLocationPermission = async () => {
      if (visible) {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          setHasLocationPermission(status === 'granted');
        } catch (error) {
          console.error('Error checking location permission:', error);
          setHasLocationPermission(false);
        }
      }
    };

    checkLocationPermission();
  }, [visible]);

  // Cargar configuración actual del modo AutoTimer
  useEffect(() => {
    const loadAutoTimerModeSettings = async () => {
      if (visible) {
        try {
          const modeService = AutoTimerModeService.getInstance();
          const settings = await modeService.getAutoTimerModeSettings();
          setSelectedAutoTimerMode(settings.mode);
          setHasBackgroundPermission(settings.hasBackgroundPermission);
          console.log('📱 Loaded AutoTimer mode:', settings.mode);
        } catch (error) {
          console.error('Error loading AutoTimer mode settings:', error);
        }
      }
    };

    loadAutoTimerModeSettings();
  }, [visible]);

  // Cargar configuración de notificaciones
  useEffect(() => {
    const loadNotificationSettings = async () => {
      if (!visible) return;
      try {
        const settings = await AsyncStorage.getItem('notification_settings');
        if (settings) {
          const parsed = JSON.parse(settings);
          setNotificationSettings(parsed);
          console.log('🔔 Loaded notification settings:', parsed);
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    };
    loadNotificationSettings();
  }, [visible]);

  // Listener para detectar cuando la app vuelve a estar activa y re-verificar permisos
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active' && visible) {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          setHasLocationPermission(status === 'granted');
        } catch (error) {
          console.error('Error checking location permission on app focus:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [visible]);

  useEffect(() => {
    let scheduleToUse;
    
    if (editingJob) {
      scheduleToUse = {
        enabled: editingJob.schedule?.enabled || false,
        weeklySchedule: editingJob.schedule?.weeklySchedule || {
          0: null,
          1: null,
          2: null,
          3: null,
          4: null,
          5: null,
          6: null,
        },
        autoSchedule: editingJob.schedule?.autoSchedule || false,
      };
      
      console.log('🔧 JobFormModal: Setting formData from editingJob');
      console.log('🔧 EditingJob schedule original:', editingJob.schedule);
      console.log('🔧 EditingJob schedule.weeklySchedule original:', editingJob.schedule?.weeklySchedule);
      console.log('🔧 EditingJob autoTimer original:', editingJob.autoTimer);
      console.log('🔧 EditingJob delayStart original:', editingJob.autoTimer?.delayStart);
      console.log('🔧 EditingJob delayStop original:', editingJob.autoTimer?.delayStop);
      
      const autoTimerToUse = editingJob.autoTimer || {
        enabled: false,
        geofenceRadius: 50,
        delayStart: 0,
        delayStop: 0,
        notifications: true,
      };
      
      console.log('🔧 AutoTimer after || fallback:', autoTimerToUse);
      console.log('🔧 DelayStart after || fallback:', autoTimerToUse.delayStart);
      console.log('🔧 DelayStop after || fallback:', autoTimerToUse.delayStop);
      
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
          userData: {
            name: '',
            address: '',
            phone: '',
            email: '',
            isCompany: false,
            companyName: '',
            taxId: '',
            bankAccount: '',
            bankName: '',
            swiftCode: '',
            website: '',
            logoUrl: '',
          },
        },
        location: editingJob.location || {
          address: editingJob.address || '',
          radius: 100,
        },
        autoTimer: autoTimerToUse,
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
          userData: {
            name: '',
            address: '',
            phone: '',
            email: '',
            isCompany: false,
            companyName: '',
            taxId: '',
            bankAccount: '',
            bankName: '',
            swiftCode: '',
            website: '',
            logoUrl: '',
          },
        },
        location: {
          address: '',
          radius: 100,
        },
        autoTimer: {
          enabled: false,
          geofenceRadius: 50,
          delayStart: 0,
          delayStop: 0,
          notifications: true,
        },
      });
    }
    
    // Initialize previous autoSchedule value
    setPreviousAutoSchedule(scheduleToUse?.autoSchedule || false);
    
    console.log('🔧 JobFormModal useEffect completed, current formData.autoTimer:', formData.autoTimer);
  }, [editingJob, visible]);

  // Get user location when auto-timer is enabled
  useEffect(() => {
    const getUserLocation = async () => {
      if (formData.autoTimer?.enabled && hasLocationPermission) {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        } catch (error) {
          console.log('Error getting user location:', error);
        }
      }
    };

    getUserLocation();
  }, [formData.autoTimer?.enabled, hasLocationPermission]);

  // Check active timer status for this job
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const checkActiveTimer = async () => {
      if (editingJob) {
        try {
          const activeSession = await JobService.getActiveSession();
          if (activeSession && activeSession.jobId === editingJob.id) {
            // Use AutoTimerService's getElapsedTime instead of calculating manually
            const autoTimerService = AutoTimerService.getInstance();
            const elapsedSeconds = await autoTimerService.getElapsedTime();
            setActiveTimerElapsed(elapsedSeconds);
          } else {
            setActiveTimerElapsed(0);
            setIsAutoTimerPaused(false);
          }
        } catch (error) {
          console.error('Error checking active timer:', error);
        }
      }
    };
    
    if (visible) {
      checkActiveTimer();
      // Update every second for real-time display
      interval = setInterval(checkActiveTimer, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [visible, currentTab, editingJob, formData.autoTimer?.enabled]);

  // Listen to AutoTimer pause state changes
  useEffect(() => {
    const autoTimerService = AutoTimerService.getInstance();
    
    const handlePauseChange = (isPaused: boolean) => {
      console.log('🔄 JobFormModal received pause change:', isPaused);
      setIsAutoTimerPaused(isPaused);
    };

    autoTimerService.addPauseListener(handlePauseChange);
    
    // Get initial state
    const initPauseState = async () => {
      const isPaused = await autoTimerService.isActiveTimerPaused();
      setIsAutoTimerPaused(isPaused);
    };
    if (visible) initPauseState();

    return () => {
      autoTimerService.removePauseListener(handlePauseChange);
    };
  }, [visible]);

  // Monitor AutoTimer status and show alert when needed
  useEffect(() => {
    const checkAutoTimerStatus = () => {
      // Calculate if user is inside the work radius
      if (userLocation && jobCoordinates && formData.autoTimer?.enabled) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          jobCoordinates.latitude,
          jobCoordinates.longitude
        );
        
        const radius = formData.autoTimer?.geofenceRadius || 100;
        const isInsideRadius = distance <= radius;
        
        // Show alert only if outside radius and haven't shown it yet
        if (!isInsideRadius && !hasShownAutoTimerAlert && currentTab === 'auto') {
          setShowAutoTimerAlert(true);
          setHasShownAutoTimerAlert(true);
        }
        // Hide alert if user enters the radius
        else if (isInsideRadius && showAutoTimerAlert) {
          setShowAutoTimerAlert(false);
        }
      }
    };

    // Helper function to calculate distance between two coordinates
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3; // Earth radius in meters
      const φ1 = lat1 * Math.PI/180;
      const φ2 = lat2 * Math.PI/180;
      const Δφ = (lat2-lat1) * Math.PI/180;
      const Δλ = (lon2-lon1) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c; // Distance in meters
    };

    if (visible && formData.autoTimer?.enabled && currentTab === 'auto') {
      checkAutoTimerStatus();
      // Reduce frequency to avoid performance issues
      const interval = setInterval(checkAutoTimerStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [visible, formData.autoTimer?.enabled, currentTab, hasShownAutoTimerAlert, userLocation, jobCoordinates, showAutoTimerAlert, formData.autoTimer?.geofenceRadius]);

  // Geocode job address when it changes and auto-timer is enabled
  useEffect(() => {
    const geocodeAddress = async () => {
      if (formData.autoTimer?.enabled && (formData.address || formData.street || formData.city)) {
        const fullAddress = `${formData.street || ''} ${formData.city || ''} ${formData.postalCode || ''} ${formData.address || ''}`.trim();
        
        if (fullAddress) {
          try {
            const geocoded = await Location.geocodeAsync(fullAddress);
            if (geocoded && geocoded.length > 0) {
              const coords = {
                latitude: geocoded[0].latitude,
                longitude: geocoded[0].longitude,
              };
              setJobCoordinates(coords);
              
              // Set map region centered on job location with more zoom
              setMapRegion({
                ...coords,
                latitudeDelta: 0.002,  // Más zoom (más cerca)
                longitudeDelta: 0.002,  // Más zoom (más cerca)
              });
            }
          } catch (error) {
            console.log('Error geocoding address:', error);
          }
        }
      }
    };

    geocodeAddress();
  }, [formData.autoTimer?.enabled, formData.address, formData.street, formData.city, formData.postalCode]);

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

  const geocodeAddress = async (address: string) => {
    try {
      const geocodedLocations = await Location.geocodeAsync(address);
      if (geocodedLocations.length > 0) {
        return {
          latitude: geocodedLocations[0].latitude,
          longitude: geocodedLocations[0].longitude,
        };
      }
    } catch (error) {
      console.warn('Error geocoding address:', error);
    }
    return null;
  };

  const handleTabPress = (tabKey: 'basic' | 'schedule' | 'financial' | 'billing' | 'auto' | 'delete') => {
    const premiumTabs = ['schedule', 'financial', 'billing', 'auto'];
    
    if (premiumTabs.includes(tabKey) && !isSubscribed) {
      setCurrentTab(tabKey);
    } else {
      setCurrentTab(tabKey);
    }
  };

  const handleClose = async () => {
    // If there's a name, save the job
    if (formData.name?.trim()) {
      await handleSave();
    } else {
      // Check if any other fields have been filled
      const hasOtherFields = formData.company?.trim() || 
                            formData.address?.trim() || 
                            formData.street?.trim() || 
                            formData.city?.trim() || 
                            formData.postalCode?.trim() ||
                            formData.description?.trim() ||
                            formData.contactPerson?.trim() ||
                            formData.contactEmail?.trim() ||
                            formData.contactPhone?.trim();
      
      if (hasOtherFields) {
        // Show error on name field and don't close
        setShowNameError(true);
        setCurrentTab('basic'); // Switch to basic tab to show the error
        
        // Focus on name input after a small delay to ensure tab switch completes
        setTimeout(() => {
          if (nameInputRef.current) {
            nameInputRef.current.focus();
          }
        }, 300);
        
        return;
      }
      
      // If no fields filled, just close without saving and navigate to map
      handleCloseAndNavigate();
    }
  };

  const handleCloseAndNavigate = () => {
    onClose();
    // Always navigate to MapLocation after closing, regardless of where the modal was opened from
    setTimeout(() => {
      navigateTo('mapa');
    }, 300);
  };

  const handleSave = async () => {
    // Only save if there's a name, otherwise just close
    if (!formData.name?.trim()) {
      handleCloseAndNavigate();
      return;
    }

    // Mark that user has seen the full form after first save
    if (isFirstTimeUser) {
      try {
        await AsyncStorage.setItem('hasSeenFullJobForm', 'true');
      } catch (error) {
        console.error('Error saving first time status:', error);
      }
    }

    try {
      // Combine address fields into full address
      const addressParts = [];
      if (formData.street?.trim()) addressParts.push(formData.street.trim());
      if (formData.city?.trim()) addressParts.push(formData.city.trim());
      if (formData.postalCode?.trim()) addressParts.push(formData.postalCode.trim());
      const fullAddress = addressParts.join(', ');

      // Geocode the address if we have one and don't already have coordinates
      let locationData = formData.location;
      if (fullAddress && (!locationData?.latitude || !locationData?.longitude)) {
        const coords = await geocodeAddress(fullAddress);
        if (coords) {
          locationData = {
            ...locationData,
            address: fullAddress,
            latitude: coords.latitude,
            longitude: coords.longitude,
          };
        }
      }

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
        location: locationData,
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
          
          // Validate result exists and has expected structure
          if (!result) {
            console.warn('AutoScheduleService returned no result');
            onSave(savedJob);
            handleCloseAndNavigate();
            return;
          }
          
          // Show confirmation with conflicts if any
          if (result.conflicts && result.conflicts.length > 0) {
            // Auto schedule applied successfully with conflicts
            onSave(savedJob);
            handleCloseAndNavigate();
          } else {
            // Auto schedule applied successfully
            onSave(savedJob);
            handleCloseAndNavigate();
            return;
          }
        } catch (error) {
          console.error('Error applying auto schedule:', error);
          Alert.alert(
            t('job_form.auto_schedule.error_title'),
            t('job_form.auto_schedule.error_message')
          );
        }
      }

      onSave(savedJob);
      handleCloseAndNavigate();
      
      // Only reload the app if there were actual changes
      if (hasUnsavedChanges) {
        try {
          await Updates.reloadAsync();
        } catch (error) {
          console.log('Could not reload app:', error);
          // Silently fail if reload is not available (e.g., in development)
        }
      }
    } catch (error) {
      console.error('Error saving job:', error);
      Alert.alert(t('job_form.errors.error_title'), t('job_form.errors.save_error'));
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const updateNestedData = (section: string, field: string, value: any) => {
    console.log('🔧 UpdateNestedData called:', section, field, value);
    setFormData(prev => {
      const sectionData = prev[section as keyof typeof prev] || {};
      console.log('🔧 UpdateNestedData prev sectionData:', sectionData);
      const newData = {
        ...prev,
        [section]: {
          ...(typeof sectionData === 'object' ? sectionData : {}),
          [field]: value,
        },
      };
      console.log('🔧 UpdateNestedData new sectionData:', newData[section as keyof typeof newData]);
      return newData;
    });
    setHasUnsavedChanges(true);
  };

  const pickCompanyLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Se necesitan permisos para acceder a la galería de fotos'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        updateNestedData('billing', 'userData', {
          ...formData.billing?.userData,
          logoUrl: result.assets[0].uri
        });
      }
    } catch (error) {
      console.error('Error picking logo:', error);
      Alert.alert('Error', 'Error al seleccionar la imagen');
    }
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

  const updateDaySchedule = (day: number, scheduleData: any) => {
    console.log('🔧 updateDaySchedule called for day', day, 'with data:', scheduleData);
    const currentWeeklySchedule = formData.schedule?.weeklySchedule || {};
    console.log('🔧 Current weeklySchedule before update:', currentWeeklySchedule);
    const newWeeklySchedule = {
      ...currentWeeklySchedule,
      [day]: scheduleData,
    };
    console.log('🔧 New weeklySchedule after update:', newWeeklySchedule);
    updateNestedData('schedule', 'weeklySchedule', newWeeklySchedule);
  };

  const getDaySchedule = (day: number) => {
    const schedule = formData.schedule?.weeklySchedule?.[day] || null;
    console.log('🔧 getDaySchedule for day', day, ':', schedule);
    return schedule;
  };

  const getDefaultDaySchedule = () => ({
    startTime: '09:00',
    endTime: '17:00',
    hasSplitShift: false,
    secondStartTime: '15:00',
    secondEndTime: '19:00',
    breakTime: 60,
  });

  const hasDaySchedule = (day: number) => {
    const daySchedule = getDaySchedule(day);
    return daySchedule !== null;
  };


  const renderSimplifiedForm = () => (
    <TouchableOpacity 
      style={styles.simplifiedOverlay} 
      activeOpacity={1}
      onPress={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.simplifiedKeyboardView}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={() => {}}
          style={styles.simplifiedCard}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.simplifiedBlurCard}>
            {/* Close button */}
            <TouchableOpacity 
              onPress={handleClose} 
              style={styles.simplifiedCloseButton}
            >
              <View style={styles.simplifiedCloseCircle}>
                <IconSymbol size={20} name="xmark" color={isDark ? '#FFFFFF' : '#3C3C43'} />
              </View>
            </TouchableOpacity>

            {/* Welcome section */}
            <View style={styles.simplifiedWelcomeSection}>
              <View style={styles.simplifiedIconContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.primary + '80']}
                  style={styles.simplifiedIconGradient}
                />
                <IconSymbol size={32} name="briefcase.fill" color="#FFFFFF" />
              </View>
              
              <Text style={styles.simplifiedWelcome}>
                {t('job_form.simplified_welcome')}
              </Text>
              <Text style={styles.simplifiedCreateFirst}>
                {t('job_form.simplified_create_first')}
              </Text>
              <Text style={styles.simplifiedSubtitle}>
                {t('job_form.simplified_subtitle')}
              </Text>
            </View>
            
            {/* Form section */}
            <View style={styles.simplifiedInputSection}>
              <View style={styles.simplifiedLabelRow}>
                <IconSymbol size={18} name="pencil" color={colors.primary} />
                <Text style={styles.simplifiedLabel}>
                  {t('job_form.basic.name')}
                </Text>
              </View>
              <TextInput
                style={styles.simplifiedInput}
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                placeholder={t('job_form.basic.name_placeholder')}
                placeholderTextColor={colors.textTertiary}
                autoFocus={true}
                returnKeyType="done"
                onSubmitEditing={formData.name?.trim() ? handleSave : undefined}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.simplifiedSaveButton, 
                !formData.name?.trim() && styles.simplifiedSaveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={!formData.name?.trim()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={formData.name?.trim() 
                  ? [colors.primary, colors.primary + 'DD']
                  : [colors.separator, colors.separator]
                }
                style={styles.simplifiedButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <IconSymbol size={18} name="checkmark.circle.fill" color="#FFFFFF" />
              <Text style={styles.simplifiedSaveButtonText}>
                {t('job_form.save')}
              </Text>
            </TouchableOpacity>
          </BlurView>
          </ScrollView>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </TouchableOpacity>
  );

  // Custom TimeInput component that handles format preferences
  const TimeInput = ({ value, onChangeText, placeholder, style, ...props }: {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    style?: any;
    [key: string]: any;
  }) => {
    const [displayValue, setDisplayValue] = useState(formatTimeWithPreferences(value || ''));
    
    useEffect(() => {
      setDisplayValue(formatTimeWithPreferences(value || ''));
    }, [value, formatTimeWithPreferences]);

    const handleChangeText = (text: string) => {
      setDisplayValue(text);
      // Convert to 24-hour format for storage
      const parsedTime = parseTimeInput(text);
      onChangeText(parsedTime);
    };

    return (
      <TextInput
        style={style}
        value={displayValue}
        onChangeText={handleChangeText}
        placeholder={placeholder || getTimePlaceholder()}
        {...props}
      />
    );
  };

  // AutoTimer pause/resume functions
  const handleAutoTimerPause = async () => {
    try {
      console.log('⏸️ Pausing AutoTimer from JobFormModal');
      const autoTimerService = AutoTimerService.getInstance();
      const success = await autoTimerService.pauseActiveTimer();
      if (!success) {
        Alert.alert(
          t('job_form.error'),
          'Failed to pause AutoTimer'
        );
      }
    } catch (error) {
      console.error('Error pausing AutoTimer:', error);
      Alert.alert(
        t('job_form.error'),
        'Error pausing AutoTimer'
      );
    }
  };

  const handleAutoTimerResume = async () => {
    try {
      console.log('▶️ Resuming AutoTimer from JobFormModal');
      const autoTimerService = AutoTimerService.getInstance();
      const success = await autoTimerService.resumeActiveTimer();
      if (!success) {
        Alert.alert(
          t('job_form.error'),
          'Failed to resume AutoTimer'
        );
      }
    } catch (error) {
      console.error('Error resuming AutoTimer:', error);
      Alert.alert(
        t('job_form.error'),
        'Error resuming AutoTimer'
      );
    }
  };

  const renderBasicTab = () => (
    <>
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.section}>
        <Text style={styles.sectionTitle}>{t('job_form.basic.title')}</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, showNameError && { color: colors.error }]}>
            {t('job_form.basic.name')} {t('job_form.basic.name_required')}
            {showNameError && " *"}
          </Text>
          <TextInput
            ref={nameInputRef}
            style={[
              styles.input,
              showNameError && {
                borderColor: colors.error,
                borderWidth: 2,
                backgroundColor: isDark ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 59, 48, 0.05)'
              }
            ]}
            value={formData.name}
            onChangeText={(value) => {
              updateFormData('name', value);
              if (showNameError && value.trim()) {
                setShowNameError(false);
              }
            }}
            placeholder={t('job_form.basic.name_placeholder')}
            placeholderTextColor={colors.textTertiary}
            onFocus={() => {
              if (showNameError) {
                setShowNameError(false);
              }
            }}
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
          <Text style={styles.label}>{t('job_form.basic.address')}</Text>
          
          <View style={styles.locationSection}>

            
            <View style={{ flexDirection: 'row', gap: Theme.spacing.sm }}>
              <TouchableOpacity
                style={[
                  styles.autoFillButton,
                  { flex: 1 }
                ]}
                onPress={() => {
                  setShowAddressDropdown(!showAddressDropdown);
                }}
                activeOpacity={0.7}
              >
                <IconSymbol
                  size={18}
                  name="magnifyingglass"
                  color="#FFFFFF"
                />
                <Text style={styles.autoFillText}>
                  {t('job_form.basic.search_address')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.autoFillButton,
                  isDetectingLocation && styles.autoFillButtonLoading,
                  { flex: 1 }
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
                <View style={styles.inputGroup}>
         
            <Text style={styles.label}>{t('job_form.basic.active')}</Text>
            <Switch
              value={formData.isActive}
              onValueChange={(value) => updateFormData('isActive', value)}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
      
      </BlurView>
    </ScrollView>
    
    <AddressAutocompleteDropdown
      isOpen={showAddressDropdown}
      onClose={() => setShowAddressDropdown(false)}
      onSelectAddress={(addressData) => {
        updateFormData('address', addressData.fullAddress);
        updateFormData('street', addressData.street);
        updateFormData('city', addressData.city);
        updateFormData('postalCode', addressData.postalCode);
        
        if (addressData.latitude && addressData.longitude) {
          updateNestedData('location', 'address', addressData.fullAddress);
          updateNestedData('location', 'latitude', addressData.latitude);
          updateNestedData('location', 'longitude', addressData.longitude);
          
          setJobCoordinates({
            latitude: addressData.latitude,
            longitude: addressData.longitude,
          });
        }
        setShowAddressDropdown(false);
      }}
      currentAddress={formData.street || formData.address}
    />
    </>
  );

        const renderScheduleTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.section}>
        <Text style={styles.sectionTitle}>{t('job_form.schedule.title')}</Text>
        
        {/* Schedule Enable/Disable Switch */}
        <View style={styles.switchContainer}>
          <View style={styles.switchContent}>
            <Text style={styles.switchLabel}>{t('job_form.schedule.enable_schedule')}</Text>
            <Text style={styles.switchDescription}>{t('job_form.schedule.enable_schedule_desc')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.switch, formData.schedule?.enabled && styles.switchActive]}
            onPress={() => {
              const newEnabled = !formData.schedule?.enabled;
              if (newEnabled && !isSubscribed) {
                setShowPremiumModal(true);
              } else {
                updateNestedData('schedule', 'enabled', newEnabled);
                // If disabling schedule, also disable auto schedule
                if (!newEnabled) {
                  updateNestedData('schedule', 'autoSchedule', false);
                  setSelectedDay(null);
                }
              }
            }}
          >
            <View style={[styles.switchThumb, formData.schedule?.enabled && styles.switchThumbActive]} />
          </TouchableOpacity>
        </View>

        {/* Only show schedule fields if schedule is enabled */}
        {formData.schedule?.enabled && (
        <>
          {/* Days of the week selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('job_form.schedule.select_day')}</Text>
            <View style={styles.workDaysContainer}>
              {(t('job_form.schedule.days') as unknown as string[]).map((day: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.workDayButton,
                    hasDaySchedule(index) && styles.workDayButtonActive,
                    selectedDay === index && styles.workDayButtonSelected,
                  ]}
                  onPress={() => {
                    if (hasDaySchedule(index)) {
                      // Si ya tiene horario, simplemente lo selecciona para editar (lila)
                      setSelectedDay(index);
                    } else {
                      // Si no tiene horario, le pone uno por defecto y lo selecciona
                      updateDaySchedule(index, getDefaultDaySchedule());
                      setSelectedDay(index);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.workDayText,
                      hasDaySchedule(index) && styles.workDayTextActive,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helperText}>
              {t('job_form.schedule.tap_to_select')}
            </Text>
          </View>

          {/* Schedule details for selected day */}
          {selectedDay !== null && (
            <View style={styles.dayScheduleContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={styles.dayScheduleTitle}>
                  {t('job_form.schedule.schedule_for')} {(t('job_form.schedule.days') as unknown as string[])[selectedDay]}
                </Text>
                <TouchableOpacity
                  style={{ padding: 8, borderRadius: 8, backgroundColor: colors.error + '15' }}
                  onPress={() => {
                    updateDaySchedule(selectedDay, null);
                    setSelectedDay(null);
                  }}
                >
                  <IconSymbol size={16} name="trash" color={colors.error} />
                </TouchableOpacity>
              </View>

              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('job_form.schedule.start_time')}</Text>
                  <TextInput
                    style={styles.input}
                    value={formatTimeWithPreferences(getDaySchedule(selectedDay)?.startTime || '')}
                    onChangeText={(value) => {
                      const currentSchedule = getDaySchedule(selectedDay) || getDefaultDaySchedule();
                      const parsedTime = parseTimeInput(value);
                      updateDaySchedule(selectedDay, { ...currentSchedule, startTime: parsedTime });
                    }}
                    placeholder={getTimePlaceholder()}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('job_form.schedule.end_time')}</Text>
                  <TextInput
                    style={styles.input}
                    value={formatTimeWithPreferences(getDaySchedule(selectedDay)?.endTime || '')}
                    onChangeText={(value) => {
                      const currentSchedule = getDaySchedule(selectedDay) || getDefaultDaySchedule();
                      const parsedTime = parseTimeInput(value);
                      updateDaySchedule(selectedDay, { ...currentSchedule, endTime: parsedTime });
                    }}
                    placeholder={getTimePlaceholder()}
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
                  style={[styles.switch, getDaySchedule(selectedDay)?.hasSplitShift && styles.switchActive]}
                  onPress={() => {
                    const currentSchedule = getDaySchedule(selectedDay) || getDefaultDaySchedule();
                    updateDaySchedule(selectedDay, { 
                      ...currentSchedule, 
                      hasSplitShift: !currentSchedule.hasSplitShift 
                    });
                  }}
                >
                  <View style={[styles.switchThumb, getDaySchedule(selectedDay)?.hasSplitShift && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>

              {/* Second shift times - only show if split shift is enabled */}
              {getDaySchedule(selectedDay)?.hasSplitShift && (
                <View style={styles.row}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('job_form.schedule.second_start_time')}</Text>
                    <TextInput
                      style={styles.input}
                      value={formatTimeWithPreferences(getDaySchedule(selectedDay)?.secondStartTime || '')}
                      onChangeText={(value: string) => {
                        const currentSchedule = getDaySchedule(selectedDay) || getDefaultDaySchedule();
                        const parsedTime = parseTimeInput(value);
                        updateDaySchedule(selectedDay, { ...currentSchedule, secondStartTime: parsedTime });
                      }}
                      placeholder={getTimePlaceholder()}
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('job_form.schedule.second_end_time')}</Text>
                    <TextInput
                      style={styles.input}
                      value={formatTimeWithPreferences(getDaySchedule(selectedDay)?.secondEndTime || '')}
                      onChangeText={(value: string) => {
                        const currentSchedule = getDaySchedule(selectedDay) || getDefaultDaySchedule();
                        const parsedTime = parseTimeInput(value);
                        updateDaySchedule(selectedDay, { ...currentSchedule, secondEndTime: parsedTime });
                      }}
                      placeholder={getTimePlaceholder()}
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('job_form.schedule.break_time')}</Text>
                <TextInput
                  style={styles.input}
                  value={String(getDaySchedule(selectedDay)?.breakTime || 0)}
                  onChangeText={(value: string) => {
                    const currentSchedule = getDaySchedule(selectedDay) || getDefaultDaySchedule();
                    updateDaySchedule(selectedDay, { ...currentSchedule, breakTime: Number(value) || 0 });
                  }}
                  placeholder={t('job_form.schedule.break_time_placeholder')}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          {/* Auto Schedule Section */}
          <View style={styles.switchContainer}>
            <View style={styles.switchContent}>
              <Text style={styles.switchLabel}>{t('job_form.schedule.auto_schedule')}</Text>
              <Text style={styles.switchDescription}>{t('job_form.schedule.auto_schedule_desc')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.switch, formData.schedule?.autoSchedule && styles.switchActive]}
              onPress={() => {
                const newValue = !formData.schedule?.autoSchedule;
                if (newValue && !isSubscribed) {
                  setShowPremiumModal(true);
                } else {
                  updateNestedData('schedule', 'autoSchedule', newValue);
                }
              }}
            >
              <View style={[styles.switchThumb, formData.schedule?.autoSchedule && styles.switchThumbActive]} />
            </TouchableOpacity>
          </View>

          {/* Month Selector for Calendar Sync */}
          {formData.schedule?.autoSchedule && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  <IconSymbol size={16} name="calendar" color={colors.primary} /> 
                  {t('job_form.schedule.sync_month')} 
                  {selectedSyncMonths.length > 1 && `(${selectedSyncMonths.length})`}
                </Text>
                <ScrollView 
                  ref={monthScrollViewRef}
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -4 }}
                  onLayout={() => {
                    // Auto-scroll to current month when the ScrollView is ready
                    setTimeout(() => {
                      // Each month button is approximately 80px wide (padding + text)
                      const monthButtonWidth = 80;
                      const currentMonth = new Date().getMonth();
                      // Scroll to show current month centered
                      const scrollPosition = Math.max(0, (currentMonth * monthButtonWidth) - 100);
                      monthScrollViewRef.current?.scrollTo({ x: scrollPosition, animated: true });
                    }, 100);
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                    {[
                      t('chatbot.months.january'), t('chatbot.months.february'), t('chatbot.months.march'),
                      t('chatbot.months.april'), t('chatbot.months.may'), t('chatbot.months.june'),
                      t('chatbot.months.july'), t('chatbot.months.august'), t('chatbot.months.september'),
                      t('chatbot.months.october'), t('chatbot.months.november'), t('chatbot.months.december')
                    ].map((month, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.monthButton,
                          selectedSyncMonths.includes(index) && styles.monthButtonActive
                        ]}
                        onPress={() => {
                          if (selectedSyncMonths.includes(index)) {
                            // Deselect month (but keep at least one selected)
                            if (selectedSyncMonths.length > 1) {
                              setSelectedSyncMonths(selectedSyncMonths.filter(m => m !== index));
                            }
                          } else {
                            // Select month
                            setSelectedSyncMonths([...selectedSyncMonths, index].sort((a, b) => a - b));
                          }
                        }}
                      >
                        <Text style={[
                          styles.monthButtonText,
                          selectedSyncMonths.includes(index) && styles.monthButtonTextActive
                        ]}>
                          {month}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <Text style={styles.helperText}>
                  {selectedSyncMonths.length === 1 
                    ? t('job_form.schedule.sync_month_helper')
                    : t('job_form.schedule.sync_months_selected', { count: selectedSyncMonths.length })
                  }
                </Text>
              </View>
            </>
          )}

          {/* Sync with Calendar Button */}
          {formData.schedule?.autoSchedule && (
            <TouchableOpacity
              style={[
                styles.syncButton,
                isSyncing && styles.syncButtonLoading,
                syncSuccess && styles.syncButtonSuccess
              ]}
              onPress={async () => {
                if (isSyncing) return;
                
                setIsSyncing(true);
                
                // Generate schedule for selected month
                try {
                  // Save current job first if there are changes
                  if (editingJob) {
                    await handleSave();
                  }
                  
                  // Generate schedule for selected months
                  const currentYear = new Date().getFullYear();
                  for (const month of selectedSyncMonths) {
                    await AutoScheduleService.generateScheduleForMonth(
                      editingJob || formData as Job,
                      month,
                      currentYear
                    );
                  }
                  
                  setIsSyncing(false);
                  setSyncSuccess(true);
                  
                  // Reset to normal state after 2 seconds
                  setTimeout(() => {
                    setSyncSuccess(false);
                    // Navigate to calendar
                    if (onNavigateToCalendar) {
                      onClose();
                      setTimeout(() => {
                        onNavigateToCalendar();
                      }, 300);
                    }
                  }, 2000);
                } catch (error) {
                  console.error('Error syncing calendar:', error);
                  setIsSyncing(false);
                  Alert.alert(
                    t('job_form.errors.error_title'),
                    t('job_form.schedule.sync_error')
                  );
                }
              }}
              disabled={isSyncing || syncSuccess}
            >
              <View style={styles.syncButtonContent}>
                {isSyncing ? (
                  <>
                    <IconSymbol 
                      size={20} 
                      name="arrow.trianglehead.2.clockwise" 
                      color="#FFF" 
                    />
                    <Text style={styles.syncButtonText}>
                      {t('job_form.schedule.syncing')}
                    </Text>
                  </>
                ) : syncSuccess ? (
                  <>
                    <IconSymbol 
                      size={20} 
                      name="checkmark.circle.fill" 
                      color="#FFF" 
                    />
                    <Text style={styles.syncButtonText}>
                      {t('job_form.schedule.sync_success')}
                    </Text>
                  </>
                ) : (
                  <>
                    <IconSymbol 
                      size={20} 
                      name="calendar" 
                      color="#FFF" 
                    />
                    <Text style={styles.syncButtonText}>
                      {t('job_form.schedule.sync_calendar')}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          )}
        </>
        )}
      </BlurView>
    </ScrollView>
  );



  const renderFinancialTab = () => (
    <ScrollView 
      style={styles.tabContent} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={true}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.section}>
        <Text style={styles.sectionTitle}>{t('job_form.financial.title')}</Text>
        
        <View style={styles.inputGroup}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>{t('job_form.financial.enabled')}</Text>
            <Switch
              value={formData.salary?.enabled}
              onValueChange={(value) => {
                if (value && !isSubscribed) {
                  setShowPremiumModal(true);
                } else {
                  updateNestedData('salary', 'enabled', value)
                }
              }}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor="#ffffffff"
            />
          </View>
        </View>

        {formData.salary?.enabled && (
          <>
            {/* Currency Section */}
            <View style={styles.financialCard}>
              <View style={styles.financialCardHeader}>
                <IconSymbol size={20} name="dollarsign.circle.fill" color={colors.primary} />
                <Text style={styles.financialCardTitle}>{t('job_form.financial.currency_label')}</Text>
              </View>
              <View style={styles.currencyInputContainer}>
                <TextInput
                  style={styles.currencyInput}
                  value={formData.salary?.currency || ''}
                  onChangeText={(value) => updateNestedData('salary', 'currency', value)}
                  placeholder="EUR"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={3}
                />
              </View>
            </View>

            {/* Salary Type Section */}
            <View style={styles.financialCard}>
              <View style={styles.financialCardHeader}>
                <IconSymbol size={20} name="clock.fill" color={colors.primary} />
                <Text style={styles.financialCardTitle}>{t('job_form.financial.payment_type')}</Text>
              </View>
              <View style={styles.salaryTypeSelector}>
                {[
                  { key: 'hourly', label: t('job_form.financial.per_hour'), icon: '⏰' },
                  { key: 'monthly', label: t('job_form.financial.per_month'), icon: '📅' },
                  { key: 'annual', label: t('job_form.financial.per_year'), icon: '📊' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.salaryTypeOption,
                      formData.salary?.type === option.key && styles.salaryTypeOptionActive,
                    ]}
                    onPress={() => updateNestedData('salary', 'type', option.key)}
                  >
                    <Text style={styles.salaryTypeIcon}>{option.icon}</Text>
                    <Text
                      style={[
                        styles.salaryTypeText,
                        formData.salary?.type === option.key && styles.salaryTypeTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amount Section */}
            <View style={styles.financialCard}>
              <View style={styles.financialCardHeader}>
                <IconSymbol size={20} name="banknote.fill" color={colors.primary} />
                <Text style={styles.financialCardTitle}>
                  {formData.salary?.type === 'hourly' ? t('job_form.financial.amount_per_hour') :
                   formData.salary?.type === 'monthly' ? t('job_form.financial.amount_per_month') : t('job_form.financial.amount_per_year')}
                </Text>
              </View>
              <View style={styles.amountInputContainer}>
                <View style={styles.currencySymbol}>
                  <Text style={styles.currencySymbolText}>{formData.salary?.currency || 'EUR'}</Text>
                </View>
                <TextInput
                  style={styles.amountInput}
                  value={formData.salary?.amount ? String(formData.salary.amount) : ''}
                  onChangeText={(value) => updateNestedData('salary', 'amount', Number(value) || 0)}
                  placeholder={
                    formData.salary?.type === 'hourly' ? '15' :
                    formData.salary?.type === 'monthly' ? '1800' : '35000'
                  }
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                />
                <View style={styles.periodIndicator}>
                  <Text style={styles.periodIndicatorText}>
                    /{formData.salary?.type === 'hourly' ? t('job_form.financial.period_hour') :
                      formData.salary?.type === 'monthly' ? t('job_form.financial.period_month') : 
                      t('job_form.financial.period_year')}
                  </Text>
                </View>
              </View>
              <Text style={styles.amountHelper}>
                {formData.salary?.type === 'hourly' ? t('job_form.financial.amount_helper_hourly') :
                 formData.salary?.type === 'monthly' ? t('job_form.financial.amount_helper_monthly') : 
                 t('job_form.financial.amount_helper_annual')}
              </Text>
            </View>

          </>
        )}
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
              onValueChange={(value) => {
                if (value && !isSubscribed) {
                  setShowPremiumModal(true);
                } else {
                  updateNestedData('billing', 'enabled', value)
                }
              }}
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

      {formData.billing?.enabled && (
        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.section}>
          <Text style={styles.sectionTitle}>{t('job_form.billing.user_data.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('job_form.billing.user_data.subtitle')}</Text>
          
          <View style={styles.inputGroup}>
            <View style={styles.switchRow}>
              <View style={styles.switchContent}>
                <Text style={styles.label}>{t('job_form.billing.user_data.is_company')}</Text>
                <Text style={styles.labelDescription}>{t('job_form.billing.user_data.is_company_desc')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.switch, formData.billing?.userData?.isCompany && styles.switchActive]}
                onPress={() => {
                  const newValue = !formData.billing?.userData?.isCompany;
                  updateNestedData('billing', 'userData', {
                    ...formData.billing?.userData,
                    isCompany: newValue
                  });
                }}
              >
                <View style={[styles.switchThumb, formData.billing?.userData?.isCompany && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>

          {formData.billing?.userData?.isCompany ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  <IconSymbol size={16} name="building.2" color={colors.primary} /> {t('job_form.billing.user_data.company_name')}
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.billing?.userData?.companyName}
                  onChangeText={(value) => updateNestedData('billing', 'userData', {
                    ...formData.billing?.userData,
                    companyName: value
                  })}
                  placeholder={t('job_form.billing.user_data.company_name_placeholder')}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('job_form.billing.user_data.tax_id')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.billing?.userData?.taxId}
                  onChangeText={(value) => updateNestedData('billing', 'userData', {
                    ...formData.billing?.userData,
                    taxId: value
                  })}
                  placeholder={t('job_form.billing.user_data.tax_id_placeholder')}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              {/* Company Logo Section */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  <IconSymbol size={16} name="photo" color={colors.primary} /> Logo de empresa (opcional)
                </Text>
                <Text style={styles.labelDescription}>Añadir logo para incluir en reportes PDF</Text>
                
                {formData.billing?.userData?.logoUrl ? (
                  <View style={styles.logoContainer}>
                    <Image
                      source={{ uri: formData.billing.userData.logoUrl }}
                      style={styles.logoPreview}
                      resizeMode="contain"
                    />
                    <View style={styles.logoActions}>
                      <TouchableOpacity
                        style={styles.logoActionButton}
                        onPress={pickCompanyLogo}
                      >
                        <IconSymbol size={16} name="pencil" color={colors.primary} />
                        <Text style={styles.logoActionText}>Cambiar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.logoActionButton, styles.logoRemoveButton]}
                        onPress={() => updateNestedData('billing', 'userData', {
                          ...formData.billing?.userData,
                          logoUrl: ''
                        })}
                      >
                        <IconSymbol size={16} name="trash" color={colors.error} />
                        <Text style={[styles.logoActionText, { color: colors.error }]}>Quitar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.logoPickerButton}
                    onPress={pickCompanyLogo}
                  >
                    <IconSymbol size={24} name="photo.badge.plus" color={colors.textSecondary} />
                    <Text style={styles.logoPickerText}>Seleccionar logo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <IconSymbol size={16} name="person" color={colors.primary} /> {t('job_form.billing.user_data.full_name')}
              </Text>
              <TextInput
                style={styles.input}
                value={formData.billing?.userData?.name}
                onChangeText={(value) => updateNestedData('billing', 'userData', {
                  ...formData.billing?.userData,
                  name: value
                })}
                placeholder={t('job_form.billing.user_data.full_name_placeholder')}
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <IconSymbol size={16} name="location" color={colors.primary} /> {t('job_form.billing.user_data.address')}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.billing?.userData?.address}
              onChangeText={(value) => updateNestedData('billing', 'userData', {
                ...formData.billing?.userData,
                address: value
              })}
              placeholder={t('job_form.billing.user_data.address_placeholder')}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <IconSymbol size={16} name="phone" color={colors.primary} /> {t('job_form.billing.user_data.phone')}
            </Text>
            <TextInput
              style={styles.input}
              value={formData.billing?.userData?.phone}
              onChangeText={(value) => updateNestedData('billing', 'userData', {
                ...formData.billing?.userData,
                phone: value
              })}
              placeholder={t('job_form.billing.user_data.phone_placeholder')}
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <IconSymbol size={16} name="envelope" color={colors.primary} /> {t('job_form.billing.user_data.email')}
            </Text>
            <TextInput
              style={styles.input}
              value={formData.billing?.userData?.email}
              onChangeText={(value) => updateNestedData('billing', 'userData', {
                ...formData.billing?.userData,
                email: value
              })}
              placeholder={t('job_form.billing.user_data.email_placeholder')}
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Professional Information Section */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <IconSymbol size={16} name="globe" color={colors.primary} /> {t('job_form.billing.user_data.website')}
            </Text>
            <TextInput
              style={styles.input}
              value={formData.billing?.userData?.website}
              onChangeText={(value) => updateNestedData('billing', 'userData', {
                ...formData.billing?.userData,
                website: value
              })}
              placeholder={t('job_form.billing.user_data.website_placeholder')}
              placeholderTextColor={colors.textTertiary}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          {/* Banking Information Section */}
          <View style={styles.inputGroup}>
            <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 12, marginTop: 8 }]}>
              🏦 {t('job_form.billing.user_data.banking_info')}
            </Text>
            <Text style={styles.labelDescription}>
              {t('job_form.billing.user_data.banking_desc')}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <IconSymbol size={16} name="creditcard" color={colors.primary} /> {t('job_form.billing.user_data.bank_account')}
            </Text>
            <TextInput
              style={styles.input}
              value={formData.billing?.userData?.bankAccount}
              onChangeText={(value) => updateNestedData('billing', 'userData', {
                ...formData.billing?.userData,
                bankAccount: value
              })}
              placeholder={t('job_form.billing.user_data.bank_account_placeholder')}
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <IconSymbol size={16} name="building.2" color={colors.primary} /> {t('job_form.billing.user_data.bank_name')}
            </Text>
            <TextInput
              style={styles.input}
              value={formData.billing?.userData?.bankName}
              onChangeText={(value) => updateNestedData('billing', 'userData', {
                ...formData.billing?.userData,
                bankName: value
              })}
              placeholder={t('job_form.billing.user_data.bank_name_placeholder')}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <IconSymbol size={16} name="network" color={colors.primary} /> {t('job_form.billing.user_data.swift_code')}
            </Text>
            <TextInput
              style={styles.input}
              value={formData.billing?.userData?.swiftCode}
              onChangeText={(value) => updateNestedData('billing', 'userData', {
                ...formData.billing?.userData,
                swiftCode: value
              })}
              placeholder={t('job_form.billing.user_data.swift_code_placeholder')}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>
              <IconSymbol size={18} name="doc.text" color={colors.primary} /> {t('job_form.billing.user_data.preview_title')}
            </Text>
            <Text style={styles.previewText}>
              {formData.billing?.userData?.isCompany ? (
                `🏢 ${formData.billing?.userData?.companyName || t('job_form.billing.user_data.preview_company_name')}\n` +
                `CIF: ${formData.billing?.userData?.taxId || t('job_form.billing.user_data.preview_tax_id')}`
              ) : (
                `👤 ${formData.billing?.userData?.name || t('job_form.billing.user_data.preview_user_name')}`
              )}
              {'\n'}📍 {formData.billing?.userData?.address || t('job_form.billing.user_data.preview_address')}
              {'\n'}📞 {formData.billing?.userData?.phone || t('job_form.billing.user_data.preview_phone')}
              {'\n'}✉️ {formData.billing?.userData?.email || t('job_form.billing.user_data.preview_email')}
              {formData.billing?.userData?.website ? `\n🌐 ${formData.billing.userData.website}` : ''}
              {formData.billing?.userData?.bankAccount ? `\n\n💳 ${formData.billing.userData.bankAccount}` : ''}
              {formData.billing?.userData?.bankName ? `\n🏦 ${formData.billing.userData.bankName}` : ''}
              {formData.billing?.userData?.swiftCode ? `\n🔗 SWIFT: ${formData.billing.userData.swiftCode}` : ''}
              {'\n\n'}{t('job_form.billing.user_data.preview_prefix')}: {formData.billing?.invoicePrefix || 'INV'}
              {'\n'}{t('job_form.billing.user_data.preview_taxes')}: {formData.billing?.taxRate || 0}%
            </Text>
          </View>
        </BlurView>
      )}
    </ScrollView>
  );

  const renderAutoTab = () => {
    const hasAddress = () => {
      return !!(formData.address?.trim() || 
                formData.street?.trim() || 
                formData.city?.trim() || 
                formData.postalCode?.trim());
    };

    const formatTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // Helper function to calculate distance between two coordinates
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3; // Earth radius in meters
      const φ1 = lat1 * Math.PI/180;
      const φ2 = lat2 * Math.PI/180;
      const Δφ = (lat2-lat1) * Math.PI/180;
      const Δλ = (lon2-lon1) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c; // Distance in meters
    };

    const handleAutoTimerToggle = async (value: boolean) => {
      if (!hasLocationPermission) {
        // No hacer nada si no hay permisos de ubicación
        return;
      }
      if (value && !hasAddress()) {
        Alert.alert(
          t('job_form.auto_timer.address_required_title'),
          t('job_form.auto_timer.address_required_message'),
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
      
      // Si se está ACTIVANDO el AutoTimer, mostrar mensaje si está fuera del radio
      if (value) {
        // Actualizar el estado primero para activar el AutoTimer
        updateNestedData('autoTimer', 'enabled', true);
        
        // Verificar si el usuario está fuera del radio del trabajo
        if (userLocation && jobCoordinates) {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            jobCoordinates.latitude,
            jobCoordinates.longitude
          );
          
          const radius = formData.autoTimer?.geofenceRadius || 100;
          const isInsideRadius = distance <= radius;
          
          // Mostrar alerta si está fuera del radio
          if (!isInsideRadius) {
            setShowAutoTimerAlert(true);
            setHasShownAutoTimerAlert(true);
          }
        }
      } else {
        // Si se está desactivando, actualizar el estado
        updateNestedData('autoTimer', 'enabled', false);
      }
      
      // Si se está ACTIVANDO el AutoTimer, verificar si otro trabajo ya lo tiene activado
      if (value && editingJob) {
        try {
          const allJobs = await JobService.getJobs();
          const jobWithAutoTimer = allJobs.find(job => 
            job.id !== editingJob.id && job.autoTimer?.enabled
          );
          
          if (jobWithAutoTimer) {
            Alert.alert(
              t('job_form.auto_timer.only_one_active'),
              t('job_form.auto_timer.only_one_active_message', { jobName: jobWithAutoTimer.name }),
              [
                { text: t('common.cancel'), style: 'cancel' },
                { 
                  text: t('job_form.auto_timer.deactivate_other'), 
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Primero, parar cualquier timer activo del otro trabajo
                      const activeSession = await JobService.getActiveSession();
                      if (activeSession && activeSession.jobId === jobWithAutoTimer.id) {
                        console.log('🛑 JobFormModal: Stopping active timer for other job because AutoTimer is being switched');
                        await JobService.clearActiveSession();
                      }
                      
                      // También cancelar cualquier AutoTimer activo para el otro trabajo
                      const autoTimerService = AutoTimerService.getInstance();
                      await autoTimerService.cancelPendingAction();
                      
                      // Detener el servicio AutoTimer
                      autoTimerService.stop();
                      
                      // Poner el sistema en modo manual
                      await autoTimerService.setManualMode();
                      
                      // Desactivar el AutoTimer del otro trabajo
                      const updatedOtherJob = {
                        ...jobWithAutoTimer,
                        autoTimer: {
                          enabled: false,
                          geofenceRadius: jobWithAutoTimer.autoTimer?.geofenceRadius || 100,
                          delayStart: jobWithAutoTimer.autoTimer?.delayStart || 0,
                          delayStop: jobWithAutoTimer.autoTimer?.delayStop || 0,
                          notifications: jobWithAutoTimer.autoTimer?.notifications !== false
                        }
                      };
                      await JobService.updateJob(jobWithAutoTimer.id, updatedOtherJob);
                      console.log(`🔄 AutoTimer desactivado para: ${jobWithAutoTimer.name}`);
                      
                      // Activar el AutoTimer para el trabajo actual
                      updateNestedData('autoTimer', 'enabled', true);
                    } catch (error) {
                      console.error('Error switching AutoTimer between jobs:', error);
                    }
                  }
                }
              ]
            );
            return;
          }
        } catch (error) {
          console.error('Error checking for other jobs with AutoTimer:', error);
        }
      }
      
      // Si se está desactivando el AutoTimer, mostrar confirmación
      if (!value && editingJob) {
        Alert.alert(
          t('timer.auto_timer.manual_override'),
          t('timer.auto_timer.manual_override_message'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { 
              text: t('timer.stop'), 
              style: 'destructive',
              onPress: async () => {
                try {
                  const activeSession = await JobService.getActiveSession();
                  if (activeSession && activeSession.jobId === editingJob.id) {
                    console.log('🛑 JobFormModal: Stopping active timer because AutoTimer was disabled');
                    
                    // Calcular el tiempo transcurrido
                    const sessionStart = new Date(activeSession.startTime);
                    const now = new Date();
                    const elapsedMs = now.getTime() - sessionStart.getTime();
                    const elapsedHours = Math.max(0.01, parseFloat(((elapsedMs / (1000 * 60 * 60))).toFixed(2)));
                    
                    // Guardar el día de trabajo antes de limpiar la sesión
                    const today = new Date().toISOString().split('T')[0];
                    const workDay = {
                      date: today,
                      jobId: editingJob.id,
                      hours: elapsedHours,
                      notes: activeSession.notes || 'Auto-stopped (AutoTimer disabled)',
                      overtime: elapsedHours > 8,
                      type: 'work' as const,
                      // Add actual start and end times for display in reports
                      actualStartTime: sessionStart.toTimeString().substring(0, 5), // HH:MM format
                      actualEndTime: now.toTimeString().substring(0, 5), // HH:MM format
                    };
                    await JobService.addWorkDay(workDay);
                    
                    // Limpiar la sesión activa
                    await JobService.clearActiveSession();
                    
                    // IMPORTANTE: Enviar notificación que terminará el Live Activity
                    const NotificationService = require('../services/NotificationService').default;
                    const notificationService = NotificationService.getInstance();
                    await notificationService.sendNotification('timer_stopped', editingJob.name, {
                      hours: elapsedHours.toFixed(2),
                      reason: 'AutoTimer was disabled'
                    });
                    console.log('📱 Notification sent to stop Live Activity');
                    
                    // También intentar terminar directamente (por si la notificación no funciona)
                    const LiveActivityService = require('../services/LiveActivityService').default;
                    const liveActivityService = LiveActivityService.getInstance();
                    await liveActivityService.endLiveActivity(Math.floor(elapsedHours * 3600));
                  }
                  
                  // También cancelar cualquier AutoTimer activo para este trabajo
                  const autoTimerService = AutoTimerService.getInstance();
                  await autoTimerService.cancelPendingAction();
                  
                  // Detener el servicio AutoTimer
                  autoTimerService.stop();
                  
                  // Poner el sistema en modo manual
                  await autoTimerService.setManualMode();
                  
                  // Desactivar completamente el AutoTimer
                  updateNestedData('autoTimer', 'enabled', false);
                } catch (error) {
                  console.error('Error stopping timer when disabling AutoTimer:', error);
                }
              }
            }
          ]
        );
        return;
      }
      
      updateNestedData('autoTimer', 'enabled', value);
    };

    const openSettings = () => {
      Linking.openSettings();
    };

    // Funciones para manejar modos de AutoTimer
    const handleModeSelection = async (mode: AutoTimerMode) => {
      console.log('🔧 Seleccionando modo AutoTimer:', mode);
      
      if (mode === 'foreground-only') {
        // Modo que no requiere permisos adicionales
        setSelectedAutoTimerMode(mode);
        const modeService = AutoTimerModeService.getInstance();
        const result = await modeService.setAutoTimerModeWithoutPermissions(mode, false);
        
        if (!result.success) {
          console.error('Error configurando modo AutoTimer:', result.message);
        }
      } else if (mode === 'background-allowed') {
        // EXACTAMENTE LA MISMA LÓGICA QUE full-background - necesita permisos "Always"
        const modeService = AutoTimerModeService.getInstance();
        const hasPermission = await modeService.checkBackgroundPermissions();
        
        if (hasPermission) {
          // Ya tiene permisos Always - configurar directamente
          setSelectedAutoTimerMode(mode);
          setHasBackgroundPermission(true);
          await modeService.setAutoTimerModeWithoutPermissions(mode, true);
          console.log('✅ AutoTimer configurado en modo "App Abierta + Minimizada"');
        } else {
          // Mostrar explicación antes de pedir permiso Always
          Alert.alert(
            t('job_form.auto_timer.permissions_required_title'),
            t('job_form.auto_timer.background_permissions_explanation'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { 
                text: t('job_form.auto_timer.permissions_grant_button'), 
                onPress: async () => await requestBackgroundPermissionForBackgroundAllowed(mode)
              }
            ]
          );
        }
        return;
      } else if (mode === 'full-background') {
        // Verificar si ya tiene permisos
        const modeService = AutoTimerModeService.getInstance();
        const hasPermission = await modeService.checkBackgroundPermissions();
        
        if (hasPermission) {
          setSelectedAutoTimerMode(mode);
          setHasBackgroundPermission(true);
          await modeService.setAutoTimerModeWithoutPermissions(mode, true);
          
          // Ajustar radio del geofence a mínimo 50m para modo full-background
          const currentRadius = formData.autoTimer?.geofenceRadius || 50;
          if (currentRadius < 50) {
            updateNestedData('autoTimer', 'geofenceRadius', 50);
            console.log('📍 Radio del geofence ajustado a 50m para modo "Siempre Activo"');
          }
          
          console.log('✅ AutoTimer configurado en modo "Siempre Activo"');
        } else {
          // Mostrar explicación antes de pedir permiso
          Alert.alert(
            t('job_form.auto_timer.permissions_required_title'),
            t('job_form.auto_timer.permissions_required_message'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { 
                text: t('job_form.auto_timer.permissions_grant_button'), 
                onPress: async () => await requestBackgroundPermissionForMode(mode)
              }
            ]
          );
        }
      }
    };

    const requestBackgroundPermissionForBackgroundAllowed = async (mode: AutoTimerMode) => {
      try {
        // EXACTAMENTE LA MISMA LÓGICA QUE full-background - pedir permisos "Always"
        const { status } = await Location.requestBackgroundPermissionsAsync();
        
        if (status === 'granted') {
          // Éxito - configurar modo
          setSelectedAutoTimerMode(mode);
          setHasBackgroundPermission(true);
          const modeService = AutoTimerModeService.getInstance();
          await modeService.setAutoTimerModeWithoutPermissions(mode, true);
          console.log('✅ AutoTimer configurado en modo "App Abierta + Minimizada" con permisos Always');
        } else {
          // Permisos denegados - mostrar alerta con botón de Ajustes (IGUAL QUE full-background)
          Alert.alert(
            t('job_form.auto_timer.permissions_needed_title'),
            t('job_form.auto_timer.permissions_needed_message'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { 
                text: t('job_form.auto_timer.permissions_open_settings'), 
                onPress: () => Linking.openSettings()
              }
            ]
          );
        }
      } catch (error) {
        console.error('❌ Error en requestBackgroundPermissionForBackgroundAllowed:', error);
        Alert.alert(
          t('common.error'),
          t('job_form.auto_timer.permission_error'),
          [{ text: t('common.ok') }]
        );
      }
    };

    const requestBackgroundPermissionForMode = async (mode: AutoTimerMode) => {
      try {
        // Pedir permisos directamente aquí
        const { status } = await Location.requestBackgroundPermissionsAsync();
        
        if (status === 'granted') {
          // Éxito - configurar modo
          setSelectedAutoTimerMode(mode);
          setHasBackgroundPermission(true);
          const modeService = AutoTimerModeService.getInstance();
          await modeService.setAutoTimerModeWithoutPermissions(mode, true);
          
          // Ajustar radio del geofence a mínimo 50m para modo full-background
          const currentRadius = formData.autoTimer?.geofenceRadius || 50;
          if (currentRadius < 50) {
            updateNestedData('autoTimer', 'geofenceRadius', 50);
            console.log('📍 Radio del geofence ajustado a 50m para modo "Siempre Activo"');
          }
          
          console.log('✅ AutoTimer configurado correctamente con permisos de background');
        } else {
          // Permisos denegados - mostrar alerta con botón de Ajustes
          Alert.alert(
            t('job_form.auto_timer.permissions_needed_title'),
            t('job_form.auto_timer.permissions_needed_message'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { 
                text: t('job_form.auto_timer.permissions_open_settings'), 
                onPress: () => Linking.openSettings()
              }
            ]
          );
        }
      } catch (error) {
        console.error('Error requesting background permission:', error);
        Alert.alert('Error', 'Hubo un problema configurando los permisos');
      }
    };

    const handleAutoTimerToggleWithPermissionCheck = async (value: boolean) => {
      if (!hasLocationPermission && value) {
        Alert.alert(
          t('maps.auto_timer_location_required_title'),
          t('maps.auto_timer_location_required_message'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { 
              text: t('maps.auto_timer_open_settings'), 
              onPress: () => {
                openSettings();
                // Los permisos se verificarán automáticamente cuando la app vuelva a estar activa
              }
            }
          ]
        );
        return;
      }
      
      // Verificar suscripción premium antes de activar
      if (value && !isSubscribed) {
        setShowPremiumModal(true);
      } else {
        handleAutoTimerToggle(value);
      }
    };

    return (
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.OS === 'ios' && Platform.isPad ? 100 : 20 }}
        showsVerticalScrollIndicator={false}>
        {/* AutoTimer Alert */}
        {showAutoTimerAlert && formData.autoTimer?.enabled && (
          <View style={{
            marginHorizontal: 16,
            marginTop: 16,
            marginBottom: 8,
            backgroundColor: isDark ? 'rgba(255, 149, 0, 0.95)' : 'rgba(255, 149, 0, 0.95)',
            borderRadius: 16,
            padding: 16,
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'space-between',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 4,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <IconSymbol size={24} name="clock.badge.exclamationmark" color="#FFFFFF" />
              <Text style={{
                fontSize: 14,
                color: '#FFFFFF',
                fontWeight: '600',
                flex: 1,
                lineHeight: 18,
                marginLeft: 12,
              }}>
                {t('timer.auto_timer.activation_alert')}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => {
                setShowAutoTimerAlert(false);
                // Reset after some time to show again if needed
                setTimeout(() => {
                  setHasShownAutoTimerAlert(false);
                }, 60000); // Reset after 1 minute
              }}
            >
              <Text style={{
                fontSize: 14,
                color: '#FFFFFF',
                fontWeight: '700',
              }}>
                {t('timer.auto_timer.dismiss_notice')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.section}>
          <Text style={styles.sectionTitle}>{t('job_form.auto_timer.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('job_form.auto_timer.subtitle')}</Text>

          {!hasLocationPermission ? (
            <View style={styles.locationDisabledContainer}>
              <View style={styles.locationDisabledIcon}>
                <IconSymbol size={32} name="location.slash" color={colors.error} />
              </View>
              <Text style={styles.locationDisabledTitle}>
                {t('maps.auto_timer_location_required_title')}
              </Text>
              <Text style={styles.locationDisabledDescription}>
                {t('maps.auto_timer_location_required_message')}
              </Text>
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={openSettings}
              >
                <IconSymbol size={18} name="gear" color="#FFFFFF" />
                <Text style={styles.settingsButtonText}>
                  {t('maps.auto_timer_open_settings')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                  <View style={styles.switchContent}>
                    <Text style={styles.label}>{t('job_form.auto_timer.enabled')}</Text>
                    <Text style={styles.labelDescription}>{t('job_form.auto_timer.enabled_desc')}</Text>
                  </View>
                  <Switch
                    value={formData.autoTimer?.enabled || false}
                    onValueChange={handleAutoTimerToggleWithPermissionCheck}
                    trackColor={{ false: colors.separator, true: colors.primary + '40' }}
                    thumbColor={formData.autoTimer?.enabled ? colors.primary : colors.textTertiary}
                  />
                </View>
              </View>
 

              {/* Sección de selección de modo AutoTimer */}
              {formData.autoTimer?.enabled && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('job_form.auto_timer.mode_section_title')}</Text>
                  <Text style={styles.labelDescription}>
                    {t('job_form.auto_timer.mode_section_description')}
                  </Text>
                  
                  {/* Modo 1: Solo app abierta */}
                  <TouchableOpacity 
                    style={[
                      styles.modeOption, 
                      selectedAutoTimerMode === 'foreground-only' && styles.modeOptionSelected
                    ]}
                    onPress={() => handleModeSelection('foreground-only')}
                  >
                    <View style={styles.modeOptionContent}>
                      <View style={styles.modeOptionHeader}>
                        <Text style={styles.modeOptionIcon}>📱</Text>
                        <Text style={styles.modeOptionTitle}>{t('job_form.auto_timer.mode_foreground_title')}</Text>
                        <View style={[
                          styles.radioButton,
                          selectedAutoTimerMode === 'foreground-only' && styles.radioButtonSelected
                        ]}>
                          {selectedAutoTimerMode === 'foreground-only' && (
                            <View style={styles.radioButtonInner} />
                          )}
                        </View>
                      </View>
                      <Text style={styles.modeOptionDescription}>
                        {t('job_form.auto_timer.mode_foreground_description')}
                      </Text>
                      <Text style={styles.modeOptionDetails}>
                        {t('job_form.auto_timer.mode_foreground_details')}
                      </Text>
                    </View>
                  </TouchableOpacity>


                  {/* Modo 3: Siempre activo (requiere permisos) */}
                  <TouchableOpacity 
                    style={[
                      styles.modeOption, 
                      selectedAutoTimerMode === 'full-background' && styles.modeOptionSelected
                    ]}
                    onPress={() => handleModeSelection('full-background')}
                  >
                    <View style={styles.modeOptionContent}>
                       <Text style={styles.modeOptionTitle}>🔄   {t('job_form.auto_timer.mode_background_title')}</Text>
                      <View style={styles.modeOptionHeader}>
                        
                        <Text style={styles.modeOptionIcon}>🌍</Text>
                        
                        <Text style={styles.modeOptionTitle}>{t('job_form.auto_timer.mode_full_background_title')}</Text>
                        <View style={[
                          styles.radioButton,
                          selectedAutoTimerMode === 'full-background' && styles.radioButtonSelected
                        ]}>
                          {selectedAutoTimerMode === 'full-background' && (
                            <View style={styles.radioButtonInner} />
                          )}
                        </View>
                      </View>
                      <Text style={styles.modeOptionDescription}>
                        {t('job_form.auto_timer.mode_full_background_description')}
                      </Text>
                      <Text style={styles.modeOptionDetails}>
                        {t('job_form.auto_timer.mode_full_background_details')}
                      </Text>
                      {selectedAutoTimerMode === 'full-background' && !hasBackgroundPermission && (
                        <View style={styles.permissionWarning}>
                          <IconSymbol size={16} name="exclamationmark.triangle" color={colors.warning} />
                          <Text style={styles.permissionWarningText}>
                            {t('job_form.auto_timer.permissions_pending_warning')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              )}
          
            </>
          )}



        {formData.autoTimer?.enabled && (
          <>
            <View style={styles.inputGroup}>
                          {/* Delay Start Control */}
            
            {/* Ocultar controles de delay en modo app cerrada (full-background) */}
            {selectedAutoTimerMode !== 'full-background' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('job_form.auto_timer.delay_start')}</Text>
                  <Text style={styles.labelDescription}>{t('job_form.auto_timer.delay_start_desc')}</Text>
                  <View style={styles.counterContainer}>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => {
                        const currentValue = formData.autoTimer?.delayStart ?? 0;
                        const newValue = Math.max(0, currentValue - 1);
                        console.log('🔧 DelayStart MINUS: currentValue=', currentValue, 'newValue=', newValue);
                        console.log('🔧 FormData.autoTimer before update:', formData.autoTimer);
                        updateNestedData('autoTimer', 'delayStart', newValue);
                      }}
                    >
                      <IconSymbol size={20} name="minus" color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.counterText}>{(() => {
                      const value = formData.autoTimer?.delayStart;
                      console.log('🔧 UI DelayStart display value:', value, 'type:', typeof value, 'formData.autoTimer:', formData.autoTimer);
                      return value ?? 0;
                    })()} min</Text>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => {
                        const currentValue = formData.autoTimer?.delayStart ?? 0;
                        const newValue = Math.min(10, currentValue + 1);
                        console.log('🔧 DelayStart PLUS: currentValue=', currentValue, 'newValue=', newValue);
                        console.log('🔧 FormData.autoTimer before update:', formData.autoTimer);
                        updateNestedData('autoTimer', 'delayStart', newValue);
                      }}
                    >
                      <IconSymbol size={20} name="plus" color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  
                </View>

                {/* Delay Stop Control */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('job_form.auto_timer.delay_stop')}</Text>
                  <Text style={styles.labelDescription}>{t('job_form.auto_timer.delay_stop_desc')}</Text>
                  <View style={styles.counterContainer}>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => {
                        const currentValue = formData.autoTimer?.delayStop ?? 0;
                        const newValue = Math.max(0, currentValue - 1);
                        updateNestedData('autoTimer', 'delayStop', newValue);
                      }}
                    >
                      <IconSymbol size={20} name="minus" color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.counterText}>{formData.autoTimer?.delayStop ?? 0} min</Text>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => {
                        const currentValue = formData.autoTimer?.delayStop ?? 0;
                        const newValue = Math.min(10, currentValue + 1);
                        updateNestedData('autoTimer', 'delayStop', newValue);
                      }}
                    >
                      <IconSymbol size={20} name="plus" color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                     <View style={styles.previewCard}>

              <Text style={styles.previewText}>
                           <Text style={styles.previewTitle}>🕑 </Text>
                {t('job_form.auto_timer.preview', {
                  delayStart: formData.autoTimer?.delayStart ?? 2,
                  delayStop: formData.autoTimer?.delayStop ?? 2
                })}
              </Text>
             
            </View>
            
                </View>
              </>
            )}
              <Text style={styles.label}>{t('job_form.auto_timer.geofence_radius')}</Text>
              <Text style={styles.labelDescription}>{t('job_form.auto_timer.geofence_radius_desc')}</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity 
                  style={[
                    styles.counterButton,
                    (selectedAutoTimerMode === 'full-background' && (formData.autoTimer?.geofenceRadius || 50) <= 50) && {
                      opacity: 0.5,
                      backgroundColor: colors.border
                    }
                  ]}
                  disabled={selectedAutoTimerMode === 'full-background' && (formData.autoTimer?.geofenceRadius || 50) <= 50}
                  onPress={() => {
                    const currentValue = formData.autoTimer?.geofenceRadius || 50;
                    // Si está en modo full-background, el mínimo es 50m, sino 25m
                    const minValue = selectedAutoTimerMode === 'full-background' ? 50 : 25;
                    const newValue = Math.max(minValue, currentValue - 5);
                    updateNestedData('autoTimer', 'geofenceRadius', newValue);
                  }}
                >
                  <IconSymbol 
                    size={20} 
                    name="minus" 
                    color={
                      (selectedAutoTimerMode === 'full-background' && (formData.autoTimer?.geofenceRadius || 50) <= 50)
                        ? colors.textSecondary
                        : colors.primary
                    } 
                  />
                </TouchableOpacity>
                <View style={styles.counterValue}>
                  <Text style={styles.counterText}>{formData.autoTimer?.geofenceRadius || 50}</Text>
                  <Text style={styles.counterUnit}>{t('common.meters')}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => {
                    const currentValue = formData.autoTimer?.geofenceRadius || 50;
                    const newValue = Math.min(100, currentValue + 5);
                    updateNestedData('autoTimer', 'geofenceRadius', newValue);
                  }}
                >
                  <IconSymbol size={20} name="plus" color={colors.primary} />
                </TouchableOpacity>
              </View>
              
              {/* Indicación para modo "Siempre Activo" */}
              {selectedAutoTimerMode === 'full-background' && (
                <View style={styles.backgroundModeNotice}>
                  <IconSymbol size={16} name="info.circle" color={colors.warning} />
                  <Text style={styles.backgroundModeNoticeText}>
                    {t('job_form.auto_timer.background_mode_radius_notice')}
                  </Text>
                </View>
              )}
            </View>



            {/* Map showing job location and geofence radius */}
            {mapRegion && jobCoordinates && (
              <View style={styles.mapContainer}>
                <Text style={styles.mapTitle}>{t('job_form.auto_timer.map_title')}</Text>
                <View style={styles.mapWrapper}>
                  {activeTimerElapsed > 0 && (
                    <View style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      zIndex: 1000,
                      backgroundColor: isAutoTimerPaused ? 'rgba(255, 193, 7, 0.95)' : 'rgba(76, 217, 100, 0.95)',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 3,
                      elevation: 3,
                    }}>
                      <IconSymbol size={12} name="clock.fill" color="#FFFFFF" />
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: '#FFFFFF',
                        letterSpacing: 0.2,
                      }}>
                        {formatTime(activeTimerElapsed)}
                      </Text>
                      
                      {/* Pause/Play button */}
                      <TouchableOpacity
                        onPress={isAutoTimerPaused ? handleAutoTimerResume : handleAutoTimerPause}
                        style={{
                          marginLeft: 5,
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          borderRadius: 8,
                          padding: 4,
                        }}
                        activeOpacity={0.7}
                      >
                        <IconSymbol 
                          size={10} 
                          name={isAutoTimerPaused ? "play.fill" : "pause.fill"} 
                          color="#FFFFFF" 
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                  <MapView
                    style={styles.map}
                    region={mapRegion}
                    provider={PROVIDER_DEFAULT}
                    showsUserLocation={true}
                    showsMyLocationButton={true}
                  >
                    {/* Job location marker */}
                    <Marker
                      coordinate={jobCoordinates}
                      title={formData.name || 'Trabajo'}
                      description={`${formData.street || ''} ${formData.city || ''}`}
                    >
                      <View style={styles.markerContainer}>
                        <View style={[styles.marker, { backgroundColor: formData.color || colors.primary }]}>
                          <IconSymbol size={20} name="briefcase.fill" color="#FFFFFF" />
                        </View>
                      </View>
                    </Marker>

                    {/* Geofence radius circle */}
                    <Circle
                      center={jobCoordinates}
                      radius={formData.autoTimer?.geofenceRadius || 50}
                      fillColor={`${formData.color || colors.primary}20`}
                      strokeColor={formData.color || colors.primary}
                      strokeWidth={2}
                    />

                    {/* User location marker (if available) */}
                    {userLocation && (
                      <Marker
                        coordinate={userLocation}
                        title="Mi ubicación"
                        anchor={{ x: 0.5, y: 0.5 }}
                      >
                        <View style={styles.userMarker}>
                          <View style={styles.userMarkerDot} />
                        </View>
                      </Marker>
                    )}
                  </MapView>
                </View>
                <Text style={styles.mapDescription}>
                  {t('job_form.auto_timer.map_description', { radius: formData.autoTimer?.geofenceRadius || 50 })}
                </Text>
              </View>
            )}

            
            <View style={styles.inputGroup}>
              <View style={styles.navigationRow}>
                <View style={styles.navigationContent}>
                  <View style={styles.navigationIconContainer}>
                    <IconSymbol
                      name="bell.fill"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.navigationTextContainer}>
                    <Text style={styles.navigationLabel}>{t('job_form.auto_timer.notifications')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {notificationSettings.enabled && notificationSettings.autoTimer ? (
                        <>
                          <View style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: colors.success
                          }} />
                          <Text style={[styles.navigationDescription, { color: colors.success }]}>
                            {t('job_form.auto_timer.notifications_enabled')}
                          </Text>
                        </>
                      ) : (
                        <Text style={[styles.navigationDescription, { color: colors.textSecondary }]}>
                          {t('job_form.auto_timer.notifications_disabled')}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.navigationArrowContainer}>
                  {notificationSettings.enabled && notificationSettings.autoTimer ? (
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={20}
                      color={colors.success}
                    />
                  ) : (
                    <TouchableOpacity 
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: colors.primary,
                        borderRadius: 12
                      }}
                      onPress={() => {
                        onClose();
                        (global as any).scrollToNotifications = true;
                        navigateTo('settings');
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                        {t('job_form.auto_timer.activate_button')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </>
        )}
      </BlurView>
    </ScrollView>
    );
  };

  // Función para obtener título e icono según el tab activo
  const getTabHeaderInfo = () => {
    const tabConfig = {
      'basic': { title: t('job_form.tabs.basic'), icon: 'person.circle' },
      'schedule': { title: t('job_form.tabs.schedule'), icon: 'calendar.badge.clock' },
      'financial': { title: t('job_form.tabs.financial'), icon: 'dollarsign.circle.fill' },
      'billing': { title: t('job_form.tabs.billing'), icon: 'doc.text.fill' },
      'auto': { title: t('job_form.tabs.auto'), icon: 'location.fill' },
      'delete': { title: t('job_form.tabs.delete'), icon: 'trash.fill' }
    };
    
    return tabConfig[currentTab] || { title: t('job_form.title_edit'), icon: 'briefcase.fill' };
  };

  const renderDeleteTab = () => {
    const handleDeleteJob = async () => {
      if (!editingJob) return;
      
      if (confirmationName.trim() !== editingJob.name.trim()) {
        Alert.alert(
          t('job_form.delete.error_title'),
          t('job_form.delete.name_mismatch', { jobName: editingJob.name })
        );
        return;
      }
      
      try {
        await JobService.deleteJob(editingJob.id);
        Alert.alert(
          t('job_form.delete.success_title'),
          t('job_form.delete.success_message', { jobName: editingJob.name }),
          [
            {
              text: 'OK',
              onPress: () => {
                onSave(null); // Signal that job was deleted
                handleCloseAndNavigate();
              }
            }
          ]
        );
      } catch (error) {
        console.error('Error deleting job:', error);
        Alert.alert(
          t('job_form.delete.error_title'),
          t('job_form.delete.error_message')
        );
      }
    };

    return (
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.OS === 'ios' && Platform.isPad ? 100 : 20 }}
        showsVerticalScrollIndicator={false}>
        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.section}>
          <Text style={styles.sectionTitle}>{t('job_form.delete.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('job_form.delete.subtitle')}</Text>

          {/* Warning Section */}
          <View style={[styles.inputGroup, { backgroundColor: isDark ? 'rgba(255, 149, 0, 0.1)' : 'rgba(255, 149, 0, 0.05)', borderRadius: 16, padding: 20 }]}>
            <Text style={[styles.label, { color: colors.warning, fontSize: 18, marginBottom: 12 }]}>
              {t('job_form.delete.warning_title')}
            </Text>
            <Text style={[styles.labelDescription, { marginBottom: 16 }]}>
              {t('job_form.delete.warning_message')}
            </Text>
            
            {(t('job_form.delete.warning_items') as unknown as string[]).map((item: string, index: number) => (
              <Text key={index} style={[styles.labelDescription, { marginBottom: 8, fontSize: 14 }]}>
                {item}
              </Text>
            ))}
          </View>

          {/* Confirmation Section */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.error, fontSize: 16, marginBottom: 8 }]}>
              {t('job_form.delete.confirmation_title')}
            </Text>
            <Text style={[styles.labelDescription, { marginBottom: 16 }]}>
              {t('job_form.delete.confirmation_message')}
            </Text>
            
            <Text style={[styles.labelDescription, { fontWeight: '600', marginBottom: 8, color: colors.text }]}>
              "{editingJob?.name}"
            </Text>
            
            <TextInput
              style={[styles.input, { 
                borderColor: confirmationName.trim() === editingJob?.name.trim() ? colors.success : colors.error,
                borderWidth: 2
              }]}
              value={confirmationName}
              onChangeText={setConfirmationName}
              placeholder={t('job_form.delete.job_name_placeholder')}
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* Delete Button */}
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={[
                styles.detectLocationButton,
                { 
                  backgroundColor: confirmationName.trim() === editingJob?.name.trim() 
                    ? 'rgba(255, 59, 48, 0.15)' 
                    : 'rgba(142, 142, 147, 0.1)',
                  borderRadius: 16,
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12
                }
              ]}
              onPress={handleDeleteJob}
              disabled={confirmationName.trim() !== editingJob?.name.trim()}
            >
              <IconSymbol size={24} name="trash.fill" color={colors.error} />
              <Text style={[styles.detectLocationText, { color: colors.error }]}>
                {t('job_form.delete.delete_button')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={[
                styles.detectLocationButton,
                { 
                  backgroundColor: colors.surface, 
                  borderRadius: 16, 
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12
                }
              ]}
              onPress={handleClose}
            >
              <IconSymbol size={24} name="xmark" color={colors.textSecondary} />
              <Text style={[styles.detectLocationText, { color: colors.textSecondary }]}>
                {t('job_form.delete.cancel_button')}
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </ScrollView>
    );
  };

  const baseTabs = [
    { key: 'basic', label: t('job_form.tabs.basic'), icon: 'gear' },
    { key: 'auto', label: t('job_form.tabs.auto'), icon: 'location.fill' },
    { key: 'schedule', label: t('job_form.tabs.schedule'), icon: 'clock.fill' },
    { key: 'financial', label: t('job_form.tabs.financial'), icon: 'dollarsign.circle.fill' },
    { key: 'billing', label: t('job_form.tabs.billing'), icon: 'chart.bar.fill' },
  ];

  // Add delete tab only when editing existing job
  const tabs = editingJob 
    ? [...baseTabs, { key: 'delete', label: t('job_form.tabs.delete'), icon: 'trash.fill' }]
    : baseTabs;

  return (
    <>
      <Modal 
        visible={visible} 
        animationType="slide" 
        presentationStyle={Platform.OS === 'ios' && Platform.isPad ? "fullScreen" : "formSheet"}
        onRequestClose={onClose}
      >
      {isFirstTimeUser && !editingJob ? (
        // Show simplified form for first time users
        renderSimplifiedForm()
      ) : (
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.container}>
            {/* Show full form */}
            <View style={styles.header}>
              <View style={styles.headerTitleContainer}>
                <IconSymbol size={24} name={getTabHeaderInfo().icon as any} color={colors.primary} />
                <Text style={styles.headerTitle}>
                  {getTabHeaderInfo().title}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <View style={styles.closeButtonCircle}>
                  <IconSymbol size={20} name={formData.name?.trim() ? "checkmark" : "xmark"} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.tabsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {tabs.map((tab) => {
              const isAutoTab = tab.key === 'auto';
              const isAutoTimerEnabled = formData.autoTimer?.enabled || false;
              const isActive = currentTab === tab.key;
              
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tab,
                    isActive && styles.tabActive,
                  ]}
                  onPress={() => handleTabPress(tab.key as 'basic' | 'schedule' | 'financial' | 'billing' | 'auto' | 'delete')}
                >
                  <IconSymbol
                    size={20}
                    name={tab.icon as any}
                    color={
                      isActive 
                        ? colors.primary 
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.tabText,
                      isActive && styles.tabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {isAutoTab && isAutoTimerEnabled && (
                    <View style={[styles.autoIndicatorDot, { backgroundColor: colors.success }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <KeyboardAvoidingView 
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? (Platform.OS === 'ios' && Platform.isPad ? 80 : 100) : 0}
        >
          {currentTab === 'basic' && renderBasicTab()}
          {currentTab === 'schedule' && renderScheduleTab()}
          {currentTab === 'financial' && renderFinancialTab()}
          {currentTab === 'billing' && renderBillingTab()}
          {currentTab === 'auto' && renderAutoTab()}
          {currentTab === 'delete' && renderDeleteTab()}
        </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      )}

      {/* Premium Modal */}
      <Modal
        visible={showPremiumModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPremiumModal(false)}
      >
        <View style={styles.premiumModalOverlay}>
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.premiumModalContainer}>
            <View style={styles.premiumModalHeader}>
              <View style={styles.premiumIcon}>
                <IconSymbol size={40} name="crown.fill" color="#000" />
              </View>
              <Text style={styles.premiumModalTitle}>
                {t('job_form.premium.title')}
              </Text>
              <Text style={styles.premiumModalSubtitle}>
                {t('job_form.premium.message')}
              </Text>
            </View>

            <View style={styles.premiumModalContent}>
              <View style={styles.premiumFeaturesList}>
                <View style={styles.premiumFeatureItem}>
                  <View style={styles.premiumFeatureIcon}>
                    <IconSymbol size={18} name="clock.fill" color={colors.primary} />
                  </View>
                  <Text style={styles.premiumFeatureText}>
                    {t('job_form.premium.features.schedule')}
                  </Text>
                </View>
                
                <View style={styles.premiumFeatureItem}>
                  <View style={styles.premiumFeatureIcon}>
                    <IconSymbol size={18} name="dollarsign.circle.fill" color={colors.primary} />
                  </View>
                  <Text style={styles.premiumFeatureText}>
                    {t('job_form.premium.features.financial')}
                  </Text>
                </View>

                <View style={styles.premiumFeatureItem}>
                  <View style={styles.premiumFeatureIcon}>
                    <IconSymbol size={18} name="chart.bar.fill" color={colors.primary} />
                  </View>
                  <Text style={styles.premiumFeatureText}>
                    {t('job_form.premium.features.billing')}
                  </Text>
                </View>

                <View style={styles.premiumFeatureItem}>
                  <View style={styles.premiumFeatureIcon}>
                    <IconSymbol size={18} name="timer" color={colors.primary} />
                  </View>
                  <Text style={styles.premiumFeatureText}>
                    {t('job_form.premium.features.auto')}
                  </Text>
                </View>
              </View>

              <View style={styles.premiumModalActions}>
                <TouchableOpacity 
                  style={styles.premiumCancelButton}
                  onPress={() => setShowPremiumModal(false)}
                >
                  <Text style={styles.premiumCancelButtonText}>
                    {t('job_form.premium.cancel')}
                  </Text>
                </TouchableOpacity>

                {!disableSubscriptionModal && (
                  <TouchableOpacity 
                    style={styles.premiumSubscribeButton}
                    onPress={() => {
                      setShowPremiumModal(false);
                      onClose();
                      if (onNavigateToSubscription) {
                        onNavigateToSubscription();
                      }
                    }}
                  >
                    <Text style={styles.premiumSubscribeButtonText}>
                      {t('job_form.premium.subscribe')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    </Modal>
    
    {/* Usar la versión gratuita por defecto */}
    <FreeAddressSearch
      visible={showAddressSearch}
      onClose={() => setShowAddressSearch(false)}
      onSelectAddress={(addressData) => {
        updateFormData('address', addressData.fullAddress);
        updateFormData('street', addressData.street);
        updateFormData('city', addressData.city);
        updateFormData('postalCode', addressData.postalCode);
        
        if (addressData.latitude && addressData.longitude) {
          updateNestedData('location', 'address', addressData.fullAddress);
          updateNestedData('location', 'latitude', addressData.latitude);
          updateNestedData('location', 'longitude', addressData.longitude);
          
          setJobCoordinates({
            latitude: addressData.latitude,
            longitude: addressData.longitude,
          });
        }
      }}
      currentAddress={formData.street || formData.address}
    />
    </>
  );
}