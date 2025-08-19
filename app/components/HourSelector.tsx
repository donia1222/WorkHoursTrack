import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { BlurView } from 'expo-blur';
import { useLanguage } from '../contexts/LanguageContext';

interface HourSelectorProps {
  hours: number;
  onHoursChange: (hours: number) => void;
  minHours?: number;
  maxHours?: number;
  standardHours?: number; // Horas estándar del trabajo (por defecto 8)
  onStandardHoursChange?: (hours: number) => void; // Callback para cambiar horas estándar
  isPaidByHour?: boolean; // Si está pagado por hora (no calcular overtime)
  onPaidByHourChange?: (value: boolean) => void;
}

export default function HourSelector({ 
  hours, 
  onHoursChange, 
  minHours = 0.5, 
  maxHours = 16,
  standardHours = 8,
  onStandardHoursChange,
  isPaidByHour = false,
  onPaidByHourChange
}: HourSelectorProps) {
  const { t } = useLanguage();
  const [localStandardHours, setLocalStandardHours] = useState(standardHours);
  const [localIsPaidByHour, setLocalIsPaidByHour] = useState(isPaidByHour);
  
  useEffect(() => {
    setLocalStandardHours(standardHours);
  }, [standardHours]);
  
  useEffect(() => {
    setLocalIsPaidByHour(isPaidByHour);
  }, [isPaidByHour]);
  
  const changeStandardHours = (newHours: number) => {
    setLocalStandardHours(newHours);
    if (onStandardHoursChange) {
      onStandardHoursChange(newHours);
    }
  };
  
  const togglePaidByHour = () => {
    const newValue = !localIsPaidByHour;
    setLocalIsPaidByHour(newValue);
    if (onPaidByHourChange) {
      onPaidByHourChange(newValue);
    }
  };
  const decreaseHours = () => {
    const newHours = Math.max(minHours, hours - 0.5);
    onHoursChange(newHours);
  };

  const increaseHours = () => {
    const newHours = Math.min(maxHours, hours + 0.5);
    onHoursChange(newHours);
  };

  const getHoursDisplay = () => {
    if (hours % 1 === 0) {
      return `${hours.toFixed(0)}h`;
    } else {
      return `${hours.toFixed(1)}h`;
    }
  };

  const getHoursStatus = () => {
    // Si es pago por hora, siempre es normal
    if (localIsPaidByHour) return 'normal';
    
    // Usar la mitad de las horas estándar como límite para turno corto
    const shortThreshold = localStandardHours * 0.5;
    
    if (hours <= shortThreshold) return 'short';
    if (hours <= localStandardHours) return 'normal';
    return 'overtime';
  };

  const getStatusColor = () => {
    const status = getHoursStatus();
    switch (status) {
      case 'short':
        return Theme.colors.textSecondary;
      case 'normal':
        return Theme.colors.success;
      case 'overtime':
        return Theme.colors.warning;
      default:
        return Theme.colors.primary;
    }
  };

  const getStatusText = () => {
    const status = getHoursStatus();
    switch (status) {
      case 'short':
        return t('calendar.short_shift');
      case 'normal':
        return t('calendar.normal_shift');
      case 'overtime':
        return t('calendar.overtime_hours');
      default:
        return t('calendar.normal_shift');
    }
  };

  return (
    <BlurView intensity={95} tint="light" style={styles.container}>
      {/* Checkbox para pago por hora */}
      <TouchableOpacity 
        style={styles.paidByHourContainer}
        onPress={togglePaidByHour}
      >
        <View style={styles.checkboxRow}>
          <View style={[styles.checkbox, localIsPaidByHour && styles.checkboxChecked]}>
            {localIsPaidByHour && (
              <IconSymbol name="checkmark" size={14} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.paidByHourLabel}>
            {t('calendar.paid_by_hour') || 'Pago por hora (sin horas extras)'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Selector de horas estándar - Solo si NO es pago por hora */}
      {!localIsPaidByHour && (
        <>
          <View style={styles.standardHoursSection}>
            <Text style={styles.standardHoursLabel}>
              {t('calendar.standard_hours')}
            </Text>
            <View style={styles.standardHoursSelector}>
              <TouchableOpacity
                style={[
                  styles.standardButton,
                  localStandardHours <= 1 && styles.buttonDisabled
                ]}
                onPress={() => changeStandardHours(Math.max(1, localStandardHours - 1))}
                disabled={localStandardHours <= 1}
              >
                <IconSymbol 
                  size={20} 
                  name="minus" 
                  color={localStandardHours <= 1 ? Theme.colors.textTertiary : Theme.colors.primary} 
                />
              </TouchableOpacity>
              
              <Text style={styles.standardHoursText}>
                {localStandardHours}h
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.standardButton,
                  localStandardHours >= 12 && styles.buttonDisabled
                ]}
                onPress={() => changeStandardHours(Math.min(12, localStandardHours + 1))}
                disabled={localStandardHours >= 12}
              >
                <IconSymbol 
                  size={20} 
                  name="plus" 
                  color={localStandardHours >= 12 ? Theme.colors.textTertiary : Theme.colors.primary} 
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.standardHoursHint}>
              {hours > localStandardHours 
                ? t('calendar.hours_extra', { hours: (hours - localStandardHours).toFixed(1) })
                : hours === localStandardHours 
                ? t('calendar.full_workday')
                : t('calendar.hours_remaining', { hours: (localStandardHours - hours).toFixed(1) })}
            </Text>
          </View>
          <View style={styles.divider} />
        </>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>{t('calendar.worked_hours')}</Text>
        {!localIsPaidByHour && (
          <Text style={[styles.status, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        )}
      </View>

      <View style={styles.selectorContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            hours <= minHours && styles.buttonDisabled
          ]}
          onPress={decreaseHours}
          disabled={hours <= minHours}
        >
          <IconSymbol 
            size={24} 
            name="minus" 
            color={hours <= minHours ? Theme.colors.textTertiary : Theme.colors.primary} 
          />
        </TouchableOpacity>

        <View style={styles.hoursDisplay}>
          <Text style={styles.hoursText}>{getHoursDisplay()}</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: localIsPaidByHour 
                    ? `${Math.min((hours / 12) * 100, 100)}%`
                    : `${Math.min((hours / (localStandardHours * 1.5)) * 100, 100)}%`,
                  backgroundColor: getStatusColor()
                }
              ]} 
            />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            hours >= maxHours && styles.buttonDisabled
          ]}
          onPress={increaseHours}
          disabled={hours >= maxHours}
        >
          <IconSymbol 
            size={24} 
            name="plus" 
            color={hours >= maxHours ? Theme.colors.textTertiary : Theme.colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.presets}>
        <Text style={styles.presetsLabel}>{t('calendar.quick_presets')}</Text>
        <View style={styles.presetButtons}>
          {(() => {
            // Si es pago por hora, usar presets fijos
            const presets = localIsPaidByHour 
              ? [2, 4, 6, 8, 10] // Presets fijos para pago por hora
              : [
                  Math.round(localStandardHours * 0.5), // 50% del estándar
                  Math.round(localStandardHours * 0.75), // 75% del estándar
                  localStandardHours, // Horas estándar
                  Math.round(localStandardHours * 1.25), // 125% del estándar
                  Math.round(localStandardHours * 1.5), // 150% del estándar
                ].filter((v, i, a) => a.indexOf(v) === i); // Eliminar duplicados
            
            return presets.map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[
                styles.presetButton,
                hours === preset && styles.presetButtonActive
              ]}
              onPress={() => onHoursChange(preset)}
            >
              <Text 
                style={[
                  styles.presetButtonText,
                  hours === preset && styles.presetButtonTextActive
                ]}
              >
                {preset}h
              </Text>
            </TouchableOpacity>
            ));
          })()}
        </View>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.medium,
  },
  standardHoursSection: {
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  standardHoursLabel: {
    ...Theme.typography.footnote,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
    fontWeight: '600',
  },
  standardHoursSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.lg,
  },
  standardButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${Theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.small,
  },
  standardHoursText: {
    ...Theme.typography.title2,
    color: Theme.colors.primary,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'center',
  },
  standardHoursHint: {
    ...Theme.typography.caption2,
    color: Theme.colors.textTertiary,
    marginTop: Theme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.separator,
    marginVertical: Theme.spacing.md,
    marginHorizontal: -Theme.spacing.lg,
  },
  paidByHourContainer: {
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Theme.colors.primary,
  },
  paidByHourLabel: {
    ...Theme.typography.callout,
    color: Theme.colors.text,
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  title: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  status: {
    ...Theme.typography.footnote,
    fontWeight: '600',
  },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.lg,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.small,
  },
  buttonDisabled: {
    backgroundColor: `${Theme.colors.textTertiary}10`,
  },
  hoursDisplay: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: Theme.spacing.lg,
  },
  hoursText: {
    ...Theme.typography.title1,
    color: Theme.colors.text,
    fontWeight: '600',
    marginBottom: Theme.spacing.sm,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: `${Theme.colors.textTertiary}20`,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  presets: {
    alignItems: 'center',
  },
  presetsLabel: {
    ...Theme.typography.footnote,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  presetButton: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: `${Theme.colors.primary}10`,
    borderWidth: 1,
    borderColor: `${Theme.colors.primary}20`,
  },
  presetButtonActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  presetButtonText: {
    ...Theme.typography.footnote,
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  presetButtonTextActive: {
    color: '#FFFFFF',
  },
});