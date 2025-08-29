/**
 * Utilidades para cálculos geográficos con márgenes de precisión
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calcular distancia entre dos coordenadas usando fórmula Haversine
 * @param a Primera coordenada
 * @param b Segunda coordenada
 * @returns Distancia en metros
 */
export function metersHaversine(a: Coordinates, b: Coordinates): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = a.lat * Math.PI / 180;
  const φ2 = b.lat * Math.PI / 180;
  const dφ = (b.lat - a.lat) * Math.PI / 180;
  const dλ = (b.lng - a.lng) * Math.PI / 180;

  const t = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(t), Math.sqrt(1 - t));
}

/**
 * Determinar si está fuera del radio con margen de precisión y histéresis
 * @param dist Distancia actual en metros
 * @param radius Radio del geofence en metros
 * @param accuracy Precisión del GPS en metros
 * @returns true si está claramente fuera
 */
export function outsideWithMargin(dist: number, radius: number, accuracy: number | undefined): boolean {
  // Limitar accuracy entre 15-100m para evitar valores extremos
  const acc = Math.min(Math.max(accuracy ?? 50, 15), 100);
  // Histéresis ajustado: +25 si precisión media es mala
  const hysteresis = acc > 50 ? 25 : 15;
  
  // Debe estar fuera por más que el margen de error + histéresis
  return dist - acc > radius + hysteresis;
}

/**
 * Determinar si está dentro del radio con margen de precisión y histéresis
 * @param dist Distancia actual en metros
 * @param radius Radio del geofence en metros
 * @param accuracy Precisión del GPS en metros
 * @returns true si está claramente dentro
 */
export function insideWithMargin(dist: number, radius: number, accuracy: number | undefined): boolean {
  // Limitar accuracy entre 15-100m
  const acc = Math.min(Math.max(accuracy ?? 50, 15), 100);
  // Histéresis para evitar ping-pong
  const hysteresis = 15;
  
  // Debe estar dentro por más que el margen de error + histéresis
  return dist + acc < radius - hysteresis;
}

/**
 * Verificar si la precisión del GPS es suficiente para tomar decisiones
 * @param accuracy Precisión actual del GPS
 * @param radius Radio del geofence
 * @returns true si la precisión es aceptable
 */
export function isAccuracyAcceptable(accuracy: number | undefined, radius: number): boolean {
  const acc = accuracy ?? 999;
  const maxAcceptable = Math.max(200, radius * 2); // Máximo 2x el radio o 200m
  return acc <= maxAcceptable;
}

/**
 * Verificar si necesita ubicación precisa para radio pequeño
 * @param radius Radio configurado del geofence
 * @param accuracy Precisión actual
 * @returns objeto con recomendación
 */
export function checkPreciseLocationNeeded(radius: number, accuracy: number | undefined): {
  needsPrecise: boolean;
  message: string;
} {
  const acc = accuracy ?? 100;
  
  // Si radio < 80m y precisión > 65m, recomendar ubicación precisa
  if (radius < 80 && acc > 65) {
    return {
      needsPrecise: true,
      message: `Radio ${radius}m requiere ubicación precisa (actual: ${Math.round(acc)}m). Actívala en Ajustes > Privacidad > Ubicación > VixTime > Ubicación precisa.`
    };
  }
  
  return {
    needsPrecise: false,
    message: 'Precisión suficiente'
  };
}