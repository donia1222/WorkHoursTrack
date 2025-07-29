import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import SubscriptionGuard from './SubscriptionGuard';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { Theme } from '../constants/Theme';
import { IconSymbol } from '@/components/ui/IconSymbol';

// Ejemplo 1: Componente completo protegido
export const PremiumReportsFeature = () => {
  return (
    <SubscriptionGuard
      requireSubscription={true}
      featureName="Reportes Avanzados"
      customMessage="Los reportes detallados y exportación de datos están disponibles solo para usuarios premium."
    >
      <View style={styles.premiumContent}>
        <Text style={styles.premiumTitle}>📊 Reportes Avanzados</Text>
        <Text style={styles.premiumDescription}>
          Aquí tienes acceso a reportes detallados, gráficos avanzados y exportación de datos.
        </Text>
        <TouchableOpacity style={styles.exportButton}>
          <IconSymbol size={16} name="square.and.arrow.up" color="#FFFFFF" />
          <Text style={styles.exportButtonText}>Exportar PDF</Text>
        </TouchableOpacity>
      </View>
    </SubscriptionGuard>
  );
};

// Ejemplo 2: Botón que verifica suscripción antes de ejecutar acción
export const ExportButton = () => {
  const { checkFeatureAccess } = useSubscriptionGuard(true);

  const handleExport = () => {
    if (checkFeatureAccess('Exportar Datos')) {
      // Ejecutar la funcionalidad de exportar
      console.log('Exportando datos...');
    }
  };

  return (
    <TouchableOpacity style={styles.actionButton} onPress={handleExport}>
      <IconSymbol size={16} name="square.and.arrow.up" color="#FFFFFF" />
      <Text style={styles.actionButtonText}>Exportar</Text>
    </TouchableOpacity>
  );
};

// Ejemplo 3: Verificación condicional de contenido
export const ConditionalPremiumContent = () => {
  const { isSubscribed, canAccess } = useSubscriptionGuard(true);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Estadísticas</Text>
      
      {/* Contenido básico - siempre visible */}
      <View style={styles.basicStats}>
        <Text>Horas trabajadas hoy: 8</Text>
        <Text>Trabajos completados: 3</Text>
      </View>

      {/* Contenido premium - solo para suscriptores */}
      {canAccess ? (
        <View style={styles.premiumStats}>
          <Text style={styles.premiumLabel}>📈 Estadísticas Premium</Text>
          <Text>Eficiencia promedio: 95%</Text>
          <Text>Tiempo de descanso óptimo: 15 min</Text>
          <Text>Proyección semanal: 40 horas</Text>
        </View>
      ) : (
        <SubscriptionGuard
          requireSubscription={true}
          featureName="Estadísticas Avanzadas"
          showUpgradeUI={true}
        >
          <View />
        </SubscriptionGuard>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  premiumContent: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  premiumDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  basicStats: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  premiumStats: {
    backgroundColor: '#fff9e6',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  premiumLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#B8860B',
  },
  exportButton: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});