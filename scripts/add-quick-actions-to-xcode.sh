#!/bin/bash

# Script to add QuickActionsModule files to Xcode project

echo "Adding QuickActionsModule to Xcode project..."

# Path to the project file
PROJECT_FILE="/Users/roberto/geolocalizacion-app/ios/geolocalizacionapp.xcodeproj/project.pbxproj"

# Check if files exist
if [ ! -f "/Users/roberto/geolocalizacion-app/ios/geolocalizacionapp/QuickActionsModule.h" ]; then
    echo "Error: QuickActionsModule.h not found"
    exit 1
fi

if [ ! -f "/Users/roberto/geolocalizacion-app/ios/geolocalizacionapp/QuickActionsModule.m" ]; then
    echo "Error: QuickActionsModule.m not found"
    exit 1
fi

echo "Files found. You need to manually add them to Xcode:"
echo "1. Open Xcode"
echo "2. Right-click on 'geolocalizacionapp' group"
echo "3. Select 'Add Files to geolocalizacionapp...'"
echo "4. Select QuickActionsModule.h and QuickActionsModule.m"
echo "5. Make sure 'Copy items if needed' is unchecked"
echo "6. Make sure 'geolocalizacionapp' target is selected"
echo "7. Click 'Add'"

echo ""
echo "After adding the files, rebuild the app:"
echo "cd ios && pod install && cd .."
echo "npx react-native run-ios"