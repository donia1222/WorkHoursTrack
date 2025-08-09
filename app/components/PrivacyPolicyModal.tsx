import React from 'react';
import { Modal } from 'react-native';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ visible, onClose }: PrivacyPolicyModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <PrivacyPolicyScreen onClose={onClose} />
    </Modal>
  );
}