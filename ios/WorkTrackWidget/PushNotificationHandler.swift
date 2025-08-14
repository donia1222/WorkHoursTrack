//
//  PushNotificationHandler.swift
//  WorkTrackWidget
//

import Foundation
import ActivityKit
import UserNotifications

@available(iOS 16.2, *)
public class PushNotificationHandler {
    
    public static func handleNotification(_ userInfo: [AnyHashable: Any]) {
        print("🔔 Widget received notification: \(userInfo)")
        
        // Verificar comando
        if let command = userInfo["command"] as? String {
            switch command {
            case "STOP_LIVE_ACTIVITY", "STOP_TIMER":
                print("🛑 Stopping all Live Activities from widget")
                Task {
                    for activity in Activity<WorkTrackWidgetAttributes>.activities {
                        await activity.end(dismissalPolicy: .immediate)
                    }
                }
                
            case "UPDATE_TIMER":
                // Ya no necesitamos actualizar nada
                break
                
            default:
                break
            }
        }
    }
}