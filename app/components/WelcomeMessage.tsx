import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: isDark ? colors.surface : '#F8F9FF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 4,
    marginHorizontal: 12,
    maxWidth: '100%',

    borderWidth: 1,
    borderColor: isDark ? colors.border : colors.primary + '20',
    shadowColor: isDark ? '#FFFFFF' : '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: isDark ? 0.05 : 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  featuresList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: isDark ? colors.primary + '15' : colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.separator,
    marginVertical: 16,
  },
  actionSection: {
    backgroundColor: isDark ? colors.primary + '08' : colors.primary + '05',
    borderRadius: 12,
    padding: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  actionIcon: {
    marginRight: 10,
  },
  actionText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'left',
    marginTop: 12,
    opacity: 0.7,
  },
});

export default function WelcomeMessage() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(colors, isDark);

  const messageTime = new Date().toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
        </View>
        <Text style={styles.title}>{t('chatbot.welcome_title')}</Text>
      </View>
      
      <Text style={styles.subtitle}>
        {t('chatbot.welcome_subtitle')}
      </Text>

      <View style={styles.featuresList}>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons name="document-text" size={16} color={colors.primary} />
          </View>
          <Text style={styles.featureText}>{t('chatbot.feature_analyze')}</Text>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons name="search" size={16} color={colors.primary} />
          </View>
          <Text style={styles.featureText}>{t('chatbot.feature_extract')}</Text>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons name="calendar" size={16} color={colors.primary} />
          </View>
          <Text style={styles.featureText}>{t('chatbot.feature_identify')}</Text>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons name="people" size={16} color={colors.primary} />
          </View>
          <Text style={styles.featureText}>{t('chatbot.feature_detect')}</Text>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons name="download" size={16} color={colors.primary} />
          </View>
          <Text style={styles.featureText}>{t('chatbot.feature_export')}</Text>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons name="sync" size={16} color={colors.primary} />
          </View>
          <Text style={styles.featureText}>{t('chatbot.feature_sync')}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.actionSection}>
        <Text style={styles.actionTitle}>{t('chatbot.get_started')}</Text>
        
        <View style={styles.actionItem}>
          <Ionicons name="camera" size={18} color={colors.primary} style={styles.actionIcon} />
          <Text style={styles.actionText}>{t('chatbot.action_photo')}</Text>
        </View>

        <View style={styles.actionItem}>
          <Ionicons name="document" size={18} color={colors.primary} style={styles.actionIcon} />
          <Text style={styles.actionText}>{t('chatbot.action_document')}</Text>
        </View>

        <View style={styles.actionItem}>
          <Ionicons name="calendar" size={18} color={colors.primary} style={styles.actionIcon} />
          <Text style={styles.actionText}>{t('chatbot.action_export')}</Text>
        </View>

        <View style={styles.actionItem}>
          <Ionicons name="refresh" size={18} color={colors.textSecondary} style={styles.actionIcon} />
          <Text style={styles.actionText}>{t('chatbot.action_reset')}</Text>
        </View>
      </View>

      <Text style={styles.timestamp}>
        {messageTime}
      </Text>
    </View>
  );
}