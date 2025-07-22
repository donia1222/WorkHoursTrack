import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { BlurView } from 'expo-blur';

interface HelpSupportScreenProps {
  onClose?: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'time' | 'billing' | 'technical';
}


const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {

    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
  },
  closeButton: {
    padding: Theme.spacing.sm,
    marginRight: -Theme.spacing.sm,
  },
  headerText: {
    flex: 1,
    alignItems: 'flex-start',

  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  headerTitle: {
    ...Theme.typography.headline,
    color: colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
  },
  placeholder: {
    width: 40,
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
  categoryContainer: {
    marginBottom: Theme.spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
    marginRight: Theme.spacing.sm,
    gap: Theme.spacing.xs,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    ...Theme.typography.footnote,
    color: colors.primary,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
    paddingVertical: Theme.spacing.md,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  faqIconContainer: {
    width: 24,
    alignItems: 'center',
  },
  faqQuestion: {
    ...Theme.typography.callout,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  faqAnswer: {
    marginTop: Theme.spacing.sm,
    marginLeft: 32,
    paddingRight: 20,
  },
  faqAnswerText: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    lineHeight: 20,
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
  termsIconBg: {
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
  },
  privacyIconBg: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
});

export default function HelpSupportScreen({ onClose }: HelpSupportScreenProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'general' | 'time' | 'billing' | 'technical'>('all');
  
  const styles = getStyles(colors, isDark);

  const FAQ_DATA: FAQItem[] = [
    {
      question: t('help_support.faq.questions.how_to_start.question'),
      answer: t('help_support.faq.questions.how_to_start.answer'),
      category: 'general'
    },
    {
      question: t('help_support.faq.questions.record_time.question'),
      answer: t('help_support.faq.questions.record_time.answer'),
      category: 'time'
    },
    {
      question: t('help_support.faq.questions.edit_records.question'),
      answer: t('help_support.faq.questions.edit_records.answer'),
      category: 'time'
    },
    {
      question: t('help_support.faq.questions.geolocation.question'),
      answer: t('help_support.faq.questions.geolocation.answer'),
      category: 'technical'
    },
    {
      question: t('help_support.faq.questions.billing_setup.question'),
      answer: t('help_support.faq.questions.billing_setup.answer'),
      category: 'billing'
    },
    {
      question: t('help_support.faq.questions.data_security.question'),
      answer: t('help_support.faq.questions.data_security.answer'),
      category: 'technical'
    },
    {
      question: t('help_support.faq.questions.export_data.question'),
      answer: t('help_support.faq.questions.export_data.answer'),
      category: 'general'
    },
    {
      question: t('help_support.faq.questions.location_issues.question'),
      answer: t('help_support.faq.questions.location_issues.answer'),
      category: 'technical'
    }
  ];

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const filteredFAQs = selectedCategory === 'all' 
    ? FAQ_DATA 
    : FAQ_DATA.filter(item => item.category === selectedCategory);

  const openEmail = () => {
    Linking.openURL('mailto:support@geolocalizacion-app.com?subject=Soporte - Geolocalización App');
  };

  const openTerms = () => {
    // URL de ejemplo - reemplazar con la real
    Linking.openURL('https://example.com/terms');
  };

  const openPrivacy = () => {
    // URL de ejemplo - reemplazar con la real
    Linking.openURL('https://example.com/privacy');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'general': return 'questionmark.circle.fill';
      case 'time': return 'clock.fill';
      case 'billing': return 'dollarsign.circle.fill';
      case 'technical': return 'gear';
      default: return 'list.bullet';
    }
  };

  const getCategoryColor = (category: string, colors: ThemeColors) => {
    switch (category) {
      case 'general': return colors.primary;
      case 'time': return colors.success;
      case 'billing': return colors.warning;
      case 'technical': return colors.textSecondary;
      default: return colors.primary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.placeholder} />
          <View style={styles.headerText}>
            <View style={styles.titleContainer}>
              <IconSymbol size={26} name="questionmark.circle" color={colors.primary} />
              <Text style={styles.headerTitle}>{t('help_support.title')}</Text>
            </View>
            <Text style={styles.headerSubtitle}>{t('help_support.subtitle')}</Text>
          </View>
          <TouchableOpacity 
            onPress={onClose}
            style={styles.closeButton}
          >
            <IconSymbol size={24} name="xmark" color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* FAQ Categories */}
        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('help_support.faq.title')}</Text>
          <Text style={styles.sectionDescription}>
            {t('help_support.faq.description')}
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
            <TouchableOpacity 
              style={[styles.categoryButton, selectedCategory === 'all' && styles.categoryButtonActive]}
              onPress={() => setSelectedCategory('all')}
            >
              <IconSymbol size={18} name="list.bullet" color={selectedCategory === 'all' ? '#FFFFFF' : colors.primary} />
              <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>
                {t('help_support.faq.categories.all')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.categoryButton, selectedCategory === 'general' && styles.categoryButtonActive]}
              onPress={() => setSelectedCategory('general')}
            >
              <IconSymbol size={18} name="questionmark.circle.fill" color={selectedCategory === 'general' ? '#FFFFFF' : colors.primary} />
              <Text style={[styles.categoryText, selectedCategory === 'general' && styles.categoryTextActive]}>
                {t('help_support.faq.categories.general')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.categoryButton, selectedCategory === 'time' && styles.categoryButtonActive]}
              onPress={() => setSelectedCategory('time')}
            >
              <IconSymbol size={18} name="clock.fill" color={selectedCategory === 'time' ? '#FFFFFF' : colors.success} />
              <Text style={[styles.categoryText, selectedCategory === 'time' && styles.categoryTextActive]}>
                {t('help_support.faq.categories.time')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.categoryButton, selectedCategory === 'billing' && styles.categoryButtonActive]}
              onPress={() => setSelectedCategory('billing')}
            >
              <IconSymbol size={18} name="dollarsign.circle.fill" color={selectedCategory === 'billing' ? '#FFFFFF' : colors.warning} />
              <Text style={[styles.categoryText, selectedCategory === 'billing' && styles.categoryTextActive]}>
                {t('help_support.faq.categories.billing')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.categoryButton, selectedCategory === 'technical' && styles.categoryButtonActive]}
              onPress={() => setSelectedCategory('technical')}
            >
              <IconSymbol size={18} name="gear" color={selectedCategory === 'technical' ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[styles.categoryText, selectedCategory === 'technical' && styles.categoryTextActive]}>
                {t('help_support.faq.categories.technical')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </BlurView>

        {/* FAQ List */}
        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.sectionCard}>
          {filteredFAQs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqItem}
              onPress={() => toggleFAQ(index)}
            >
              <View style={styles.faqHeader}>
                <View style={styles.faqIconContainer}>
                  <IconSymbol 
                    size={16} 
                    name={getCategoryIcon(faq.category)} 
                    color={getCategoryColor(faq.category, colors)} 
                  />
                </View>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <IconSymbol 
                  size={16} 
                  name={expandedFAQ === index ? "chevron.up" : "chevron.down"} 
                  color={colors.textSecondary} 
                />
              </View>
              {expandedFAQ === index && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </BlurView>

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
              <Text style={styles.contactDescription}>{t('help_support.contact.email_address')}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <View style={styles.contactItem}>
            <View style={[styles.contactIcon, styles.whatsappIconBg]}>
              <IconSymbol size={24} name="message.fill" color={colors.success} />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>{t('help_support.contact.whatsapp')}</Text>
              <Text style={styles.contactDescription}>{t('help_support.contact.whatsapp_number')}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={Theme.colors.textSecondary} />
          </View>
          
          <View style={styles.contactItem}>
            <View style={[styles.contactIcon, styles.scheduleIconBg]}>
              <IconSymbol size={24} name="clock.fill" color={colors.warning} />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>{t('help_support.contact.schedule')}</Text>
              <Text style={styles.contactDescription}>{t('help_support.contact.schedule_hours')}</Text>
            </View>
          </View>
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
    </SafeAreaView>
  );
}

