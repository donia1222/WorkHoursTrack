import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function TimerRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir a MapLocation (pantalla principal con el timer) cuando se abre desde el Dynamic Island
    router.replace('/(tabs)');
  }, []);

  return null;
}