#!/bin/bash

echo "🔧 Verificando y arreglando App Group configuration..."

# Función para verificar el App Group en el proyecto
check_app_group() {
    echo "📱 Verificando App Group ID en archivos..."
    
    # Buscar todas las referencias al App Group
    echo "Buscando referencias a group.com.roberto.worktrack:"
    grep -r "group.com.roberto.worktrack" . --include="*.swift" --include="*.m" --include="*.mm" 2>/dev/null | head -5
    
    echo ""
    echo "Buscando referencias al App Group antiguo:"
    grep -r "group.com.tuusuario.geolocalizacionapp" . --include="*.swift" --include="*.m" --include="*.mm" 2>/dev/null | head -5
}

# Limpiar completamente los datos compartidos
clean_shared_data() {
    echo "🧹 Limpiando datos compartidos..."
    
    # Eliminar directorios de App Groups del simulador
    find ~/Library/Developer/CoreSimulator/Devices -name "group.com.*" -type d -exec rm -rf {} + 2>/dev/null
    
    # Eliminar datos del dispositivo
    if [ -d ~/Library/Containers ]; then
        find ~/Library/Containers -name "group.com.*" -type d -exec rm -rf {} + 2>/dev/null
    fi
}

# Verificar entitlements
check_entitlements() {
    echo "🔐 Verificando entitlements..."
    
    echo "App principal:"
    if [ -f "geolocalizacionapp/geolocalizacionapp.entitlements" ]; then
        grep -A2 "application-groups" geolocalizacionapp/geolocalizacionapp.entitlements
    fi
    
    echo ""
    echo "Widget Extension:"
    if [ -f "WorkTrackWidgetExtension.entitlements" ]; then
        grep -A2 "application-groups" WorkTrackWidgetExtension.entitlements
    fi
}

# Verificar proyecto Xcode
check_xcode_project() {
    echo "📂 Verificando configuración en Xcode project..."
    
    # Buscar en pbxproj
    if [ -f "geolocalizacionapp.xcodeproj/project.pbxproj" ]; then
        echo "Buscando App Group en project.pbxproj:"
        grep "group.com" geolocalizacionapp.xcodeproj/project.pbxproj | head -5
    fi
}

# Ejecutar todas las verificaciones
echo "========================================="
check_app_group
echo "========================================="
check_entitlements
echo "========================================="
check_xcode_project
echo "========================================="
clean_shared_data
echo "========================================="

echo ""
echo "✅ Verificación completa"
echo ""
echo "⚠️ IMPORTANTE - Pasos manuales en Xcode:"
echo "1. Abre Xcode"
echo "2. Selecciona el target 'geolocalizacionapp'"
echo "3. Ve a 'Signing & Capabilities'"
echo "4. En 'App Groups', verifica que esté: group.com.roberto.worktrack"
echo "5. Repite para el target 'WorkTrackWidgetExtension'"
echo "6. Clean Build Folder (Shift+Cmd+K)"
echo "7. Build and Run (Cmd+R)"
echo ""
echo "Si el App Group no aparece:"
echo "1. Click en '+' en Capabilities"
echo "2. Añade 'App Groups'"
echo "3. Click en '+' dentro de App Groups"
echo "4. Añade: group.com.roberto.worktrack"