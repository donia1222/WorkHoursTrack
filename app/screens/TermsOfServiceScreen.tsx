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

interface TermsOfServiceScreenProps {
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

export default function TermsOfServiceScreen({ onClose }: TermsOfServiceScreenProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title={
          <View style={styles.screenTitle}>
            <IconSymbol size={26} name="doc.text.fill" color={colors.primary} />
            <Text style={[styles.screenTitleText, { color: colors.text }]}>{t('terms_of_service.title')}</Text>
          </View>
        }
        onProfilePress={() => {}}
        showCloseButton={true}
        onClosePress={onClose}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('terms_of_service.title')}</Text>
        <Text style={styles.subtitle}>{t('terms_of_service.subtitle')}</Text>

        <Text style={styles.sectionTitle}>{t('terms_of_service.acceptance_title')}</Text>
        <Text style={styles.paragraph}>
          {t('terms_of_service.acceptance_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('terms_of_service.description_title')}</Text>
        <Text style={styles.paragraph}>
          {t('terms_of_service.description_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('terms_of_service.license_title')}</Text>
        <Text style={styles.paragraph}>
          {t('terms_of_service.license_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('terms_of_service.user_responsibilities_title')}</Text>
        <Text style={styles.paragraph}>
          {t('terms_of_service.user_responsibilities_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('terms_of_service.data_ownership_title')}</Text>
        <Text style={styles.paragraph}>
          {t('terms_of_service.data_ownership_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('terms_of_service.prohibited_uses_title')}</Text>
        <Text style={styles.paragraph}>
          {t('terms_of_service.prohibited_uses_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('terms_of_service.premium_features_title')}</Text>
        <Text style={styles.paragraph}>
          {t('terms_of_service.premium_features_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('terms_of_service.ai_features_title')}</Text>
        <Text style={styles.paragraph}>
          {t('terms_of_service.ai_features_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('terms_of_service.disclaimers_title')}</Text>
        <Text style={styles.paragraph}>
          {t('terms_of_service.disclaimers_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('terms_of_service.limitation_liability_title')}</Text>
        <Text style={styles.paragraph}>
          {t('terms_of_service.limitation_liability_text')}
        </Text>


        <Text style={styles.sectionTitle}>{t('terms_of_service.changes_terms_title')}</Text>
        <Text style={styles.paragraph}>
          {t('terms_of_service.changes_terms_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('terms_of_service.termination_title')}</Text>
        <Text style={styles.paragraph}>
          {t('terms_of_service.termination_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('terms_of_service.governing_law_title')}</Text>
        <Text style={styles.paragraph}>
          {t('terms_of_service.governing_law_text')}
        </Text>

        <Text style={styles.sectionTitle}>{t('terms_of_service.contact_title')}</Text>
        <Text style={styles.paragraph}>
          {t('terms_of_service.contact_text')}
        </Text>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}