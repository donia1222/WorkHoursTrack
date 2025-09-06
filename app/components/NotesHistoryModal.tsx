import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useTimeFormat } from '../hooks/useTimeFormat';
import { JobService } from '../services/JobService';
import { Job, WorkDay } from '../types/WorkTypes';

interface NotesHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  jobs: Job[];
}

interface NoteItemProps {
  workDay: WorkDay;
  job: Job | undefined;
  onEdit: (id: string, note: string) => void;
  onDelete: (id: string) => void;
}

const NoteItem: React.FC<NoteItemProps> = ({ workDay, job, onEdit, onDelete }) => {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { triggerHaptic } = useHapticFeedback();
  const { formatTime: formatTimeFromHours } = useTimeFormat();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(workDay.notes || '');

  const handleSaveEdit = () => {
    onEdit(workDay.id, editText);
    setIsEditing(false);
  };

  return (
    <View style={{
      marginHorizontal: 16,
      marginTop: 16,
      padding: 16,
      backgroundColor: isDark ? colors.surface : colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border + '40',
    }}>
      {/* Header with date and job */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
      }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            {job && (
              <View style={{ 
                width: 10, 
                height: 10, 
                borderRadius: 5,
                backgroundColor: job.color,
                marginRight: 8
              }} />
            )}
            <Text style={{ 
              fontSize: 15, 
              fontWeight: '600',
              color: colors.text 
            }}>
              {job?.name || t('common.unknown_job')}
            </Text>
          </View>
          <Text style={{ 
            fontSize: 13, 
            color: colors.textSecondary 
          }}>
            {new Date(workDay.date).toLocaleDateString(language, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })} • {formatTimeFromHours(workDay.hours)}
          </Text>
          {workDay.actualStartTime && workDay.actualEndTime && (
            <Text style={{ 
              fontSize: 12, 
              color: colors.textSecondary,
              marginTop: 2
            }}>
              {workDay.actualStartTime} - {workDay.actualEndTime}
            </Text>
          )}
        </View>
        
        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              if (isEditing) {
                handleSaveEdit();
              } else {
                setIsEditing(true);
                setEditText(workDay.notes || '');
              }
            }}
            style={{
              padding: 8,
              backgroundColor: isEditing ? 
                (isDark ? 'rgba(74, 222, 128, 0.2)' : 'rgba(34, 197, 94, 0.15)') :
                (isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(96, 165, 250, 0.1)'),
              borderRadius: 8,
            }}
          >
            <IconSymbol 
              size={18} 
              name={isEditing ? "checkmark" : "pencil"} 
              color={isEditing ? 
                (isDark ? '#4ade80' : '#16a34a') :
                (isDark ? '#60a5fa' : '#3b82f6')
              } 
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              onDelete(workDay.id);
            }}
            style={{
              padding: 8,
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
              borderRadius: 8,
            }}
          >
            <IconSymbol size={18} name="trash" color={isDark ? '#f87171' : '#ef4444'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Note content */}
      {isEditing ? (
        <TextInput
          value={editText}
          onChangeText={setEditText}
          multiline
          style={{
            fontSize: 14,
            color: colors.text,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            borderRadius: 8,
            padding: 12,
            minHeight: 60,
            textAlignVertical: 'top',
          }}
          placeholder={t('timer.notes_placeholder')}
          placeholderTextColor={colors.textSecondary}
          autoFocus
        />
      ) : (
        <Text style={{ 
          fontSize: 14, 
          color: colors.text,
          lineHeight: 20
        }}>
          {workDay.notes}
        </Text>
      )}
    </View>
  );
};

export default function NotesHistoryModal({ visible, onClose, jobs }: NotesHistoryModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { triggerHaptic } = useHapticFeedback();
  const [notesData, setNotesData] = useState<WorkDay[]>([]);

  // Helper function to filter out auto-generated notes
  const filterAutoNotes = (workDays: WorkDay[]) => {
    return workDays
      .filter(day => {
        if (!day.notes || day.notes.trim() === '') return false;
        // Filter out all auto-generated notes (Auto-started, Auto-stopped, etc.)
        const noteText = day.notes.trim();
        return !noteText.startsWith('Auto-started') && !noteText.startsWith('Auto-stopped');
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  useEffect(() => {
    const loadNotesHistory = async () => {
      const allWorkDays = await JobService.getWorkDays();
      const workDaysWithNotes = filterAutoNotes(allWorkDays);
      setNotesData(workDaysWithNotes);
    };
    
    if (visible) {
      loadNotesHistory();
    }
  }, [visible]);

  const handleEditNote = async (workDayId: string, newNote: string) => {
    const workDay = notesData.find(d => d.id === workDayId);
    if (workDay) {
      await JobService.updateWorkDay(workDayId, { ...workDay, notes: newNote });
      // Reload notes with proper filtering
      const allWorkDays = await JobService.getWorkDays();
      const workDaysWithNotes = filterAutoNotes(allWorkDays);
      setNotesData(workDaysWithNotes);
    }
  };

  const handleDeleteNote = async (workDayId: string) => {
    Alert.alert(
      t('timer.delete_note_title'),
      t('timer.delete_note_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const workDay = notesData.find(d => d.id === workDayId);
            if (workDay) {
              await JobService.updateWorkDay(workDayId, { ...workDay, notes: '' });
              // Reload notes with proper filtering
              const allWorkDays = await JobService.getWorkDays();
              const workDaysWithNotes = filterAutoNotes(allWorkDays);
              setNotesData(workDaysWithNotes);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <View style={{ 
          flex: 1, 
          marginTop: 100,
          backgroundColor: colors.background, 
          borderTopLeftRadius: 20, 
          borderTopRightRadius: 20,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 10
        }}>
          {/* Modal Header */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border
          }}>
            <Text style={{ 
              fontSize: 20, 
              fontWeight: '700', 
              color: colors.text 
            }}>
              {t('timer.notes_history')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                onClose();
              }}
              style={{ padding: 8 }}
            >
              <IconSymbol size={24} name="xmark.circle.fill" color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Notes List */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
            {notesData.length > 0 ? (
              notesData.map(workDay => {
                const job = jobs.find(j => j.id === workDay.jobId);
                return (
                  <NoteItem
                    key={workDay.id}
                    workDay={workDay}
                    job={job}
                    onEdit={handleEditNote}
                    onDelete={handleDeleteNote}
                  />
                );
              })
            ) : (
              <View style={{ 
                flex: 1, 
                justifyContent: 'center', 
                alignItems: 'center',
                paddingVertical: 60
              }}>
                <IconSymbol size={48} name="note.text" color={colors.textSecondary + '60'} />
                <Text style={{ 
                  fontSize: 16, 
                  color: colors.textSecondary,
                  marginTop: 16,
                  textAlign: 'center'
                }}>
                  {t('timer.no_notes_yet')}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}