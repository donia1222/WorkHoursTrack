# Widget Synchronization Implementation

## Overview
This document describes the implementation of real-time synchronization between the WorkTrack home screen widget and the main app's timer data.

## Problem Solved
- Home screen widget was showing placeholder/old data (16:11) while Live Activity showed correct time (16:37)
- Widget didn't update when a new timer started
- Widget showed placeholder data when app was closed instead of real timer state

## Solution Architecture

### 1. App Groups Configuration
- **App Group ID**: `group.com.tuusuario.geolocalizacionapp`
- **Configured in**:
  - Main app entitlements: `geolocalizacionapp.entitlements`
  - Widget entitlements: `WorkTrackWidgetExtension.entitlements`

### 2. Shared Data Manager (`SharedDataManager.swift`)
Created a centralized manager for handling data synchronization:

**Features**:
- Encodes/decodes timer data to/from JSON
- Saves to shared UserDefaults container
- Triggers widget timeline reloads automatically
- Handles stale data detection (>24 hours old)

**Data Structure**:
```swift
struct TimerData: Codable {
    let isActive: Bool
    let jobName: String
    let location: String?
    let startTime: Date?
    let lastUpdated: Date
}
```

### 3. LiveActivityModule Updates
Modified to write timer data to shared storage whenever:
- Timer starts (new or reused activity)
- Timer stops
- All activities are ended

**Key Methods Added**:
- `saveTimerDataToSharedContainer()` - Saves active timer state
- `clearTimerDataFromSharedContainer()` - Saves inactive state

**Integration Points**:
- `createNewLiveActivity()` - Saves data when new timer starts
- `endLiveActivity()` - Clears data when timer stops
- `endAllActivities()` - Clears data when all activities end
- Reusing existing activity - Saves data when reusing for same job

### 4. Widget Updates (`WorkTrackWidget.swift`)
Modified the widget provider to read from shared storage:

**Provider Changes**:
- `readTimerData()` - Reads current timer state from shared UserDefaults
- `placeholder()` - Shows real data or "No hay timer activo"
- `getSnapshot()` - Uses real timer data for widget gallery
- `getTimeline()` - Creates appropriate timeline based on active/inactive state

**UI Updates**:
- `TimerBlock` - Now handles both active and inactive states
- Shows "Timer inactivo" and "--:--" when no timer is active
- Properly displays start time when timer is running

**Timeline Refresh Policy**:
- Active timer: Refresh every 1 minute
- Inactive state: Refresh every 5 minutes

### 5. Automatic Widget Updates
Implemented `WidgetCenter.shared.reloadAllTimelines()` calls at key moments:
- When timer starts
- When timer stops
- When timer data changes

## Data Flow

1. **Timer Starts**:
   - User starts timer in app
   - LiveActivityModule creates/updates Live Activity
   - Saves timer data to shared UserDefaults
   - Triggers widget timeline reload
   - Widget reads new data and updates display

2. **Timer Stops**:
   - User stops timer in app
   - LiveActivityModule ends Live Activity
   - Clears timer data (sets to inactive state)
   - Triggers widget timeline reload
   - Widget shows "Timer inactivo"

3. **App Closed**:
   - Widget continues to read from shared UserDefaults
   - Shows last known state (active or inactive)
   - No placeholder data - always shows real state

## Files Modified

### New Files:
- `/ios/WorkTrackWidget/SharedDataManager.swift` - Shared data management
- `/ios/TestSharedData.swift` - Test script for verification
- `/ios/WIDGET_SYNC_IMPLEMENTATION.md` - This documentation

### Modified Files:
- `/ios/geolocalizacionapp/LiveActivityModule.swift` - Added shared data saves
- `/ios/WorkTrackWidget/WorkTrackWidget.swift` - Read from shared storage

## Testing

To verify the implementation:

1. **Start a timer in the app**:
   - Check that widget updates to show active timer
   - Verify job name and start time match

2. **Stop the timer**:
   - Check that widget updates to show "Timer inactivo"
   - Verify "--:--" is displayed

3. **Close the app completely**:
   - Widget should maintain last state
   - No placeholder data should appear

4. **Run test script**:
   ```bash
   cd /Users/roberto/geolocalizacion-app/ios
   swift TestSharedData.swift
   ```

## Benefits

1. **Real-time Sync**: Widget always shows current timer state
2. **Persistent State**: Works even when app is closed
3. **No Placeholder Data**: Always shows meaningful information
4. **Automatic Updates**: Widget refreshes automatically when timer changes
5. **Consistent UX**: Widget and Live Activity show same data

## Future Enhancements

1. Add elapsed time calculation in widget
2. Show more timer details (earnings, duration)
3. Add widget actions (stop timer from widget)
4. Implement different widget configurations
5. Add complication support for Apple Watch

## Troubleshooting

If widget doesn't update:
1. Verify App Groups are configured correctly in both targets
2. Check that both targets use same App Group ID
3. Ensure WidgetCenter.reloadAllTimelines() is being called
4. Check Xcode console for error messages
5. Try removing and re-adding the widget

## Notes

- Widget updates may have slight delay (iOS manages update frequency)
- Timeline refresh intervals can be adjusted for battery optimization
- Shared UserDefaults has 4MB storage limit (more than sufficient for timer data)