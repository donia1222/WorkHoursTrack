# Fix: Mostrar Múltiples Suscripciones en iOS

## 🔴 Problema

En la app publicada solo aparecía **1 suscripción** (la de 1 mes), aunque en TestFlight y desarrollo se veían las 3 suscripciones correctamente:
- ✅ 1 Mes (12981)
- ❌ 6 Meses (06mes) - NO aparecía en producción
- ❌ 1 Año (year) - NO aparecía en producción

RevenueCat cargaba correctamente los 3 productos, pero el código no los mostraba.

## 🐛 Causa del problema

El código usaba `globalIndex` (posición en el array) para identificar qué producto era cada uno:

```javascript
// ❌ CÓDIGO INCORRECTO
if (globalIndex === 0) {
  duration = '1 Mes';
} else if (globalIndex === 1) {
  duration = '6 Meses';
} else if (globalIndex === 2) {
  duration = '1 Año';
}
```

**Problema:** Si los productos cambiaban de orden (por precio, disponibilidad, etc.), se asignaban duraciones incorrectas.

## ✅ Solución

Identificar cada producto por su `packageType` o `product.identifier` en lugar de su posición:

### Paso 1: Localizar el código que renderiza las suscripciones

Busca en tu archivo de suscripciones (ej: `Suscribe.js`) la sección que mapea los paquetes:

```javascript
Object.entries(allOfferings)
  .map(([offeringKey, offering], offeringIndex) =>
    offering.availablePackages.map((pkg, packageIndex) => {
      // AQUÍ está el código a modificar
    })
  )
```

### Paso 2: Reemplazar la lógica basada en índice

**ANTES (❌ Incorrecto):**
```javascript
// Asignar propiedades basándose en el índice global (0, 1, 2)
if (globalIndex === 0) {
  // Primera carta - 1 Mes
  iconColor = "#10b981";
  duration = systemLanguage === 'es' ? '1 Mes' : '1 Month';
  badgeText = systemLanguage === 'es' ? 'Básico' : 'Basic';
} else if (globalIndex === 1) {
  // Segunda carta - 6 Meses
  iconColor = "#10b981";
  duration = systemLanguage === 'es' ? '6 Meses' : '6 Months';
  badgeText = systemLanguage === 'es' ? 'Básico' : 'Basic';
} else if (globalIndex === 2) {
  // Tercera carta - 1 Año (Best Value)
  iconColor = "#ef7744ff";
  duration = systemLanguage === 'es' ? '1 Año' : '1 Year';
  isBestOption = true;
  cardStyle = styles.packageCardBest;
  badgeText = systemLanguage === 'es' ? 'Mejor Valor' : 'Best Value';
}
```

**DESPUÉS (✅ Correcto):**
```javascript
// Identificar el producto por su packageType o identifier
if (pkg.packageType === 'MONTHLY' || pkg.product.identifier === '12981') {
  // 1 Mes
  iconColor = "#10b981";
  duration = systemLanguage === 'es' ? '1 Mes' : '1 Month';
  badgeText = systemLanguage === 'es' ? 'Básico' : 'Basic';
  periodText = systemLanguage === 'es' ? '/mes' : '/month';
} else if (pkg.packageType === 'SIX_MONTH' || pkg.product.identifier === '06mes') {
  // 6 Meses
  iconColor = "#6366f1";
  duration = systemLanguage === 'es' ? '6 Meses' : '6 Months';
  badgeText = systemLanguage === 'es' ? 'Popular' : 'Popular';
  periodText = systemLanguage === 'es' ? '/6 meses' : '/6 months';
} else if (pkg.packageType === 'ANNUAL' || pkg.product.identifier === 'year') {
  // 1 Año (Best Value)
  iconColor = "#ef7744ff";
  duration = systemLanguage === 'es' ? '1 Año' : '1 Year';
  isBestOption = true;
  cardStyle = styles.packageCardBest;
  badgeText = systemLanguage === 'es' ? 'Mejor Valor' : 'Best Value';
  periodText = systemLanguage === 'es' ? '/año' : '/year';
} else {
  // Fallback para productos no identificados
  duration = systemLanguage === 'es' ? '1 Mes' : '1 Month';
  badgeText = systemLanguage === 'es' ? 'Básico' : 'Basic';
  periodText = systemLanguage === 'es' ? '/mes' : '/month';
}
```

### Paso 3: Actualizar el texto del período

**ANTES (❌ Incorrecto):**
```javascript
<Text style={styles.packagePricePerMonth}>
  {globalIndex === 0 && (systemLanguage === 'es' ? '/mes' : '/month')}
  {globalIndex === 1 && (systemLanguage === 'es' ? '/6 meses' : '/6 months')}
  {globalIndex === 2 && (systemLanguage === 'es' ? '/año' : '/year')}
  {globalIndex > 2 && (systemLanguage === 'es' ? '/mes' : '/month')}
</Text>
```

**DESPUÉS (✅ Correcto):**
```javascript
<Text style={styles.packagePricePerMonth}>
  {periodText}
</Text>
```

### Paso 4: Añadir logs para debugging

Agrega logs para diagnosticar qué productos se están cargando:

```javascript
console.log('🔍 Producto:', pkg.product.identifier, 'PackageType:', pkg.packageType);
console.log('🏷️ Asignado:', duration, 'para', pkg.product.identifier);
```

## 📋 Checklist para aplicar en otra app

- [ ] 1. Identificar el archivo de suscripciones (ej: `Suscribe.js`, `Subscriptions.js`)
- [ ] 2. Buscar el código que mapea `availablePackages`
- [ ] 3. Localizar la lógica que usa `globalIndex`, `index`, o `packageIndex`
- [ ] 4. Reemplazar la lógica basada en índice por `packageType` o `product.identifier`
- [ ] 5. Actualizar los textos de duración para usar variables en lugar de índices
- [ ] 6. Agregar logs de debugging
- [ ] 7. Probar localmente que aparecen todas las suscripciones
- [ ] 8. Publicar OTA update

## 🚀 Publicar el fix

Como es solo cambio de JavaScript (no nativo), puedes publicar con OTA:

```bash
# Producción
eas update --branch production --message "Fix: mostrar todas las suscripciones"

# O el branch que uses
eas update --branch <tu-branch> --message "Fix suscripciones"
```

## ✅ Verificación

Después del update, deberías ver:
- 🟢 1 Mes (verde) - "Básico"
- 🔵 6 Meses (azul) - "Popular"
- 🟠 1 Año (naranja) - "Mejor Valor"

## 📝 Notas importantes

1. **packageType vs identifier:**
   - Usa `packageType` si RevenueCat lo proporciona (más estable)
   - Usa `product.identifier` como fallback
   - Usa ambos con `||` para máxima compatibilidad

2. **packageTypes comunes:**
   - `MONTHLY` - Suscripción mensual
   - `SIX_MONTH` - Suscripción de 6 meses
   - `ANNUAL` - Suscripción anual
   - `TWO_MONTH`, `THREE_MONTH`, etc. - Otros períodos

3. **App Store Connect:**
   - Verifica que todos los productos estén **aprobados** en App Store Connect
   - Estado debe ser "Ready to Submit" o "Approved"
   - Pueden tardar 24-48h en estar disponibles en producción después de aprobarlos

4. **Testing:**
   - TestFlight: Usa productos sandbox
   - Producción: Usa productos de producción
   - Si funciona en TestFlight pero no en producción → Verificar App Store Connect

## 🔍 Debugging adicional

Si después del fix siguen sin aparecer, agrega este código al inicio del `useEffect`:

```javascript
useEffect(() => {
  const initializePurchases = async () => {
    try {
      const response = await Purchases.getOfferings();

      // Log completo de todas las offerings
      console.log('📦 Total Offerings:', Object.keys(response.all).length);

      // Log de cada producto
      Object.entries(response.all).forEach(([key, offering]) => {
        console.log(`\n🔸 Offering: ${key}`);
        offering.availablePackages.forEach(pkg => {
          console.log(`  - ID: ${pkg.product.identifier}`);
          console.log(`  - Type: ${pkg.packageType}`);
          console.log(`  - Price: ${pkg.product.priceString}`);
        });
      });

      setAllOfferings(response.all);
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };

  initializePurchases();
}, []);
```

---

**Fecha:** 2025-10-08
**Problema:** Solo aparecía 1 suscripción en producción
**Solución:** Identificar productos por `packageType`/`identifier` en lugar de índice del array
**Resultado:** ✅ Las 3 suscripciones aparecen correctamente
