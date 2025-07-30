import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useNavigation } from '@/app/context/NavigationContext';
import { ChatDataParser } from '@/app/services/ChatDataParser';
import { JobService } from '@/app/services/JobService';
import ExportCalendarModal from './ExportCalendarModal';
import { Job } from '@/app/types/WorkTypes';

export interface ChatMessageData {
  id: number;
  text: string;
  image?: { uri: string };
  document?: { uri: string; name: string; type: string };
  isUser: boolean;
  timestamp: Date;
}

interface ChatMessageProps {
  message: ChatMessageData;
  jobs?: Job[];
  onExportToCalendar?: (selectedJobId: string, parsedData: any) => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
    marginHorizontal: 12,
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: isDark ? colors.surface : '#F2F2F7',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  userDocument: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  botDocument: {
    backgroundColor: isDark ? colors.primary + '20' : '#E8F4FF',
    borderColor: colors.primary,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  userDocumentName: {
    color: '#FFFFFF',
  },
  botDocumentName: {
    color: colors.primary,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: isDark ? colors.text : '#000000',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  userTimestamp: {
    color: '#FFFFFF',
    textAlign: 'right',
  },
  botTimestamp: {
    color: isDark ? colors.textSecondary : '#666666',
    textAlign: 'left',
  },
  exportButton: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default function ChatMessage({ message, jobs = [], onExportToCalendar }: ChatMessageProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { navigateTo } = useNavigation();
  const styles = getStyles(colors, isDark);
  const [showExportModal, setShowExportModal] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  
  const messageTime = message.timestamp.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Detectar si el mensaje contiene datos de horarios (solo para mensajes del bot)
  const hasWorkScheduleData = !message.isUser && ChatDataParser.hasWorkScheduleData(message.text);

  const handleExportPress = () => {
    if (hasWorkScheduleData) {
      const parsed = ChatDataParser.parseWorkSchedule(message.text);
      if (parsed) {
        setParsedData(parsed);
        setShowExportModal(true);
      }
    }
  };

  const handleExportConfirm = async (selectedJobId: string, parsedData: any) => {
    setShowExportModal(false);
    
    try {
      console.log('🚀 [CHAT MESSAGE] Iniciando exportación directa:', { selectedJobId, parsedData });
      
      // Convertir datos parseados a WorkDays
      const newWorkDays = ChatDataParser.convertToWorkDays(parsedData, selectedJobId);
      console.log('📝 [CHAT MESSAGE] WorkDays convertidos:', newWorkDays);
      
      // Guardar cada WorkDay uno por uno para detectar errores
      console.log('💾 [CHAT MESSAGE] Iniciando guardado de WorkDays...');
      let savedCount = 0;
      
      for (const workDayData of newWorkDays) {
        try {
          console.log('💾 [CHAT MESSAGE] Guardando WorkDay:', workDayData.date, workDayData.type);
          const result = await JobService.addWorkDay(workDayData);
          console.log('✅ [CHAT MESSAGE] WorkDay guardado exitosamente:', result);
          savedCount++;
        } catch (error) {
          console.error('❌ [CHAT MESSAGE] Error guardando WorkDay:', workDayData.date, error);
        }
      }
      
      console.log(`✅ [CHAT MESSAGE] ${savedCount}/${newWorkDays.length} WorkDays guardados exitosamente`);
      
      // Mostrar mensaje de éxito con opción de ir al calendario
      Alert.alert(
        t('chatbot.export_calendar.export_success_title'),
        t('chatbot.export_calendar.export_success_message', { 
          count: newWorkDays.length, 
          personName: parsedData.personName 
        }),
        [
          { text: 'OK' },
          {
            text: t('chatbot.export_calendar.view_calendar_button'),
            onPress: () => {
              console.log('📅 Navegando al calendario...');
              navigateTo('calendar');
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ [CHAT MESSAGE] Error en exportación:', error);
      Alert.alert(t('chatbot.export_calendar.export_error_title'), t('chatbot.export_calendar.export_error_message'));
    }
  };

  return (
    <View style={[
      styles.messageContainer, 
      message.isUser ? styles.userMessage : styles.botMessage
    ]}>
      {message.image && (
        <Image source={message.image} style={styles.messageImage} />
      )}
      
      {message.document && (
        <View style={[
          styles.documentContainer,
          message.isUser ? styles.userDocument : styles.botDocument
        ]}>
          <Ionicons 
            name="document" 
            size={20} 
            color={message.isUser ? '#FFFFFF' : colors.primary} 
          />
          <Text style={[
            styles.documentName,
            message.isUser ? styles.userDocumentName : styles.botDocumentName
          ]}>
            📄 {message.document.name}
          </Text>
        </View>
      )}
      
      {message.text ? (
        <Text style={[
          styles.messageText,
          message.isUser ? styles.userText : styles.botText
        ]}>
          {message.text}
        </Text>
      ) : null}
      
      <Text style={[
        styles.timestamp,
        message.isUser ? styles.userTimestamp : styles.botTimestamp
      ]}>
        {messageTime}
      </Text>

      {/* Botón de exportación para mensajes del bot con datos de horarios */}
      {hasWorkScheduleData && jobs.length > 0 && (
        <TouchableOpacity 
          style={styles.exportButton} 
          onPress={handleExportPress}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar" size={16} color="#FFFFFF" />
          <Text style={styles.exportButtonText}>{t('chatbot.export_calendar.export_button')}</Text>
        </TouchableOpacity>
      )}

      {/* Modal de exportación */}
      <ExportCalendarModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        parsedData={parsedData}
        jobs={jobs}
        onExport={handleExportConfirm}
      />
    </View>
  );
}

