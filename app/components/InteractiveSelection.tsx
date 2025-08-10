import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '@/app/contexts/ThemeContext';

export interface SelectionData {
  type: 'person' | 'month' | 'date' | 'department' | 'option' | 'time' | 'location';
  options: string[];
  question?: string;
  icon?: string;
}

interface InteractiveSelectionProps {
  selectionData: SelectionData;
  onSelect: (value: string) => void;
}

const getIconForType = (type: string): string => {
  switch (type) {
    case 'person':
      return 'person';
    case 'month':
    case 'date':
      return 'calendar';
    case 'department':
      return 'briefcase';
    case 'time':
      return 'time';
    case 'location':
      return 'location';
    default:
      return 'list';
  }
};

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  question: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    marginLeft: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  optionButton: {
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
    minWidth: 60,
    maxWidth: '48%',
  },
  selectedButton: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
    opacity: 0.7,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 4,
    flexShrink: 1,
  },
  icon: {
    marginRight: 2,
  },
});

export default function InteractiveSelection({ selectionData, onSelect }: InteractiveSelectionProps) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  if (!selectionData || selectionData.options.length === 0) {
    return null;
  }

  const handleSelect = (option: string) => {
    setSelectedOption(option);
    onSelect(option);
  };

  const iconName = selectionData.icon || getIconForType(selectionData.type);

  return (
    <View style={styles.container}>
      {selectionData.question && (
        <Text style={styles.question}>{selectionData.question}</Text>
      )}
      <View style={styles.optionsContainer}>
        {selectionData.options.map((option, index) => {
          const isSelected = selectedOption === option;
          return (
            <TouchableOpacity
              key={`${option}-${index}`}
              style={[
                styles.optionButton,
                isSelected && styles.selectedButton
              ]}
              onPress={() => handleSelect(option)}
              activeOpacity={0.7}
              disabled={selectedOption !== null}
            >
              <>
                <Ionicons 
                  name={iconName as any} 
                  size={14} 
                  color={isSelected ? colors.primary : colors.textSecondary} 
                />
                <Text 
                  style={[
                    styles.optionText,
                    isSelected && { color: colors.primary }
                  ]} 
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {option}
                </Text>
              </>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}