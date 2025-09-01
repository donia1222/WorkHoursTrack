import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Job } from '../types/WorkTypes';

interface StopAutoTimerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  job: Job | null;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    width: '99%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.warning + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  content: {
    padding: 24,
    paddingTop: 0,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  jobInfo: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobColorIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  jobDetails: {
    flex: 1,
  },
  jobName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  jobCompany: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  autoTimerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.success + '40',
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  autoTimerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
    marginLeft: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.separator,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  stopButton: {
    backgroundColor: colors.warning,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default function StopAutoTimerModal({
  visible,
  onClose,
  onConfirm,
  job,
}: StopAutoTimerModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(colors, isDark);

  if (!job) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={styles.modal}>
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <IconSymbol size={32} name="exclamationmark.triangle" color={colors.warning} />
                </View>
                <Text style={styles.title}>
                  {t('timer.auto_timer.manual_override')}
                </Text>
              </View>
              
              <View style={styles.content}>
                <Text style={styles.message}>
                  {t('timer.auto_timer.manual_override_message')}
                </Text>
                
                <View style={styles.jobInfo}>
                  <View style={[styles.jobColorIndicator, { backgroundColor: job.color }]} />
                  <View style={styles.jobDetails}>
                    <Text style={styles.jobName}>{job.name}</Text>
                    {job.company && (
                      <Text style={styles.jobCompany}>{job.company}</Text>
                    )}
                    <View style={styles.autoTimerChip}>
                      <View style={styles.greenDot} />
                      <Text style={styles.autoTimerText}>AutoTimer</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.buttons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={onClose}
                  >
                    <IconSymbol size={24} name="xmark" color={colors.text} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.button, styles.stopButton]}
                    onPress={handleConfirm}
                  >
                    <Text style={styles.stopButtonText}>
                      {t('timer.stop')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          ) : (
            <View style={styles.modal}>
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <IconSymbol size={32} name="exclamationmark.triangle" color={colors.warning} />
                </View>
                <Text style={styles.title}>
                  {t('timer.auto_timer.manual_override')}
                </Text>
              </View>
              
              <View style={styles.content}>
                <Text style={styles.message}>
                  {t('timer.auto_timer.manual_override_message')}
                </Text>
                
                <View style={styles.jobInfo}>
                  <View style={[styles.jobColorIndicator, { backgroundColor: job.color }]} />
                  <View style={styles.jobDetails}>
                    <Text style={styles.jobName}>{job.name}</Text>
                    {job.company && (
                      <Text style={styles.jobCompany}>{job.company}</Text>
                    )}
                    <View style={styles.autoTimerChip}>
                      <View style={styles.greenDot} />
                      <Text style={styles.autoTimerText}>AutoTimer</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.buttons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={onClose}
                  >
                    <IconSymbol size={24} name="xmark" color={colors.text} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.button, styles.stopButton]}
                    onPress={handleConfirm}
                  >
                    <Text style={styles.stopButtonText}>
                      {t('timer.stop')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}