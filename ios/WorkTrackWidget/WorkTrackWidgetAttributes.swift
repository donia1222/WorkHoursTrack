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
        public var isStopped: Bool
        
        public init(isStopped: Bool = false) {
            self.isStopped = isStopped
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