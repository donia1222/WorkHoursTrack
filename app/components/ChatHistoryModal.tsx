import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { ChatMessageData } from './ChatMessage';

export interface ChatSession {
  id: string;
  date: Date;
  messages: ChatMessageData[];
  preview?: string;
}

interface ChatHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onRestoreSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 12,
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 120,
    opacity: 0.1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  listContainer: {
    paddingBottom: 20,
  },
  sessionItem: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  sessionGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.03,
  },
  sessionContent: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.2,
  },
  sessionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textSecondary,
    marginHorizontal: 8,
  },
  sessionTime: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sessionPreview: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 2,
  },
  messageCount: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 6,
    fontWeight: '500',
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 10,
    marginLeft: 12,
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  restoreButton: {
    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)',
    borderColor: isDark ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 122, 255, 0.15)',
  },
  deleteButton: {
    backgroundColor: isDark ? 'rgba(255, 59, 48, 0.12)' : 'rgba(255, 59, 48, 0.08)',
    borderColor: isDark ? 'rgba(255, 59, 48, 0.3)' : 'rgba(255, 59, 48, 0.15)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});

export default function ChatHistoryModal({
  visible,
  onClose,
  sessions,
  onRestoreSession,
  onDeleteSession,
}: ChatHistoryModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { triggerHaptic } = useHapticFeedback();
  const styles = getStyles(colors, isDark);

  const formatDate = (date: Date) => {
    const now = new Date();
    const sessionDate = new Date(date);
    const diffInDays = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return t('chatbot.history.today') || 'Hoy';
    } else if (diffInDays === 1) {
      return t('chatbot.history.yesterday') || 'Ayer';
    } else if (diffInDays < 7) {
      return `${diffInDays} ${t('chatbot.history.days_ago') || 'días atrás'}`;
    } else {
      return sessionDate.toLocaleDateString();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleRestore = (session: ChatSession) => {
    triggerHaptic('light');
    Alert.alert(
      t('chatbot.history.restore_title') || 'Restaurar sesión',
      t('chatbot.history.restore_message') || 'Esto reemplazará la conversación actual. ¿Continuar?',
      [
        {
          text: t('common.cancel') || 'Cancelar',
          style: 'cancel',
        },
        {
          text: t('chatbot.history.restore') || 'Restaurar',
          onPress: () => {
            onRestoreSession(session);
            onClose();
          },
        },
      ]
    );
  };

  const handleDelete = (sessionId: string) => {
    triggerHaptic('light');
    Alert.alert(
      t('chatbot.history.delete_title') || 'Eliminar sesión',
      t('chatbot.history.delete_message') || '¿Estás seguro de que quieres eliminar esta sesión?',
      [
        {
          text: t('common.cancel') || 'Cancelar',
          style: 'cancel',
        },
        {
          text: t('common.delete') || 'Eliminar',
          style: 'destructive',
          onPress: () => {
            onDeleteSession(sessionId);
          },
        },
      ]
    );
  };

  const renderSession = ({ item }: { item: ChatSession }) => {
    const messageCount = item.messages.length;
    const preview = item.preview || 
      (messageCount > 0 ? item.messages[0].text.substring(0, 80) + '...' : 
       t('chatbot.history.no_messages') || 'Sin mensajes');

    return (
      <TouchableOpacity style={styles.sessionItem} activeOpacity={0.98}>
        <BlurView intensity={95} tint={isDark ? "dark" : "light"}>
          <LinearGradient
            colors={isDark 
              ? ['rgba(0, 122, 255, 0.05)', 'rgba(0, 122, 255, 0.02)'] 
              : ['rgba(0, 122, 255, 0.03)', 'rgba(0, 122, 255, 0.01)']}
            style={styles.sessionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.sessionContent}>
            <View style={styles.sessionIconContainer}>
              <IconSymbol size={24} name="message.fill" color={colors.primary} />
            </View>
            <View style={styles.sessionInfo}>
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionDate}>{formatDate(item.date)}</Text>
                <View style={styles.sessionDot} />
                <Text style={styles.sessionTime}>{formatTime(item.date)}</Text>
              </View>
              <Text style={styles.sessionPreview} numberOfLines={2}>
                {preview}
              </Text>
              <Text style={styles.messageCount}>
                {messageCount} {messageCount === 1 ? 'mensaje' : 'mensajes'}
              </Text>
            </View>
            <View style={styles.sessionActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.restoreButton]}
                onPress={() => handleRestore(item)}
                activeOpacity={0.7}
              >
                <IconSymbol size={20} name="arrow.clockwise" color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDelete(item.id)}
                activeOpacity={0.7}
              >
                <IconSymbol size={20} name="trash" color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <IconSymbol 
          size={40} 
          name="clock.arrow.circlepath" 
          color={colors.primary} 
        />
      </View>
      <Text style={styles.emptyText}>
        {t('chatbot.history.empty_title') || 'Sin historial'}
      </Text>
      <Text style={styles.emptySubtext}>
        {t('chatbot.history.empty_message') || 'Las conversaciones se guardarán automáticamente cuando salgas del chat'}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <LinearGradient
            colors={isDark 
              ? ['rgba(0, 122, 255, 0.15)', 'transparent'] 
              : ['rgba(0, 122, 255, 0.08)', 'transparent']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                {t('chatbot.history.title') || 'Historial de chat'}
              </Text>
              <Text style={styles.subtitle}>
                {sessions.length} {sessions.length === 1 ? 'sesión guardada' : 'sesiones guardadas'}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => { triggerHaptic('light'); onClose(); }}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <IconSymbol size={22} name="xmark" color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[{ flexGrow: 1 }, styles.listContainer]}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
  );
}