//
//  WorkTrackWidgetBundle.swift
//  WorkTrackWidget
//
//  Created by roberto on 12/8/25.
//

import WidgetKit
import SwiftUI

@main
struct WorkTrackWidgetBundle: WidgetBundle {
    var body: some Widget {
        WorkTrackWidget()
        WorkTrackWidgetLiveActivity()
    }
}
