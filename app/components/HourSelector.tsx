import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { BlurView } from 'expo-blur';

interface HourSelectorProps {
  hours: number;
  onHoursChange: (hours: number) => void;
  minHours?: number;
  maxHours?: number;
}

export default function HourSelector({ 
  hours, 
  onHoursChange, 
  minHours = 0.5, 
  maxHours = 16 
}: HourSelectorProps) {
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
    if (hours <= 4) return 'short';
    if (hours <= 8) return 'normal';
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
        return 'Jornada corta';
      case 'normal':
        return 'Jornada normal';
      case 'overtime':
        return 'Horas extra';
      default:
        return 'Jornada normal';
    }
  };

  return (
    <BlurView intensity={95} tint="light" style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Horas trabajadas</Text>
        <Text style={[styles.status, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
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
                  width: `${Math.min((hours / 12) * 100, 100)}%`,
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
        <Text style={styles.presetsLabel}>Presets rápidos:</Text>
        <View style={styles.presetButtons}>
          {[4, 6, 8, 10, 12].map((preset) => (
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
          ))}
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