import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView 
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import JobsManagementScreen from '../screens/JobsManagementScreen';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const [showJobsManagement, setShowJobsManagement] = useState(false);

  if (showJobsManagement) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <JobsManagementScreen 
          onClose={() => setShowJobsManagement(false)} 
          onNavigate={(screen) => {
            if (screen === 'subscription') {
              setShowJobsManagement(false);
              onClose();
            }
          }}
        />
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol size={24} name="xmark" color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <IconSymbol size={80} name="person.circle.fill" color="#007AFF" />
            </View>
            <Text style={styles.name}>Usuario</Text>
            <Text style={styles.email}>usuario@ejemplo.com</Text>
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Estadísticas</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <IconSymbol size={32} name="clock.fill" color="#34C759" />
                <Text style={styles.statValue}>24.5h</Text>
                <Text style={styles.statLabel}>Esta semana</Text>
              </View>
              <View style={styles.statItem}>
                <IconSymbol size={32} name="location.fill" color="#FF9500" />
                <Text style={styles.statValue}>3</Text>
                <Text style={styles.statLabel}>Ubicaciones</Text>
              </View>
              <View style={styles.statItem}>
                <IconSymbol size={32} name="dollarsign.circle.fill" color="#30D158" />
                <Text style={styles.statValue}>$1,225</Text>
                <Text style={styles.statLabel}>Este mes</Text>
              </View>
            </View>
          </View>

          <View style={styles.optionsSection}>
            <TouchableOpacity 
              style={styles.option}
              onPress={() => setShowJobsManagement(true)}
            >
              <IconSymbol size={24} name="chart.bar.fill" color="#007AFF" />
              <Text style={styles.optionText}>Mis trabajos</Text>
              <IconSymbol size={16} name="chevron.right" color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.option}>
              <IconSymbol size={24} name="gear" color="#666" />
              <Text style={styles.optionText}>Configuración</Text>
              <IconSymbol size={16} name="chevron.right" color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.option}>
              <IconSymbol size={24} name="chart.bar.fill" color="#666" />
              <Text style={styles.optionText}>Reportes detallados</Text>
              <IconSymbol size={16} name="chevron.right" color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.option, styles.lastOption]}>
              <IconSymbol size={24} name="questionmark.circle" color="#666" />
              <Text style={styles.optionText}>Ayuda</Text>
              <IconSymbol size={16} name="chevron.right" color="#999" />
            </TouchableOpacity>
          </View>
          
          {/* Espacio extra al final para asegurar que todo sea visible */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 34,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40, // Extra padding para asegurar que todo sea visible
  },
  bottomPadding: {
    height: 20,
  },
  profileSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  statsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  optionsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  lastOption: {
    borderBottomWidth: 0,
  },
});