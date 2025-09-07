import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../context/NavigationContext';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
  customTitle?: string;
  customDescription?: string;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalBackground: {
    padding: 24,
    backgroundColor: colors.surface,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
    color: colors.text,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: colors.separator,
  },
  subscribeButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: colors.textSecondary,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
  },
});

export default function SubscriptionModal({ 
  visible, 
  onClose, 
  feature,
  customTitle,
  customDescription 
}: SubscriptionModalProps) {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { navigateTo } = useNavigation();
  const styles = getStyles(colors, isDark);

  const handleSubscribe = () => {
    onClose();
    navigateTo('subscription');
  };

  const getPremiumFeatures = () => {
    const features = [
      t('subscription.features.unlimited_jobs'),
      t('subscription.features.auto_timer'),
      t('subscription.features.ai_chatbot'),
      t('subscription.features.pdf_export'),
      t('subscription.features.calendar_sync'),
    ];
    return features;
  };

  const getTitle = () => {
    if (customTitle) return customTitle;
    return t('subscription.modal.title');
  };

  const getDescription = () => {
    if (customDescription) return customDescription;
    if (feature) {
      // Handle the translation with feature parameter
      const translationKey = t('subscription.modal.feature_description');
      return translationKey.replace('{{feature}}', feature);
    }
    return t('subscription.modal.description');
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.modalContent}>
          <View style={styles.modalBackground}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <IconSymbol 
                  size={40} 
                  name="crown.fill" 
                  color="#000" 
                />
              </View>
              
              <Text style={styles.title}>
                {getTitle()}
              </Text>
              
    
            </View>

            <View style={styles.featuresSection}>
              {getPremiumFeatures().map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <IconSymbol 
                      size={16} 
                      name="checkmark" 
                      color={colors.primary} 
                    />
                  </View>
                  <Text style={styles.featureText}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.subscribeButton]}
                onPress={handleSubscribe}
              >
                <Text style={styles.subscribeButtonText}>
                  {t('subscription.modal.subscribe_button')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}