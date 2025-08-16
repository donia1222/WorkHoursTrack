import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
  Share,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { BlurView } from 'expo-blur';
import Header from '../components/Header';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import TermsOfServiceScreen from './TermsOfServiceScreen';

interface SupportTermsScreenProps {
  onClose?: () => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
  },
  sectionCard: {
    marginVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.medium,
  },
  sectionTitle: {
    ...Theme.typography.headline,
    color: colors.text,
    marginBottom: 4,
    fontWeight: '600',
  },
  sectionDescription: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    marginBottom: Theme.spacing.md,
    lineHeight: 18,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    ...Theme.typography.callout,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactDescription: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  legalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  legalContent: {
    flex: 1,
  },
  legalTitle: {
    ...Theme.typography.callout,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  legalDescription: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
  },
  versionInfo: {
    alignItems: 'center',
    marginTop: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  versionText: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  versionSubtext: {
    ...Theme.typography.caption2,
    color: colors.textTertiary,
    marginTop: 2,
  },
  emailIconBg: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  whatsappIconBg: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  scheduleIconBg: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
  },
  shareIconBg: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  termsIconBg: {
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
  },
  privacyIconBg: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  screenTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20
  },
  screenTitleText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});

export default function SupportTermsScreen({ onClose }: SupportTermsScreenProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { isSubscribed, customerInfo } = useSubscription();
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  
  const styles = getStyles(colors, isDark);

  const openEmail = async () => {
    
    // Obtener información del usuario y suscripción
    const userInfo = [];
    
    // Estado de suscripción
    userInfo.push(`Subscription Status: ${isSubscribed ? 'PREMIUM ✓' : 'FREE'}`);
    
    // ID de usuario
    if (customerInfo?.originalAppUserId) {
      userInfo.push(`User ID: ${customerInfo.originalAppUserId}`);
    }
    
    // Fecha de primera compra si está suscrito
    if (isSubscribed && customerInfo?.firstSeen) {
      const firstPurchaseDate = new Date(customerInfo.firstSeen).toLocaleDateString();
      userInfo.push(`Customer Since: ${firstPurchaseDate}`);
    }
    
    // Si tiene suscripción activa, mostrar fecha de expiración
    if (isSubscribed && customerInfo?.entitlements?.active?.['premium']) {
      const premium = customerInfo.entitlements.active['premium'];
      if (premium.expirationDate) {
        const expirationDate = new Date(premium.expirationDate).toLocaleDateString();
        userInfo.push(`Expires: ${expirationDate}`);
      }
      if (premium.willRenew !== undefined) {
        userInfo.push(`Auto-Renewal: ${premium.willRenew ? 'ON' : 'OFF'}`);
      }
    }
    
    // Información del dispositivo
    userInfo.push(`Platform: ${Platform.OS} ${Platform.Version}`);
    userInfo.push(`App Version: 1.0.0`);
    
    // Construir el body del email
    const emailBody = `

--------------------
Support Information:
--------------------
${userInfo.join('\n')}
--------------------

Please describe your issue below:


`;
    
    // Crear el URL del email con la información
    const subject = encodeURIComponent('VixTime Support Request');
    const body = encodeURIComponent(emailBody);
    const emailUrl = `mailto:info@lweb.ch?subject=${subject}&body=${body}`;
    
    Linking.openURL(emailUrl);
  };

  const openWhatsApp = () => {
    Linking.openURL('https://wa.me/41765608645');
  };

  const openTerms = () => {
    setShowTermsOfService(true);
  };

  const openPrivacy = () => {
    setShowPrivacyPolicy(true);
  };

  const shareApp = async () => {
    try {
      await Share.share({
        message: t('help_support.contact.share_message') || 'Check out VixTime - The best app for tracking your work hours!',
        url: 'https://vixtime.com',
        title: 'VixTime App'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title={
          <View style={styles.screenTitle}>
            <IconSymbol size={26} name="shield.fill" color={colors.primary} />
            <Text style={[styles.screenTitleText, { color: colors.text }]}>{t('help_support.support_terms.title')}</Text>
          </View>
        }
        onProfilePress={() => {}}
        showCloseButton={true}
        onClosePress={onClose}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact Support */}
        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('help_support.contact.title')}</Text>
          <Text style={styles.sectionDescription}>
            {t('help_support.contact.description')}
          </Text>
          
          <TouchableOpacity style={styles.contactItem} onPress={openEmail}>
            <View style={[styles.contactIcon, styles.emailIconBg]}>
              <IconSymbol size={24} name="envelope.fill" color={colors.primary} />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>{t('help_support.contact.email')}</Text>
              <Text style={styles.contactDescription}>info@lweb.ch</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.contactItem} onPress={openWhatsApp}>
            <View style={[styles.contactIcon, styles.whatsappIconBg]}>
              <IconSymbol size={24} name="message.fill" color={colors.success} />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>{t('help_support.contact.whatsapp')}</Text>
              <Text style={styles.contactDescription}>+41 76 560 86 45</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <View style={styles.contactItem}>
            <View style={[styles.contactIcon, styles.scheduleIconBg]}>
              <IconSymbol size={24} name="clock.fill" color={colors.warning} />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>{t('help_support.contact.schedule')}</Text>
              <Text style={styles.contactDescription}>{t('help_support.contact.schedule_hours')}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.contactItem} onPress={shareApp}>
            <View style={[styles.contactIcon, styles.shareIconBg]}>
              <IconSymbol size={24} name="square.and.arrow.up" color={colors.success} />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>{t('help_support.contact.share_app')}</Text>
              <Text style={styles.contactDescription}>{t('help_support.contact.share_app_desc')}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        </BlurView>

        {/* Legal */}
        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('help_support.legal.title')}</Text>
          
          <TouchableOpacity style={styles.legalItem} onPress={openTerms}>
            <View style={[styles.legalIcon, styles.termsIconBg]}>
              <IconSymbol size={24} name="doc.text.fill" color={colors.textSecondary} />
            </View>
            <View style={styles.legalContent}>
              <Text style={styles.legalTitle}>{t('help_support.legal.terms')}</Text>
              <Text style={styles.legalDescription}>{t('help_support.legal.terms_description')}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.legalItem} onPress={openPrivacy}>
            <View style={[styles.legalIcon, styles.privacyIconBg]}>
              <IconSymbol size={24} name="lock.fill" color={colors.primary} />
            </View>
            <View style={styles.legalContent}>
              <Text style={styles.legalTitle}>{t('help_support.legal.privacy')}</Text>
              <Text style={styles.legalDescription}>{t('help_support.legal.privacy_description')}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>{t('help_support.legal.version')}</Text>
            <Text style={styles.versionSubtext}>{t('help_support.legal.last_update')}</Text>
          </View>
        </BlurView>
      </ScrollView>
      
      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyPolicy}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowPrivacyPolicy(false)}
      >
        <PrivacyPolicyScreen onClose={() => setShowPrivacyPolicy(false)} />
      </Modal>
      
      {/* Terms of Service Modal */}
      <Modal
        visible={showTermsOfService}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowTermsOfService(false)}
      >
        <TermsOfServiceScreen onClose={() => setShowTermsOfService(false)} />
      </Modal>
    </SafeAreaView>
  );
}