import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { Job } from '@/app/types/WorkTypes';
import { ParsedWorkData, ChatDataParser } from '@/app/services/ChatDataParser';
import { CalendarSyncService } from '@/app/services/CalendarSyncService';

interface ExportCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  parsedData: ParsedWorkData | null;
  jobs: Job[];
  onExport: (selectedJobId: string, parsedData: ParsedWorkData) => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: 700,
    borderRadius: 20,
    backgroundColor: isDark ? colors.surface : '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    paddingBottom: Platform.OS === 'ios' ? 40 : 0,
  },
  modalContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: isDark ? colors.text : '#111827',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  personInfo: {
    backgroundColor: isDark ? colors.card : '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    shadowColor: isDark ? '#FFFFFF' : '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.05 : 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  personName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: isDark ? colors.textSecondary : '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? colors.text : '#111827',
  },
  jobSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? colors.text : '#111827',
    marginBottom: 12,
  },
  jobOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? colors.surface : '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  jobOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  jobColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  jobDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    backgroundColor: colors.primary,
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  warningBox: {
    backgroundColor: isDark ? colors.warning + '20' : '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: isDark ? colors.warning + '50' : '#F59E0B',
  },
  warningText: {
    fontSize: 14,
    color: isDark ? colors.warning : '#92400E',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 8,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelButton: {
    backgroundColor: isDark ? colors.card : '#F9FAFB',
    borderWidth: 1.5,
    borderColor: isDark ? colors.separator : '#D1D5DB',
  },
  exportButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  nativeExportButton: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: isDark ? colors.text : '#374151',
  },
  exportButtonText: {
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
  monthYearSection: {
    marginBottom: 20,
  },
  monthYearContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  monthYearPicker: {
    flex: 1,
    backgroundColor: isDark ? colors.card : '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: isDark ? colors.separator : '#E5E7EB',
    shadowColor: isDark ? '#FFFFFF' : '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.05 : 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? colors.text : '#374151',
    marginBottom: 8,
  },
});

export default function ExportCalendarModal({
  visible,
  onClose,
  parsedData,
  jobs,
  onExport,
}: ExportCalendarModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const styles = getStyles(colors, isDark);

  useEffect(() => {
    if (visible && jobs.length === 1) {
      // Si solo hay un trabajo, auto-seleccionarlo
      setSelectedJobId(jobs[0].id);
    } else if (visible) {
      // Reset selection cuando se abre el modal
      setSelectedJobId('');
    }
    
    // Reset loading state cuando el modal se abre o cierra
    if (!visible) {
      setIsLoading(false);
    }
  }, [visible, jobs]);

  const handleExport = () => {
    if (!selectedJobId || !parsedData) {
      Alert.alert(t('chatbot.export_calendar.export_error_title'), t('chatbot.export_calendar.select_job_error'));
      return;
    }

    let finalParsedData = parsedData;
    
    // Si necesitamos mes/año, actualizar las fechas
    if (parsedData.needsMonthYear) {
      finalParsedData = ChatDataParser.updateDatesWithMonthYear(
        parsedData,
        selectedYear,
        selectedMonth
      );
    }

    onExport(selectedJobId, finalParsedData);
  };

  const handleExportToNativeCalendar = async () => {
    if (!selectedJobId || !parsedData) {
      Alert.alert(t('chatbot.export_calendar.export_error_title'), t('chatbot.export_calendar.select_job_error'));
      return;
    }

    setIsLoading(true);

    let finalParsedData = parsedData;
    
    // Si necesitamos mes/año, actualizar las fechas
    if (parsedData.needsMonthYear) {
      finalParsedData = ChatDataParser.updateDatesWithMonthYear(
        parsedData,
        selectedYear,
        selectedMonth
      );
    }

    try {
      // Convertir datos a WorkDays
      const workDays = ChatDataParser.convertToWorkDays(finalParsedData, selectedJobId);
      const selectedJob = jobs.find(job => job.id === selectedJobId);
      
      // Filtrar solo días de trabajo para calendario nativo
      const workDaysOnly = workDays.filter(day => day.type === 'work');
      
      if (workDaysOnly.length === 0) {
        Alert.alert(t('chatbot.export_calendar.export_error_title'), t('calendar.no_work_days'));
        setIsLoading(false);
        return;
      }

      // Exportar al calendario nativo
      const syncCount = await CalendarSyncService.syncMultipleWorkDays(workDaysOnly, jobs);
      
      setIsLoading(false);
      
      if (syncCount > 0) {
        Alert.alert(
          t('calendar.sync_complete'),
          t('calendar.sync_success', { count: syncCount }),
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert(t('common.error'), t('calendar.sync_error'));
      }
    } catch (error) {
      console.error('Error exporting to native calendar:', error);
      setIsLoading(false);
      Alert.alert(t('common.error'), t('calendar.sync_error'));
    }
  };

  const getMonthName = (month: number) => {
    const monthKeys = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    return t(`chatbot.months.${monthKeys[month - 1]}`);
  };

  const getMonthsArray = () => {
    return [
      t('chatbot.months.january'),
      t('chatbot.months.february'),
      t('chatbot.months.march'),
      t('chatbot.months.april'),
      t('chatbot.months.may'),
      t('chatbot.months.june'),
      t('chatbot.months.july'),
      t('chatbot.months.august'),
      t('chatbot.months.september'),
      t('chatbot.months.october'),
      t('chatbot.months.november'),
      t('chatbot.months.december')
    ];
  };

  const showMonthPicker = () => {
    const months = getMonthsArray();

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('chatbot.export_calendar.cancel_button'), ...months],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            setSelectedMonth(buttonIndex);
          }
        }
      );
    } else {
      Alert.alert(
        t('chatbot.export_calendar.select_month_title'),
        '',
        [...months.map((month, index) => ({
          text: month,
          onPress: () => setSelectedMonth(index + 1)
        })), { text: t('chatbot.export_calendar.cancel_button'), style: 'cancel' as any }]
      );
    }
  };

  const showYearPicker = () => {
    const years = ['2024', '2025', '2026'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('chatbot.export_calendar.cancel_button'), ...years],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            setSelectedYear(parseInt(years[buttonIndex - 1]));
          }
        }
      );
    } else {
      Alert.alert(
        t('chatbot.export_calendar.select_year_title'),
        '',
        [...years.map((year) => ({
          text: year,
          onPress: () => setSelectedYear(parseInt(year))
        })), { text: t('chatbot.export_calendar.cancel_button'), style: 'cancel' as any }]
      );
    }
  };

  if (!parsedData) return null;

  const workDaysCount = parsedData.workDays.length;
  const freeDaysCount = parsedData.freeDays.length;
  const totalDays = workDaysCount + freeDaysCount;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons 
                name="calendar-outline" 
                size={24} 
                color={colors.primary} 
                style={styles.headerIcon}
              />
              <Text style={styles.title}>{t('chatbot.export_calendar.modal_title')}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Person Info */}
            <View style={styles.personInfo}>
              <Text style={styles.personName}>👤 {parsedData.personName}</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('chatbot.export_calendar.work_days_label')}</Text>
                <Text style={styles.summaryValue}>{workDaysCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('chatbot.export_calendar.free_days_label')}</Text>
                <Text style={styles.summaryValue}>{freeDaysCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('chatbot.export_calendar.schedule_label')}</Text>
                <Text style={styles.summaryValue}>{parsedData.schedule || t('chatbot.export_calendar.no_schedule')}</Text>
              </View>
            </View>

            {/* Month/Year Selection */}
            {parsedData.needsMonthYear && (
              <View style={styles.monthYearSection}>
                <Text style={styles.sectionTitle}>{t('chatbot.export_calendar.month_year_question')}</Text>
                <View style={styles.monthYearContainer}>
                  <TouchableOpacity 
                    style={[styles.monthYearPicker, { flex: 1, padding: 16 }]}
                    onPress={() => showMonthPicker()}
                  >
                    <Text style={styles.pickerLabel}>{t('chatbot.export_calendar.month_label')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.text, fontSize: 16 }}>
                        {getMonthName(selectedMonth)}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.monthYearPicker, { flex: 1, padding: 16 }]}
                    onPress={() => showYearPicker()}
                  >
                    <Text style={styles.pickerLabel}>{t('chatbot.export_calendar.year_label')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.text, fontSize: 16 }}>
                        {selectedYear}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Job Selection */}
            {jobs.length > 1 && (
              <View style={styles.jobSection}>
                <Text style={styles.sectionTitle}>{t('chatbot.export_calendar.select_job')}</Text>
                {jobs.map((job) => (
                  <TouchableOpacity
                    key={job.id}
                    style={[
                      styles.jobOption,
                      selectedJobId === job.id && styles.jobOptionSelected,
                    ]}
                    onPress={() => setSelectedJobId(job.id)}
                  >
                    <View style={[styles.jobColorDot, { backgroundColor: job.color }]} />
                    <View style={styles.jobInfo}>
                      <Text style={styles.jobName}>{job.name}</Text>
                      <Text style={styles.jobDescription}>
                        {job.company} • {job.hourlyRate}€/h
                      </Text>
                    </View>
                    <View style={[
                      styles.radioButton,
                      selectedJobId === job.id && styles.radioButtonSelected,
                    ]}>
                      {selectedJobId === job.id && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

    

            {/* Buttons */}
            <View style={styles.buttonContainer}>
      
              {/* Solo mostrar botón de sincronizar con trabajo si hay trabajos */}
              {jobs.length > 0 && (
                <TouchableOpacity 
                  style={[
                    styles.button, 
                    styles.exportButton,
                    (!selectedJobId && jobs.length > 1) && styles.disabledButton
                  ]} 
                  onPress={handleExport}
                  disabled={!selectedJobId && jobs.length > 1}
                >
                  <Ionicons name="calendar" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={[styles.buttonText, styles.exportButtonText]}>
                    {t('chatbot.export_calendar.sync_button')}
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Botón de exportar al calendario nativo siempre disponible */}
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.nativeExportButton,
                  isLoading && styles.disabledButton
                ]} 
                onPress={handleExportToNativeCalendar}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="phone-portrait" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                )}
                <Text style={[styles.buttonText, styles.exportButtonText]}>
                  {isLoading ? t('common.loading') || 'Sincronizando...' : t('calendar.sync_to_phone')}
                </Text>
              </TouchableOpacity>

                      <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={onClose}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  {t('chatbot.export_calendar.cancel_button')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}