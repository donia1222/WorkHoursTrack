import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  FlatList,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { BackupFrequency } from '../services/AutoBackupService';

interface AutoBackupModalProps {
  visible: boolean;
  onClose: () => void;
  enabled: boolean;
  frequency: BackupFrequency;
  availableBackups: any[];
  lastBackupDate: string | null;
  onConfigChange: (enabled: boolean, frequency: BackupFrequency) => void;
  onDownloadBackup: (backup: any) => void;
  onRefreshBackups?: () => void;
  onDeleteBackup?: (backup: any) => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  modalContent: {
    padding: 20,
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  frequencyOptions: {
    marginTop: 12,
  },
  frequencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  frequencyOptionActive: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  frequencyLabel: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
  },
  statusContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  backupList: {
    maxHeight: 200,
  },
  backupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  backupInfo: {
    flex: 1,
  },
  backupName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  backupDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  downloadButton: {
    padding: 8,
  },
  emptyBackupsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});

export default function AutoBackupModal({
  visible,
  onClose,
  enabled,
  frequency,
  availableBackups,
  lastBackupDate,
  onConfigChange,
  onDownloadBackup,
  onRefreshBackups,
  onDeleteBackup,
}: AutoBackupModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [localFrequency, setLocalFrequency] = useState(frequency);

  // Sync local state with props when modal opens
  useEffect(() => {
    if (visible) {
      setLocalEnabled(enabled);
      setLocalFrequency(frequency);
    }
  }, [visible, enabled, frequency]);

  const handleSave = () => {
    onConfigChange(localEnabled, localFrequency);
    onClose();
  };

  const frequencyOptions = [
    { value: 'daily' as BackupFrequency, label: t('auto_backup.frequencies.daily') },
    { value: 'weekly' as BackupFrequency, label: t('auto_backup.frequencies.weekly') },
    { value: 'monthly' as BackupFrequency, label: t('auto_backup.frequencies.monthly') },
  ];

  const formatBackupDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  };

  const styles = getStyles(colors, isDark);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.headerTitle}>{t('auto_backup.title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol size={24} name="xmark" color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Enable/Disable Auto Backup */}
            <View style={styles.section}>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>{t('auto_backup.enable')}</Text>
                <Switch
                  value={localEnabled}
                  onValueChange={(value) => {
                    setLocalEnabled(value);
                    // Save immediately when toggling the switch
                    onConfigChange(value, localFrequency);
                  }}
                  trackColor={{ false: colors.separator, true: colors.primary }}
                  thumbColor={localEnabled ? '#FFFFFF' : colors.textSecondary}
                />
              </View>
            </View>

            {/* Frequency Selection */}
            {localEnabled && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('auto_backup.frequency')}</Text>
                <View style={styles.frequencyOptions}>
                  {frequencyOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.frequencyOption,
                        localFrequency === option.value && styles.frequencyOptionActive,
                      ]}
                      onPress={() => {
                        setLocalFrequency(option.value);
                        // Save immediately when changing frequency
                        onConfigChange(localEnabled, option.value);
                      }}
                    >
                      <IconSymbol
                        size={16}
                        name={localFrequency === option.value ? "checkmark.circle.fill" : "circle"}
                        color={localFrequency === option.value ? colors.primary : colors.textSecondary}
                      />
                      <Text style={styles.frequencyLabel}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Available Backups */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={styles.sectionTitle}>{t('auto_backup.available_backups')}</Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 8,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: colors.separator,
                  }}
                  onPress={() => {
                    // Add onRefreshBackups prop to handle this
                    if (onRefreshBackups) {
                      onRefreshBackups();
                    }
                  }}
                >
                  <IconSymbol size={16} name="arrow.clockwise" color={colors.primary} />
                </TouchableOpacity>
              </View>
              {availableBackups.length > 0 ? (
                <View style={styles.backupList}>
                  {availableBackups.map((backup, index) => (
                    <View key={index} style={styles.backupItem}>
                      <View style={styles.backupInfo}>
                        <Text style={styles.backupName}>{backup.fileName}</Text>
                        <Text style={styles.backupDate}>
                          {formatBackupDate(backup.createdDate)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                          style={styles.downloadButton}
                          onPress={() => onDownloadBackup(backup)}
                        >
                          <IconSymbol size={20} name="arrow.down.circle" color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.downloadButton, { marginLeft: 4 }]}
                          onPress={() => {
                            if (onDeleteBackup) {
                              onDeleteBackup(backup);
                            }
                          }}
                        >
                          <IconSymbol size={20} name="trash" color={colors.error || '#FF3B30'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyBackupsText}>
                  {t('auto_backup.no_backups_available')}
                </Text>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 16,
              }}
              onPress={handleSave}
            >
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontWeight: '600',
              }}>
                {t('auto_backup.save')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </BlurView>
      </View>
    </Modal>
  );
}