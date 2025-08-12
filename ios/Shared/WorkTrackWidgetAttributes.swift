//
//  WorkTrackWidgetAttributes.swift
//  Shared between App and Widget
//
//  Created by roberto on 12/8/25.
//

import ActivityKit
import Foundation

// Estructura de datos compartida para el Live Activity
public struct WorkTrackWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Tiempo transcurrido en segundos
        public var elapsedSeconds: Int
        // Si el timer está activo o pausado
        public var isRunning: Bool
        
        public init(elapsedSeconds: Int, isRunning: Bool) {
            self.elapsedSeconds = elapsedSeconds
            self.isRunning = isRunning
        }
    }
    
    // Información estática del trabajo
    public var jobName: String
    public var location: String
    public var startTime: Date
    
    public init(jobName: String, location: String, startTime: Date) {
        self.jobName = jobName
        self.location = location
        self.startTime = startTime
    }
}