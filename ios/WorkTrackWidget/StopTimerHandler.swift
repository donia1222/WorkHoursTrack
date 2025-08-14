//
//  StopTimerHandler.swift
//  geolocalizacionapp
//
//  Created by Assistant
//

import Foundation
import UserNotifications
import ActivityKit

@available(iOS 16.2, *)
class StopTimerHandler: NSObject, UNUserNotificationCenterDelegate {
    
    static let shared = StopTimerHandler()
    
    override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }
    
    // Manejar cuando el usuario toca la notificación
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                               didReceive response: UNNotificationResponse,
                               withCompletionHandler completionHandler: @escaping () -> Void) {
        
        // Si la notificación tiene el identificador correcto, terminar Live Activities
        if response.notification.request.identifier.contains("stop_timer") ||
           response.notification.request.identifier.contains("timer_stopped") {
            
            Task {
                // Terminar TODAS las Live Activities
                for activity in Activity<WorkTrackWidgetAttributes>.activities {
                    await activity.end(dismissalPolicy: .immediate)
                }
                print("✅ Live Activities terminated via notification")
            }
        }
        
        completionHandler()
    }
}