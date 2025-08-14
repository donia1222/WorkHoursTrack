#!/bin/bash

echo "🧹 Limpiando COMPLETAMENTE todos los datos del widget..."

# Función para limpiar datos compartidos
clear_shared_data() {
    echo "📱 Limpiando datos compartidos del App Group..."
    
    # Script Swift para limpiar UserDefaults del App Group
    swift - <<EOF
import Foundation

let appGroupID = "group.com.roberto.worktrack"
if let sharedDefaults = UserDefaults(suiteName: appGroupID) {
    // Eliminar TODAS las claves
    let keys = sharedDefaults.dictionaryRepresentation().keys
    for key in keys {
        sharedDefaults.removeObject(forKey: key)
    }
    sharedDefaults.synchronize()
    print("✅ Eliminadas \(keys.count) claves del App Group")
    
    // Forzar sincronización con disco
    CFPreferencesAppSynchronize(appGroupID as CFString)
    CFPreferencesSynchronize(appGroupID as CFString, kCFPreferencesCurrentUser, kCFPreferencesCurrentHost)
} else {
    print("❌ No se pudo acceder al App Group")
}
EOF
}

# Limpiar datos del simulador
echo "🗑️ Limpiando datos del simulador..."
xcrun simctl shutdown all

# Limpiar datos compartidos
clear_shared_data

# Eliminar archivos de cache del widget
echo "🗃️ Eliminando archivos de cache..."
find ~/Library/Developer/CoreSimulator/Devices -name "group.com.roberto.worktrack" -type d -exec rm -rf {} + 2>/dev/null
find ~/Library/Developer/CoreSimulator/Devices -name "group.com.tuusuario.geolocalizacionapp" -type d -exec rm -rf {} + 2>/dev/null

# Limpiar DerivedData
echo "🗑️ Limpiando DerivedData..."
rm -rf ~/Library/Developer/Xcode/DerivedData/geolocalizacion*

# Si estás en un dispositivo físico, también limpiar ahí
if [ -d ~/Library/Containers ]; then
    echo "📲 Limpiando datos del dispositivo físico..."
    find ~/Library/Containers -name "group.com.roberto.worktrack" -type d -exec rm -rf {} + 2>/dev/null
    find ~/Library/Containers -name "group.com.tuusuario.geolocalizacionapp" -type d -exec rm -rf {} + 2>/dev/null
fi

echo ""
echo "✅ Limpieza completa. Ahora:"
echo "1. Abre Xcode"
echo "2. Clean Build Folder (Shift+Cmd+K)"
echo "3. Build and Run (Cmd+R)"
echo ""
echo "⚠️ IMPORTANTE: El widget mostrará datos mock hasta que la app sincronice datos reales"