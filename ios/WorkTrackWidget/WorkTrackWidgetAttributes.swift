//
//  WorkTrackWidgetAttributes.swift
//  WorkTrackWidget
//
//  Created by roberto on 12/8/25.
//

import ActivityKit
import Foundation

public struct WorkTrackWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var elapsedSeconds: Int
        public var isRunning: Bool
        
        public init(elapsedSeconds: Int, isRunning: Bool) {
            self.elapsedSeconds = elapsedSeconds
            self.isRunning = isRunning
        }
    }
    
    public var jobName: String
    public var location: String
    public var startTime: Date
    
    public init(jobName: String, location: String, startTime: Date) {
        self.jobName = jobName
        self.location = location
        self.startTime = startTime
    }
}