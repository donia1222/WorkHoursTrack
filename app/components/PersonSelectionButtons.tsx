import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '@/app/contexts/ThemeContext';

interface PersonSelectionButtonsProps {
  names: string[];
  onSelectPerson: (name: string) => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    marginLeft: 8,
  },
  scrollView: {
    maxHeight: 100,
  },
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  personButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? colors.surface : '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
    marginRight: 6,
    marginBottom: 6,
    minWidth: 80,
  },
  selectedButton: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
    opacity: 0.7,
  },
  personButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 4,
  },
  icon: {
    marginRight: 2,
  },
});

export default function PersonSelectionButtons({ names, onSelectPerson }: PersonSelectionButtonsProps) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  // Debug: log nombres detectados
  console.log('🔍 [PersonSelectionButtons] Nombres detectados:', names);

  if (names.length === 0) {
    return null;
  }

  const handleSelectPerson = (name: string) => {
    setSelectedPerson(name);
    onSelectPerson(name);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona una persona:</Text>
      <View style={styles.buttonsContainer}>
        {names.map((name, index) => {
          const isSelected = selectedPerson === name;
          return (
            <TouchableOpacity
              key={`${name}-${index}`}
              style={[
                styles.personButton,
                isSelected && styles.selectedButton
              ]}
              onPress={() => handleSelectPerson(name)}
              activeOpacity={0.7}
              disabled={selectedPerson !== null}
            >
              {isSelected ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons 
                    name="person" 
                    size={14} 
                    color={isSelected ? colors.primary : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.personButtonText,
                    isSelected && { color: colors.primary }
                  ]} numberOfLines={1}>
                    {name}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}