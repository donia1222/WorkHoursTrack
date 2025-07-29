import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '@/app/contexts/ThemeContext';

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
});

export default function ChatMessage({ message }: ChatMessageProps) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  
  const messageTime = message.timestamp.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

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
    </View>
  );
}

