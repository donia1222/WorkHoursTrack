import Foundation
import ActivityKit

@available(iOS 16.2, *)
class LiveActivityTester {
    static func testLiveActivities() {
        print("========== LIVE ACTIVITY TEST ==========")
        
        // Check current Live Activities
        let activities = Activity<WorkTrackWidgetAttributes>.activities
        print("📊 Current Live Activities count: \(activities.count)")
        
        for (index, activity) in activities.enumerated() {
            print("  Activity \(index + 1):")
            print("    - ID: \(activity.id)")
            print("    - State: \(activity.activityState)")
            print("    - Job: \(activity.attributes.jobName)")
            print("    - Location: \(activity.attributes.location)")
            print("    - Start Time: \(activity.attributes.startTime)")
            print("    - Is Stopped: \(activity.content.state.isStopped)")
        }
        
        // Check authorization status
        let authInfo = ActivityAuthorizationInfo()
        print("\n📱 Live Activities Authorization:")
        print("  - Enabled: \(authInfo.areActivitiesEnabled)")
        print("  - Frequent Updates: \(authInfo.frequentPushesEnabled)")
        
        print("========================================")
    }
    
    static func cleanupAllActivities() async {
        print("🧹 Cleaning up all Live Activities...")
        let activities = Activity<WorkTrackWidgetAttributes>.activities
        for activity in activities {
            await activity.end(dismissalPolicy: .immediate)
        }
        print("✅ Cleanup complete")
    }
}