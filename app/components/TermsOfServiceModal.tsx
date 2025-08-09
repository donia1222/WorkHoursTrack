import React from 'react';
import { Modal } from 'react-native';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';

interface TermsOfServiceModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function TermsOfServiceModal({ visible, onClose }: TermsOfServiceModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <TermsOfServiceScreen onClose={onClose} />
    </Modal>
  );
}