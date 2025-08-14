#!/bin/bash

echo "🧹 Limpiando completamente el proyecto..."

# Limpiar directorios de build
echo "📦 Limpiando build directories..."
rm -rf ios/build
rm -rf ios/Pods
rm -rf node_modules/.cache

# Limpiar DerivedData de Xcode
echo "🗑️ Limpiando Xcode DerivedData..."
rm -rf ~/Library/Developer/Xcode/DerivedData/geolocalizacion*

# Limpiar caché del simulador
echo "📱 Limpiando caché del simulador..."
xcrun simctl shutdown all
xcrun simctl erase all

# Reinstalar pods
echo "🔄 Reinstalando CocoaPods..."
cd ios
pod deintegrate
pod cache clean --all
pod install
cd ..

echo "✅ Limpieza completa. Ahora ejecuta:"
echo "npx expo run:ios --clear"
echo ""
echo "⚠️ IMPORTANTE: Después de compilar:"
echo "1. Elimina el widget antiguo de la pantalla de inicio"
echo "2. Reinicia el teléfono/simulador"
echo "3. Añade el widget nuevo"
echo ""
echo "El nuevo App Group ID es: group.com.roberto.worktrack"