import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { WorkDay, Job } from '../types/WorkTypes';
import { JobService } from '../services/JobService';

interface EditWorkDayModalProps {
  visible: boolean;
  onClose: () => void;
  workDay: WorkDay | null;
  job: Job | null;
  onSave: (updatedWorkDay: WorkDay) => void;
}

const EditWorkDayModal: React.FC<EditWorkDayModalProps> = ({
  visible,
  onClose,
  workDay,
  job,
  onSave,
}) => {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  // No longer using useTimeFormat hook - always display time format in modal

  // Función que siempre muestra formato HH:MM:SS independiente de la configuración
  const formatTimeAlways = (hours: number): string => {
    const totalSeconds = Math.round(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hours, setHours] = useState('');
  const [breakHours, setBreakHours] = useState('0');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (workDay) {
      setStartTime(workDay.actualStartTime || workDay.startTime || '09:00');
      setEndTime(workDay.actualEndTime || workDay.endTime || '17:00');
      
      const workHours = Number(workDay.hours);
      console.log('🔧 EditModal: Always using time format, workHours:', workHours);
      
      // SIEMPRE mostrar formato de tiempo (segundos) en el modal
      console.log('🔧 ALWAYS using TIME format, setting hours to:', formatTimeAlways(workHours));
      setHours(formatTimeAlways(workHours));
      
      const breakTime = Number(workDay.breakHours || 0);
      setBreakHours(formatTimeAlways(breakTime));
      
      // Cargar las notas si existen
      setNotes(workDay.notes || '');
    }
  }, [workDay]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  };

  const calculateHours = (start: string, end: string) => {
    try {
      const [startHours, startMinutes] = start.split(':').map(Number);
      const [endHours, endMinutes] = end.split(':').map(Number);
      
      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;
      
      let diffMinutes = endTotalMinutes - startTotalMinutes;
      if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight
      
      const hours = Math.round((diffMinutes / 60) * 100) / 100;
      return hours.toFixed(2);
    } catch {
      return '8.00';
    }
  };

  const handleTimeChange = (newStartTime: string, newEndTime: string) => {
    const calculatedHours = parseFloat(calculateHours(newStartTime, newEndTime));
    // SIEMPRE mostrar formato tiempo
    setHours(formatTimeAlways(calculatedHours));
  };

  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
    handleTimeChange(time, endTime);
  };

  const handleEndTimeChange = (time: string) => {
    setEndTime(time);
    handleTimeChange(startTime, time);
  };

  const adjustHours = (increment: number) => {
    let currentHours;
    
    if (hours.includes(':')) {
      // Convertir HH:MM:SS a horas decimales
      const parts = hours.split(':').map(Number);
      currentHours = parts[0] + (parts[1] / 60) + (parts[2] / 3600);
    } else {
      currentHours = parseFloat(hours) || 0;
    }
    
    const newHours = Math.max(0, Math.round((currentHours + increment) * 100) / 100);
    
    // SIEMPRE mostrar formato tiempo
    setHours(formatTimeAlways(newHours));
  };

  const adjustBreakHours = (increment: number) => {
    let currentBreakHours;
    
    if (breakHours.includes(':')) {
      // Convertir HH:MM:SS a horas decimales
      const parts = breakHours.split(':').map(Number);
      currentBreakHours = parts[0] + (parts[1] / 60) + (parts[2] / 3600);
    } else {
      currentBreakHours = parseFloat(breakHours) || 0;
    }
    
    const newBreakHours = Math.max(0, Math.round((currentBreakHours + increment) * 100) / 100);
    
    // SIEMPRE mostrar formato tiempo
    setBreakHours(formatTimeAlways(newBreakHours));
  };

  const getNetHours = () => {
    let totalHours, breakTime;
    
    // Convertir horas a decimal (siempre están en formato HH:MM:SS)
    if (hours.includes(':')) {
      const parts = hours.split(':').map(Number);
      totalHours = parts[0] + (parts[1] / 60) + (parts[2] / 3600);
    } else {
      totalHours = parseFloat(hours) || 0;
    }
    
    if (breakHours.includes(':')) {
      const parts = breakHours.split(':').map(Number);
      breakTime = parts[0] + (parts[1] / 60) + (parts[2] / 3600);
    } else {
      breakTime = parseFloat(breakHours) || 0;
    }
    
    const netHours = Math.max(0, Math.round((totalHours - breakTime) * 100) / 100);
    return netHours.toFixed(2);
  };

  const handleSave = async () => {
    if (!workDay) return;

    setIsLoading(true);
    try {
      // Convertir a horas decimales para guardar (siempre están en formato HH:MM:SS)
      let finalHours, finalBreakHours;
      
      if (hours.includes(':')) {
        const parts = hours.split(':').map(Number);
        finalHours = parts[0] + (parts[1] / 60) + (parts[2] / 3600);
      } else {
        finalHours = parseFloat(hours);
      }
      
      if (breakHours.includes(':')) {
        const parts = breakHours.split(':').map(Number);
        finalBreakHours = parts[0] + (parts[1] / 60) + (parts[2] / 3600);
      } else {
        finalBreakHours = parseFloat(breakHours);
      }

      const updatedWorkDay: WorkDay = {
        ...workDay,
        actualStartTime: formatTime(startTime),
        actualEndTime: formatTime(endTime),
        hours: finalHours,
        ...(finalBreakHours > 0 ? { breakHours: finalBreakHours } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      } as any;

      await JobService.updateWorkDay(workDay.id, {
        ...workDay,
        actualStartTime: formatTime(startTime),
        actualEndTime: formatTime(endTime),
        hours: finalHours,
        ...(finalBreakHours > 0 ? { breakHours: finalBreakHours } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      onSave(updatedWorkDay);
      onClose();
    } catch (error) {
      Alert.alert(t('common.error'), t('common.save_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = 
      language === 'es' ? 'es-ES' : 
      language === 'en' ? 'en-US' : 
      language === 'de' ? 'de-DE' : 
      language === 'fr' ? 'fr-FR' : 
      language === 'it' ? 'it-IT' :
      language === 'ja' ? 'ja-JP' :
      language === 'nl' ? 'nl-NL' :
      language === 'pt' ? 'pt-PT' :
      language === 'ru' ? 'ru-RU' :
      language === 'tr' ? 'tr-TR' : 'en-US';
    
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const styles = StyleSheet.create({
    fullScreenModal: {
      flex: 1,
      backgroundColor: colors.background,
    },
    handleContainer: {
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 4,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: colors.textSecondary,
      borderRadius: 2,
      opacity: 0.3,
    },
    headerActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    closeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    },
    scrollContent: {
      flex: 1,
      paddingHorizontal: 20,
    },
    header: {
      paddingHorizontal: 0,
      paddingBottom: 24,
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      textTransform: 'capitalize',
    },
    jobName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.primary,
      textAlign: 'center',
      marginTop: 4,
    },
    content: {
      padding: 24,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    timeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    timeInputContainer: {
      flex: 1,
      marginHorizontal: 8,
    },
    timeLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
      textAlign: 'center',
    },
    timeInput: {
      backgroundColor: isDark ? 'rgba(58, 58, 60, 0.8)' : 'rgba(242, 242, 247, 0.9)',
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
      borderRadius: 12,
      padding: 12,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    hoursContainer: {
      backgroundColor: isDark ? 'rgba(58, 58, 60, 0.6)' : 'rgba(242, 242, 247, 0.7)',
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
    },
    hoursLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    hoursRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    hoursButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    hoursInput: {
      backgroundColor: isDark ? 'rgba(28, 28, 30, 0.8)' : 'rgba(255, 255, 255, 0.9)',
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
      borderRadius: 12,
      padding: 12,
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      minWidth: 80,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    hoursText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    button: {
      flex: 1,
      borderRadius: 16,
      overflow: 'hidden',
    },
    buttonContent: {
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButton: {
      backgroundColor: isDark ? 'rgba(58, 58, 60, 0.8)' : 'rgba(242, 242, 247, 0.9)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    cancelButtonText: {
      color: colors.textSecondary,
    },
    saveButtonText: {
      color: '#FFFFFF',
    },
    breakNote: {
      fontSize: 12,
      color: '#FF6B35',
      textAlign: 'center',
      marginTop: 8,
      fontStyle: 'italic',
      fontWeight: '500',
    },
    netHoursContainer: {
      backgroundColor: isDark ? 'rgba(52, 199, 89, 0.1)' : 'rgba(52, 199, 89, 0.06)',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(52, 199, 89, 0.2)' : 'rgba(52, 199, 89, 0.15)',
    },
    netHoursLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
      fontWeight: '500',
    },
    netHoursValue: {
      fontSize: 24,
      fontWeight: '700',
      color: '#34C759',
      marginBottom: 2,
    },
    netHoursNote: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    notesInput: {
      backgroundColor: isDark ? 'rgba(58, 58, 60, 0.8)' : 'rgba(242, 242, 247, 0.9)',
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      minHeight: 100,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    bottomActions: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 20,
      paddingBottom: 34, // Extra padding for home indicator
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.separator,
      gap: 12,
    },
  });

  if (!workDay || !job) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent={false}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.fullScreenModal}>
          {/* Handle bar for swipe to close */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          
          {/* Close button - también guarda cambios */}
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleSave} style={styles.closeButton}>
              <IconSymbol name="xmark" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 100 }}
          >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('reports.edit_record')}</Text>
            <Text style={styles.subtitle}>{formatDate(workDay.date)}</Text>
            <Text style={styles.jobName}>{job.name}</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Time Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('reports.schedule')}</Text>
              <View style={styles.timeRow}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>{t('reports.entry')}</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={startTime}
                    onChangeText={handleStartTimeChange}
                    placeholder="09:00"
                    keyboardType="default"
                  />
                </View>
                <IconSymbol size={20} name="arrow.right" color={colors.textSecondary} />
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>{t('reports.exit')}</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={endTime}
                    onChangeText={handleEndTimeChange}
                    placeholder="17:00"
                    keyboardType="default"
                  />
                </View>
              </View>
            </View>

            {/* Hours Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('reports.recorded_hours')}</Text>
              <View style={styles.hoursContainer}>
                <Text style={styles.hoursLabel}>{t('reports.total_hours_label')}</Text>
                <View style={styles.hoursRow}>
                  <TouchableOpacity
                    style={styles.hoursButton}
                    onPress={() => adjustHours(-0.5)}
                  >
                    <IconSymbol size={20} name="minus" color="#FFFFFF" />
                  </TouchableOpacity>
                  
                  <View>
                    <TextInput
                      style={styles.hoursInput}
                      value={hours}
                      onChangeText={setHours}
                      keyboardType="default"
                      placeholder="00:00:00"
                    />
                  
                  </View>

                  <TouchableOpacity
                    style={styles.hoursButton}
                    onPress={() => adjustHours(0.5)}
                  >
                    <IconSymbol size={20} name="plus" color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Break Hours Section - Solo mostrar si hay más de 30 minutos trabajados */}
            {(() => {
              // Convertir horas totales a minutos para comparar
              let totalMinutes;
              if (hours.includes(':')) {
                const parts = hours.split(':').map(Number);
                totalMinutes = parts[0] * 60 + parts[1] + (parts[2] / 60);
              } else {
                totalMinutes = (parseFloat(hours) || 0) * 60;
              }
              
              return totalMinutes > 30;
            })() && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('reports.break_rest')}</Text>
                <View style={styles.hoursContainer}>
                  <Text style={styles.hoursLabel}>{t('reports.break_time')}</Text>
                  <View style={styles.hoursRow}>
                    <TouchableOpacity
                      style={[styles.hoursButton, { backgroundColor: '#FF6B35' }]}
                      onPress={() => adjustBreakHours(-0.25)}
                    >
                      <IconSymbol size={20} name="minus" color="#FFFFFF" />
                    </TouchableOpacity>
                    
                    <View>
                      <TextInput
                        style={styles.hoursInput}
                        value={breakHours}
                        onChangeText={setBreakHours}
                        keyboardType="default"
                        placeholder="00:00:00"
                      />
                      <Text style={styles.hoursText}>
                        {formatTimeAlways(parseFloat(breakHours) || 0)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.hoursButton, { backgroundColor: '#FF6B35' }]}
                      onPress={() => adjustBreakHours(0.25)}
                    >
                      <IconSymbol size={20} name="plus" color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.breakNote}>
                    {t('reports.break_note')}
                  </Text>
                </View>
              </View>
            )}

            {/* Net Hours Display */}
            {parseFloat(breakHours) > 0 && (
              <View style={styles.section}>
                <View style={styles.netHoursContainer}>
                  <Text style={styles.netHoursLabel}>{t('reports.net_worked_time')}</Text>
                  <Text style={styles.netHoursValue}>
                    {formatTimeAlways(parseFloat(getNetHours()))}
                  </Text>
                  <Text style={styles.netHoursNote}>
                    ({hours} - {breakHours} pausas)
                  </Text>
                </View>
              </View>
            )}

            {/* Notes Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('timer.session_notes')}</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('timer.notes_placeholder')}
                placeholderTextColor={colors.textSecondary}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => {
                  // Hacer scroll automático cuando se enfoque el campo de notas
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
              />
            </View>
          </View>
        </ScrollView>
        
        {/* Fixed bottom buttons */}
        <View style={styles.bottomActions}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={onClose}
          >
            <View style={styles.buttonContent}>
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                {t('common.cancel')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleSave} 
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#007AFF', '#0056CC']}
              style={styles.buttonContent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.buttonText, styles.saveButtonText]}>
                {isLoading ? t('reports.saving') : t('job_form.save')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EditWorkDayModal;