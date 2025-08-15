import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { BlurView } from 'expo-blur';

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {

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
    color: colors.text,
    textAlign: 'left',
    marginTop: -12,
    opacity: 0.7,
  },
  infoButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 14,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  modalActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  modalActionIcon: {
    marginRight: 12,
  },
  modalActionText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
});

export default function WelcomeMessage() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(colors, isDark);
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const messageTime = new Date().toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <>
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>

        
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

      <Text style={styles.timestamp}>
        {messageTime}
      </Text>
      
      <TouchableOpacity
        style={styles.infoButton}
        onPress={() => setShowInfoModal(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="information-circle" size={26} color={colors.secondary} />
      </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('chatbot.get_started')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowInfoModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.modalActionItem}>
                <Ionicons name="camera" size={20} color={colors.primary} style={styles.modalActionIcon} />
                <Text style={styles.modalActionText}>{t('chatbot.action_photo')}</Text>
              </View>

              <View style={styles.modalActionItem}>
                <Ionicons name="document" size={20} color={colors.primary} style={styles.modalActionIcon} />
                <Text style={styles.modalActionText}>{t('chatbot.action_document')}</Text>
              </View>

              <View style={styles.modalActionItem}>
                <Ionicons name="calendar" size={20} color={colors.primary} style={styles.modalActionIcon} />
                <Text style={styles.modalActionText}>{t('chatbot.action_export')}</Text>
              </View>

              <View style={styles.modalActionItem}>
                <Ionicons name="refresh" size={20} color={colors.textSecondary} style={styles.modalActionIcon} />
                <Text style={styles.modalActionText}>{t('chatbot.action_reset')}</Text>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    </>
  );
}