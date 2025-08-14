#!/bin/bash

# Script to fix App Group ID to be unique
# This will prevent data sharing between different app installations

echo "🔧 Fixing App Group ID to be unique..."

# Generate a unique identifier based on timestamp
UNIQUE_ID=$(date +%s)
NEW_APP_GROUP="group.worktrack.roberto.${UNIQUE_ID}"

echo "📱 New App Group ID: $NEW_APP_GROUP"

# Files to update
FILES=(
    "ios/WorkTrackWidget/MiniCalendarView.swift"
    "ios/WorkTrackWidget/WorkTrackWidget.swift"
    "ios/WorkTrackWidget/SharedDataManager.swift"
    "ios/WorkTrackWidget/WidgetRefreshManager.swift"
    "ios/TestSharedData.swift"
    "ios/geolocalizacionapp/LiveActivityModule.swift"
    "app/services/WidgetSyncService.ts"
)

# Update each file
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✏️ Updating $file"
        sed -i '' 's/group\.com\.tuusuario\.geolocalizacionapp/'"$NEW_APP_GROUP"'/g' "$file"
    fi
done

# Also need to update the entitlements file
ENTITLEMENTS_FILE="ios/geolocalizacionapp/geolocalizacionapp.entitlements"
if [ -f "$ENTITLEMENTS_FILE" ]; then
    echo "✏️ Updating entitlements file"
    sed -i '' 's/group\.com\.tuusuario\.geolocalizacionapp/'"$NEW_APP_GROUP"'/g' "$ENTITLEMENTS_FILE"
fi

# Update widget entitlements
WIDGET_ENTITLEMENTS="ios/WorkTrackWidget/WorkTrackWidget.entitlements"
if [ -f "$WIDGET_ENTITLEMENTS" ]; then
    echo "✏️ Updating widget entitlements"
    sed -i '' 's/group\.com\.tuusuario\.geolocalizacionapp/'"$NEW_APP_GROUP"'/g' "$WIDGET_ENTITLEMENTS"
fi

echo "✅ App Group ID updated to: $NEW_APP_GROUP"
echo "⚠️ IMPORTANT: You need to:"
echo "1. Clean build folder in Xcode (Cmd+Shift+K)"
echo "2. Delete app from device/simulator"
echo "3. Rebuild the app"
echo "4. The widget will now have its own unique data storage"