import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface NoJobsWarningProps {
  onCreateJob: () => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    marginVertical: 20,
    borderRadius: 16,
    padding: 24,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default function NoJobsWarning({ onCreateJob }: NoJobsWarningProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(colors, isDark);

  return (
    <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol size={28} name="exclamationmark.triangle.fill" color={colors.warning} />
        </View>
        
        <Text style={styles.title}>{t('common.no_jobs_title')}</Text>
        
        <Text style={styles.message}>{t('common.no_jobs_message')}</Text>
        
        <TouchableOpacity style={styles.button} onPress={onCreateJob}>
          <IconSymbol size={20} name="plus" color="#FFFFFF" />
          <Text style={styles.buttonText}>{t('common.create_first_job')}</Text>
        </TouchableOpacity>
      </View>
    </BlurView>
  );
}