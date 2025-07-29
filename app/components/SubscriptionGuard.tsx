import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { Theme } from '../constants/Theme';
import { useTheme } from '../contexts/ThemeContext';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
  featureName?: string;
  customMessage?: string;
  showUpgradeUI?: boolean;
}

export default function SubscriptionGuard({
  children,
  requireSubscription = true,
  featureName,
  customMessage,
  showUpgradeUI = true,
}: SubscriptionGuardProps) {
  const { canAccess, isLoading } = useSubscriptionGuard(requireSubscription, customMessage);
  const { colors } = useTheme();
  const router = useRouter();

  if (isLoading) {
    return null; // or loading spinner
  }

  if (!requireSubscription || canAccess) {
    return <>{children}</>;
  }

  if (!showUpgradeUI) {
    return null;
  }

  // Show upgrade UI when subscription is required but user is not subscribed
  return (
    <View style={[styles.container, { borderColor: colors.separator }]}>
      <View style={styles.iconContainer}>
        <IconSymbol size={40} name="crown.fill" color="#FFD700" />
      </View>
      
      <Text style={[styles.title, { color: colors.text }]}>
        {featureName ? `${featureName} Premium` : 'Función Premium'}
      </Text>
      
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {customMessage || 'Esta función requiere una suscripción premium para desbloquear todas las características.'}
      </Text>
      
      <TouchableOpacity
        style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/subscription' as any)}
      >
        <IconSymbol size={16} name="crown.fill" color="#FFFFFF" />
        <Text style={styles.upgradeButtonText}>Suscribirse Ahora</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    margin: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});