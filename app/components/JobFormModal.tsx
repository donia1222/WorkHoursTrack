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
  KeyboardAvoidingView,
  Platform,
  Linking,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../hooks/useSubscription';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Job, DEFAULT_COLORS } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import { AutoScheduleService } from '../services/AutoScheduleService';
import AutoTimerService from '../services/AutoTimerService';

interface JobFormModalProps {
  visible: boolean;
  onClose: () => void;
  editingJob?: Job | null;
  onSave: (jobData: any) => void;
  initialTab?: 'basic' | 'schedule' | 'financial' | 'billing' | 'auto' | 'delete';
  onNavigateToCalendar?: () => void; // Optional callback to navigate to calendar
  onNavigateToSubscription?: () => void; // Callback to navigate to subscription screen
  isLocationEnabled?: boolean; // Para detectar si hay permisos de ubicación
}


const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  headerTitle: {
    ...Theme.typography.headline,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: Theme.spacing.sm,
  },
  closeButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
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
  dayScheduleTitle: {
    ...Theme.typography.headline,
    color: colors.text,
    marginBottom: Theme.spacing.md,
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
    paddingTop: Platform.OS === 'ios' ? 120 : 100,
  },
  simplifiedKeyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  simplifiedCard: {
    width: '90%',
    maxWidth: 400,
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
});

export default function JobFormModal({ visible, onClose, editingJob, onSave, initialTab = 'basic', onNavigateToCalendar, onNavigateToSubscription, isLocationEnabled = true }: JobFormModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { isSubscribed } = useSubscription();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [previousAutoSchedule, setPreviousAutoSchedule] = useState<boolean | undefined>(undefined);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(isLocationEnabled);

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
  
  const styles = getStyles(colors, isDark);

  useEffect(() => {
    if (visible) {
      setCurrentTab(initialTab);
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
        autoTimer: editingJob.autoTimer || {
          enabled: false,
          geofenceRadius: 50,
          delayStart: 1,
          delayStop: 1,
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
          delayStart: 1,
          delayStop: 1,
          notifications: true,
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
      // If no name, just close without saving
      onClose();
    }
  };

  const handleSave = async () => {
    // Only save if there's a name, otherwise just close
    if (!formData.name?.trim()) {
      onClose();
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
            onClose();
            return;
          }
          
          // Show confirmation with conflicts if any
          if (result.conflicts && result.conflicts.length > 0) {
            Alert.alert(
              t('job_form.auto_schedule.applied_title'),
              t('job_form.auto_schedule.applied_conflicts', {
                workDays: (result.generatedDays?.length || 0).toString(),
                freeDays: (result.freeDays?.length || 0).toString(),
                conflicts: (result.conflicts?.length || 0).toString()
              }),
              [
                { 
                  text: 'OK', 
                  style: 'cancel',
                  onPress: () => {
                    onSave(savedJob);
                    onClose();
                  }
                },
                { 
                  text: t('job_form.auto_schedule.view_calendar'), 
                  onPress: () => {
                    onSave(savedJob);
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
                workDays: (result.generatedDays?.length || 0).toString(),
                freeDays: (result.freeDays?.length || 0).toString()
              }),
              [
                { 
                  text: 'OK', 
                  style: 'cancel',
                  onPress: () => {
                    onSave(savedJob);
                    onClose();
                  }
                },
                { 
                  text: t('job_form.auto_schedule.view_calendar'), 
                  onPress: () => {
                    onSave(savedJob);
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

      onSave(savedJob);
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

  const updateDaySchedule = (day: number, scheduleData: any) => {
    const currentWeeklySchedule = formData.schedule?.weeklySchedule || {};
    const newWeeklySchedule = {
      ...currentWeeklySchedule,
      [day]: scheduleData,
    };
    updateNestedData('schedule', 'weeklySchedule', newWeeklySchedule);
  };

  const getDaySchedule = (day: number) => {
    return formData.schedule?.weeklySchedule?.[day] || null;
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

  const removeDaySchedule = (day: number) => {
    updateDaySchedule(day, null);
    if (selectedDay === day) {
      setSelectedDay(null);
    }
  };

  const renderSimplifiedForm = () => (
    <TouchableOpacity 
      style={styles.simplifiedOverlay} 
      activeOpacity={1}
      onPress={onClose}
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
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.simplifiedBlurCard}>
            {/* Close button */}
            <TouchableOpacity 
              onPress={onClose} 
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
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </TouchableOpacity>
  );

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
          <Text style={styles.label}>{t('job_form.basic.address')}</Text>
          
          <View style={styles.locationSection}>
            <Text style={styles.helperText}>
              {t('job_form.basic.location_helper')}
            </Text>
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
                  ]}
                  onPress={() => {
                    if (hasDaySchedule(index)) {
                      // Si está marcado (azul), lo desmarca directamente
                      removeDaySchedule(index);
                      if (selectedDay === index) {
                        setSelectedDay(null);
                      }
                    } else {
                      // Si no está marcado, lo marca y lo selecciona para configurar
                      updateDaySchedule(index, getDefaultDaySchedule());
                      setSelectedDay(index);
                    }
                  }}
                  onLongPress={() => {
                    // Long press para editar un día que ya está marcado
                    if (hasDaySchedule(index)) {
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
              Toca: marcar/desmarcar día. Mantén presionado: editar horario.
            </Text>
          </View>

          {/* Schedule details for selected day */}
          {selectedDay !== null && (
            <View style={styles.dayScheduleContainer}>
              <Text style={styles.dayScheduleTitle}>
                {t('job_form.schedule.schedule_for')} {(t('job_form.schedule.days') as unknown as string[])[selectedDay]}
              </Text>

              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('job_form.schedule.start_time')}</Text>
                  <TextInput
                    style={styles.input}
                    value={getDaySchedule(selectedDay)?.startTime || ''}
                    onChangeText={(value) => {
                      const currentSchedule = getDaySchedule(selectedDay) || getDefaultDaySchedule();
                      updateDaySchedule(selectedDay, { ...currentSchedule, startTime: value });
                    }}
                    placeholder={t('job_form.schedule.start_time_placeholder')}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('job_form.schedule.end_time')}</Text>
                  <TextInput
                    style={styles.input}
                    value={getDaySchedule(selectedDay)?.endTime || ''}
                    onChangeText={(value) => {
                      const currentSchedule = getDaySchedule(selectedDay) || getDefaultDaySchedule();
                      updateDaySchedule(selectedDay, { ...currentSchedule, endTime: value });
                    }}
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
                      value={getDaySchedule(selectedDay)?.secondStartTime || ''}
                      onChangeText={(value) => {
                        const currentSchedule = getDaySchedule(selectedDay) || getDefaultDaySchedule();
                        updateDaySchedule(selectedDay, { ...currentSchedule, secondStartTime: value });
                      }}
                      placeholder={t('job_form.schedule.second_start_time_placeholder')}
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('job_form.schedule.second_end_time')}</Text>
                    <TextInput
                      style={styles.input}
                      value={getDaySchedule(selectedDay)?.secondEndTime || ''}
                      onChangeText={(value) => {
                        const currentSchedule = getDaySchedule(selectedDay) || getDefaultDaySchedule();
                        updateDaySchedule(selectedDay, { ...currentSchedule, secondEndTime: value });
                      }}
                      placeholder={t('job_form.schedule.second_end_time_placeholder')}
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
                  onChangeText={(value) => {
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
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {formData.salary?.enabled && (
          <>
            {/* Currency Section */}
            <View style={styles.financialCard}>
              <View style={styles.financialCardHeader}>
                <IconSymbol size={20} name="dollarsign.circle.fill" color={colors.primary} />
                <Text style={styles.financialCardTitle}>Moneda</Text>
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
                <Text style={styles.financialCardTitle}>Tipo de Pago</Text>
              </View>
              <View style={styles.salaryTypeSelector}>
                {[
                  { key: 'hourly', label: 'Por Hora', icon: '⏰' },
                  { key: 'monthly', label: 'Por Mes', icon: '📅' },
                  { key: 'annual', label: 'Por Año', icon: '📊' },
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
                  {formData.salary?.type === 'hourly' ? 'Cantidad por Hora' :
                   formData.salary?.type === 'monthly' ? 'Cantidad por Mes' : 'Cantidad por Año'}
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
                    /{formData.salary?.type === 'hourly' ? 'h' :
                      formData.salary?.type === 'monthly' ? 'mes' : 'año'}
                  </Text>
                </View>
              </View>
              <Text style={styles.amountHelper}>
                {formData.salary?.type === 'hourly' ? 'Ej: 15€/hora para trabajos freelance' :
                 formData.salary?.type === 'monthly' ? 'Ej: 1800€/mes para empleos fijos' : 'Ej: 35000€/año para salarios anuales'}
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
                `🏢 ${formData.billing?.userData?.companyName || 'Nombre Empresa'}\n` +
                `CIF: ${formData.billing?.userData?.taxId || 'CIF/NIF'}`
              ) : (
                `👤 ${formData.billing?.userData?.name || 'Nombre Usuario'}`
              )}
              {'\n'}📍 {formData.billing?.userData?.address || 'Dirección completa'}
              {'\n'}📞 {formData.billing?.userData?.phone || 'Teléfono'}
              {'\n'}✉️ {formData.billing?.userData?.email || 'Email'}
              {formData.billing?.userData?.website ? `\n🌐 ${formData.billing.userData.website}` : ''}
              {formData.billing?.userData?.bankAccount ? `\n\n💳 ${formData.billing.userData.bankAccount}` : ''}
              {formData.billing?.userData?.bankName ? `\n🏦 ${formData.billing.userData.bankName}` : ''}
              {formData.billing?.userData?.swiftCode ? `\n🔗 SWIFT: ${formData.billing.userData.swiftCode}` : ''}
              {'\n\n'}Prefijo: {formData.billing?.invoicePrefix || 'INV'}
              {'\n'}Impuestos: {formData.billing?.taxRate || 0}%
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
      
      // Si se está desactivando el AutoTimer, parar el timer activo si existe
      if (!value && editingJob) {
        try {
          const activeSession = await JobService.getActiveSession();
          if (activeSession && activeSession.jobId === editingJob.id) {
            console.log('🛑 JobFormModal: Stopping active timer because AutoTimer was disabled');
            await JobService.clearActiveSession();
          }
          
          // También cancelar cualquier AutoTimer activo para este trabajo
          const autoTimerService = AutoTimerService.getInstance();
          await autoTimerService.cancelPendingAction();
        } catch (error) {
          console.error('Error stopping timer when disabling AutoTimer:', error);
        }
      }
      
      updateNestedData('autoTimer', 'enabled', value);
    };

    const openSettings = () => {
      Linking.openSettings();
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
      
      if (value && !isSubscribed) {
        setShowPremiumModal(true);
      } else {
        handleAutoTimerToggle(value);
      }
    };

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
              
              {/* Privacy Notice */}
              <View style={styles.inputGroup}>
                <Text style={[styles.labelDescription, { 
                  textAlign: 'center', 
                  fontSize: 11, 
                  lineHeight: 14, 
                  color: colors.textSecondary,
                  fontStyle: 'italic',
                  marginTop: 8
                }]}>
                  {t('timer.auto_timer.privacy_notice')}
                </Text>
              </View>
            </>
          )}



        {formData.autoTimer?.enabled && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('job_form.auto_timer.geofence_radius')}</Text>
              <Text style={styles.labelDescription}>{t('job_form.auto_timer.geofence_radius_desc')}</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => {
                    const currentValue = formData.autoTimer?.geofenceRadius || 50;
                    const newValue = Math.max(5, currentValue - 5);
                    updateNestedData('autoTimer', 'geofenceRadius', newValue);
                  }}
                >
                  <IconSymbol size={20} name="minus" color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.counterValue}>
                  <Text style={styles.counterText}>{formData.autoTimer?.geofenceRadius || 50}</Text>
                  <Text style={styles.counterUnit}>metros</Text>
                </View>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => {
                    const currentValue = formData.autoTimer?.geofenceRadius || 50;
                    const newValue = Math.min(200, currentValue + 5);
                    updateNestedData('autoTimer', 'geofenceRadius', newValue);
                  }}
                >
                  <IconSymbol size={20} name="plus" color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
<View style={styles.inputGroup}>
              <Text style={styles.label}>{t('job_form.auto_timer.delay_start')}</Text>
              <Text style={styles.labelDescription}>{t('job_form.auto_timer.delay_start_desc')}</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => {
                    const currentValue = formData.autoTimer?.delayStart || 1;
                    const newValue = Math.max(1, currentValue - 1);
                    updateNestedData('autoTimer', 'delayStart', newValue);
                  }}
                >
                  <IconSymbol size={20} name="minus" color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.counterValue}>
                  <Text style={styles.counterText}>{formData.autoTimer?.delayStart || 1}</Text>
                  <Text style={styles.counterUnit}>min</Text>
                </View>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => {
                    const currentValue = formData.autoTimer?.delayStart || 1;
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
                    const currentValue = formData.autoTimer?.delayStop || 1;
                    const newValue = Math.max(1, currentValue - 1);
                    updateNestedData('autoTimer', 'delayStop', newValue);
                  }}
                >
                  <IconSymbol size={20} name="minus" color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.counterValue}>
                  <Text style={styles.counterText}>{formData.autoTimer?.delayStop || 1}</Text>
                  <Text style={styles.counterUnit}>min</Text>
                </View>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => {
                    const currentValue = formData.autoTimer?.delayStop || 1;
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
                onClose();
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
              onPress={onClose}
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
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      {isFirstTimeUser && !editingJob ? (
        // Show simplified form for first time users
        renderSimplifiedForm()
      ) : (
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.container}>
          // Show full form
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {editingJob ? t('job_form.title_edit') : t('job_form.title_new')}
              </Text>
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          {currentTab === 'basic' && renderBasicTab()}
          {currentTab === 'schedule' && renderScheduleTab()}
          {currentTab === 'financial' && renderFinancialTab()}
          {currentTab === 'billing' && renderBillingTab()}
          {currentTab === 'auto' && renderAutoTab()}
          {currentTab === 'delete' && renderDeleteTab()}
        </KeyboardAvoidingView>
          </>
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
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    </Modal>
  );
}

