import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';

interface PrivacyPolicyScreenProps {
  onClose?: () => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: Theme.spacing.md,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: Theme.spacing.xl,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: Theme.spacing.xl,
    marginBottom: Theme.spacing.md,
  },
  paragraph: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: Theme.spacing.md,
  },
  listItem: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: Theme.spacing.sm,
    paddingLeft: Theme.spacing.md,
  },
  emphasis: {
    fontWeight: '600',
    color: colors.primary,
  },
  screenTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  screenTitleText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});

export default function PrivacyPolicyScreen({ onClose }: PrivacyPolicyScreenProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title={
          <View style={styles.screenTitle}>
            <IconSymbol size={26} name="lock.fill" color={colors.primary} />
            <Text style={[styles.screenTitleText, { color: colors.text }]}>{t('privacy_policy.title')}</Text>
          </View>
        }
        onProfilePress={() => {}}
        showCloseButton={true}
        onClosePress={onClose}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('privacy_policy.title')}</Text>
        <Text style={styles.subtitle}>{t('privacy_policy.subtitle')}</Text>

        <Text style={styles.sectionTitle}>{t('privacy_policy.your_privacy_title')}</Text>
        <Text style={styles.paragraph}>
          {t('privacy_policy.your_privacy_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('privacy_policy.data_storage_title')}</Text>
        <Text style={styles.paragraph}>
          • {t('privacy_policy.local_storage_text')}
        </Text>
        <Text style={styles.paragraph}>
          • {t('privacy_policy.no_cloud_text')}
        </Text>
        <Text style={styles.paragraph}>
          • {t('privacy_policy.no_accounts_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('privacy_policy.data_backup_title')}</Text>
        <Text style={styles.paragraph}>
          {t('privacy_policy.data_backup_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('privacy_policy.ai_chat_title')}</Text>
        <Text style={styles.paragraph}>
          • {t('privacy_policy.ai_anonymous_text')}
        </Text>
        <Text style={styles.paragraph}>
          • {t('privacy_policy.ai_no_storage_text')}
        </Text>
        <Text style={styles.paragraph}>
          • {t('privacy_policy.ai_images_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('privacy_policy.subscriptions_title')}</Text>
        <Text style={styles.paragraph}>
          {t('privacy_policy.subscription_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('privacy_policy.location_data_title')}</Text>
        <Text style={styles.paragraph}>
          {t('privacy_policy.location_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('privacy_policy.third_party_title')}</Text>
        <Text style={styles.paragraph}>
          {t('privacy_policy.third_party_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('privacy_policy.data_security_title')}</Text>
        <Text style={styles.paragraph}>
          {t('privacy_policy.data_security_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('privacy_policy.childrens_privacy_title')}</Text>
        <Text style={styles.paragraph}>
          {t('privacy_policy.childrens_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('privacy_policy.changes_title')}</Text>
        <Text style={styles.paragraph}>
          {t('privacy_policy.changes_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('privacy_policy.contact_us_title')}</Text>
        <Text style={styles.paragraph}>
          {t('privacy_policy.contact_text')}
        </Text>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}