import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Linking,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import TermsOfServiceModal from './TermsOfServiceModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';

interface PrivacyLocationModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: isDark ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  legalButtonsContainer: {
    marginBottom: 16,
  },
  legalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  legalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  acceptButton: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    marginTop: 8,
  },
  skipButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default function PrivacyLocationModal({ visible, onClose, onAccept }: PrivacyLocationModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const styles = getStyles(colors, isDark);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        // Also request background permission for auto-timer
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        console.log('Background location permission:', bgStatus);
      }
      
      // Mark as seen and close
      await AsyncStorage.setItem('privacyLocationSeen', 'true');
      onAccept();
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert(
        t('common.error'),
        t('preferences.notifications.location_error') || 'Error requesting location permission'
      );
    }
  };

  const skipLocationPermission = async () => {
    await AsyncStorage.setItem('privacyLocationSeen', 'true');
    onClose();
  };

  const openEmail = async () => {
    const email = 'info@lweb.ch';
    const subject = 'VixTime App - Privacy Question';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Email', email);
    }
  };

  const openTerms = () => {
    console.log('Opening Terms of Service modal');
    setShowTermsOfService(true);
  };

  const openPrivacy = () => {
    console.log('Opening Privacy Policy modal');
    setShowPrivacyPolicy(true);
  };

  if (visible === null) return null;

  // Show Terms of Service Modal if requested
  if (showTermsOfService) {
    return (
      <TermsOfServiceModal
        visible={true}
        onClose={() => setShowTermsOfService(false)}
      />
    );
  }

  // Show Privacy Policy Modal if requested
  if (showPrivacyPolicy) {
    return (
      <PrivacyPolicyModal
        visible={true}
        onClose={() => setShowPrivacyPolicy(false)}
      />
    );
  }

  return (
    <>
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={skipLocationPermission}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.card}>
              <View style={styles.iconContainer}>
                <IconSymbol size={35} name="location.fill" color={colors.warning} />
              </View>
              
              <Text style={styles.title}>
                {t('onboarding.steps.location.title')}
              </Text>
              
              <Text style={styles.description}>
                {t('onboarding.steps.location.description')}
              </Text>

              <View style={styles.legalButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.legalButton, { 
                    backgroundColor: isDark ? 'rgba(142, 142, 147, 0.1)' : 'rgba(142, 142, 147, 0.08)',
                    borderColor: isDark ? 'rgba(142, 142, 147, 0.3)' : 'rgba(142, 142, 147, 0.2)',
                  }]}
                  onPress={openTerms}
                >
                  <IconSymbol size={18} name="doc.text.fill" color={colors.textSecondary} />
                  <Text style={[styles.legalButtonText, { color: colors.textSecondary }]}>
                    {t('help_support.legal.terms')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.legalButton, { 
                    backgroundColor: isDark ? 'rgba(52, 199, 89, 0.1)' : 'rgba(52, 199, 89, 0.08)',
                    borderColor: isDark ? 'rgba(52, 199, 89, 0.3)' : 'rgba(52, 199, 89, 0.2)',
                  }]}
                  onPress={openPrivacy}
                >
                  <IconSymbol size={18} name="lock.fill" color={colors.success} />
                  <Text style={[styles.legalButtonText, { color: colors.success }]}>
                    {t('help_support.legal.privacy')}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={requestLocationPermission}
              >
                <Text style={styles.acceptButtonText}>
                  {t('onboarding.navigation.allow_location') || 'Allow Location Access'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.skipButton}
                onPress={skipLocationPermission}
              >
                <Text style={styles.skipButtonText}>
                  {t('onboarding.navigation.skip') || 'Continue without location'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}