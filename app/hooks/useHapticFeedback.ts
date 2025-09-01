import { useHaptic } from '../contexts/HapticContext';

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

// Wrapper hook para mantener compatibilidad con código existente
export const useHapticFeedback = () => {
  return useHaptic();
};