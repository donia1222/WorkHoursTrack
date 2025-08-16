// Google Places API Configuration
// Para obtener tu API Key:
// 1. Ve a https://console.cloud.google.com/
// 2. Crea un nuevo proyecto o selecciona uno existente
// 3. Habilita la API de Places (Places API)
// 4. Crea credenciales (API Key)
// 5. Restringe la API Key a tu app (opcional pero recomendado)
// 6. Copia la API Key aquí

export const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

// Límites del plan gratuito de Google Places:
// - Autocomplete: $2.83 por 1000 solicitudes (después de los primeros $200 gratis/mes)
// - Place Details: $17 por 1000 solicitudes (después de los primeros $200 gratis/mes)
// - Total gratuito mensual: $200 (aproximadamente 70,000 solicitudes de autocomplete)

// Para desarrollo, puedes usar una key temporal
// IMPORTANTE: No subas tu API key real a repositorios públicos
export const isDevelopment = __DEV__;

// Configuración adicional
export const GOOGLE_PLACES_CONFIG = {
  // Países soportados para búsqueda
  countries: ['es', 'de', 'fr', 'it', 'gb', 'us'],
  
  // Tipo de búsqueda
  types: '(regions)',
  
  // Radio de búsqueda en metros (opcional)
  radius: 50000,
  
  // Sesión token para agrupar solicitudes (reduce costos)
  sessionToken: true,
};