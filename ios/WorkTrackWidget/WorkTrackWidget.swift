//
//  WorkTrackWidget.swift
//  WorkTrackWidget
//

import WidgetKit
import SwiftUI

// MARK: - Modelo
struct JobInfo: Hashable {
    let name: String
    let location: String?
    let color: String?
}

struct WorktrackEntry: TimelineEntry {
    let date: Date
    let startDate: Date
    let title: String
    let location: String?
    let jobs: [JobInfo]
    
}

// MARK: - Provider
struct Provider: TimelineProvider {
    // App Group for reading shared data
    private let appGroupIdentifier = "group.com.roberto.worktrack"
    private let timerDataKey = "WorkTrack.TimerData"
    private let jobsDataKey = "WorkTrack.JobsData"
    private let dataVersionKey = "WorkTrack.DataVersion"
    
    // Force refresh by invalidating cache
    private func invalidateCache() {
        // Simple synchronization without CFPreferences
        UserDefaults.standard.synchronize()
    }
    
    private func readJobsData() -> [JobInfo] {
        // Force cache invalidation
        invalidateCache()
        
        guard let sharedDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
            print("❌ Widget: Could not access UserDefaults for App Group: \(appGroupIdentifier)")
            return []
        }
        
        // Debug: Print all keys in shared defaults
        let allKeys = sharedDefaults.dictionaryRepresentation().keys
        print("📱 Widget: All keys in shared storage: \(allKeys)")
        
        guard let jobsData = sharedDefaults.array(forKey: jobsDataKey) as? [[String: Any]] else {
            print("⚠️ Widget: No jobs data found for key: \(jobsDataKey)")
            // Return empty array if no jobs configured
            return []
        }
        
        print("✅ Widget: Found \(jobsData.count) jobs in shared storage")
        
        let jobs = jobsData.compactMap { jobDict -> JobInfo? in
            guard let name = jobDict["name"] as? String else {
                print("⚠️ Widget: Job without name: \(jobDict)")
                return nil
            }
            let location = jobDict["location"] as? String
            let color = jobDict["color"] as? String
            print("📋 Widget: Job loaded - Name: \(name), Location: \(location ?? "none")")
            return JobInfo(name: name, location: location, color: color)
        }
        
        print("✅ Widget: Returning \(jobs.count) valid jobs")
        // Return actual jobs or empty array
        return jobs
    }
    
    func readTimerData() -> (isActive: Bool, jobName: String, location: String?, startTime: Date) {
        // Force cache invalidation
        invalidateCache()
        
        guard let sharedDefaults = UserDefaults(suiteName: appGroupIdentifier),
              let timerData = sharedDefaults.dictionary(forKey: timerDataKey) else {
            // Return inactive state if no data
            return (false, "WorkTrack", nil, Date())
        }
        
        let isActive = timerData["isActive"] as? Bool ?? false
        let jobName = timerData["jobName"] as? String ?? "WorkTrack"
        let location = timerData["location"] as? String
        let startTimeInterval = timerData["startTime"] as? TimeInterval ?? Date().timeIntervalSince1970
        let startTime = Date(timeIntervalSince1970: startTimeInterval)
        
        return (isActive, jobName, location, startTime)
    }
    
    func placeholder(in context: Context) -> WorktrackEntry {
        let timerData = readTimerData()
        let jobs = readJobsData()
        if timerData.isActive {
            return WorktrackEntry(date: .now,
                                 startDate: timerData.startTime,
                                 title: timerData.jobName,
                                 location: timerData.location,
                                 jobs: jobs)
        } else {
            return WorktrackEntry(date: .now,
                                 startDate: Date(),
                                 title: "No active timer",
                                 location: nil,
                                 jobs: jobs)
        }
    }

    func getSnapshot(in context: Context, completion: @escaping (WorktrackEntry) -> Void) {
        let timerData = readTimerData()
        let jobs = readJobsData()
        if timerData.isActive {
            completion(WorktrackEntry(date: .now,
                                     startDate: timerData.startTime,
                                     title: timerData.jobName,
                                     location: timerData.location,
                                     jobs: jobs))
        } else {
            completion(WorktrackEntry(date: .now,
                                     startDate: Date(),
                                     title: "No active timer",
                                     location: nil,
                                     jobs: jobs))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WorktrackEntry>) -> Void) {
        // Force fresh data read
        invalidateCache()
        
        let timerData = readTimerData()
        let jobs = readJobsData()
        var entries: [WorktrackEntry] = []
        let current = Date()
        
        // Create a single entry with current state
        entries.append(WorktrackEntry(date: current,
                                     startDate: timerData.isActive ? timerData.startTime : Date(),
                                     title: timerData.isActive ? timerData.jobName : "No active timer",
                                     location: timerData.isActive ? timerData.location : nil,
                                     jobs: jobs))
        
        // When timer is active, refresh every 5 minutes to check if still active
        // When inactive, refresh every 2 minutes to detect when timer starts
        let refreshMinutes = timerData.isActive ? 5 : 2
        let refreshDate = Calendar.current.date(byAdding: .minute, value: refreshMinutes, to: current)!
        
        completion(Timeline(entries: entries, policy: .after(refreshDate)))
    }
}

// MARK: - Subvistas
struct CardBackground: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 16, style: .continuous)
            .fill(
                LinearGradient(
                    colors: [
                        Color(red: 0.65, green: 0.75, blue: 0.95),  // Light blue
                        Color(red: 0.85, green: 0.90, blue: 0.98)   // Very light blue
                    ],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(Color.white.opacity(0.3), lineWidth: 1)
            )
    }
}

struct HeaderView: View {
    let title: String
    var body: some View {
        HStack(spacing: 10) {
            if let ui = UIImage(named: "worktrack_icon") {
                Image(uiImage: ui)
                    .resizable().scaledToFit()
                    .frame(width: 22, height: 22)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.white.opacity(0.2), lineWidth: 0.5))
            } else {
                Image(systemName: "briefcase.fill").imageScale(.medium)
            }
            Text(title).font(.system(size: 14, weight: .semibold, design: .rounded)).lineLimit(1)
            Spacer()
        }
        .foregroundColor(.white.opacity(0.95))
    }
}

struct TimerBlock: View {
    let startDate: Date
    let isActive: Bool
    
    var formattedTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: startDate)
    }
    
    var body: some View {
        if isActive {
            VStack(alignment: .leading, spacing: 2) {
                Text("Started at")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.7))
                Text(formattedTime)
                    .font(.system(size: 28, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
            }
        } else {
            VStack(alignment: .leading, spacing: 2) {
                Text("No active timer")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.7))
                Text("--:--")
                    .font(.system(size: 28, weight: .bold, design: .monospaced))
                    .foregroundColor(.white.opacity(0.5))
            }
        }
    }
}

struct LocationRow: View {
    let location: String?
    var body: some View {
        if let loc = location, !loc.isEmpty {
            HStack(spacing: 6) {
                Image(systemName: "mappin.and.ellipse").imageScale(.small)
                Text(loc).font(.system(size: 12, weight: .medium, design: .rounded)).lineLimit(1)
                Spacer()
            }
            .foregroundColor(.white.opacity(0.85))
        }
    }
}

struct BackgroundMod: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 17.0, *) {
            content.containerBackground(
                LinearGradient(
                    colors: [
                        Color(red: 0.65, green: 0.75, blue: 0.95),  // Light blue
                        Color(red: 0.85, green: 0.90, blue: 0.98)   // Very light blue
                    ],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                ),
                for: .widget
            )
        } else {
            ZStack { CardBackground(); content }
        }
    }
}

struct WorkTrackSmall: View {
    let entry: WorktrackEntry
    
    private var timerData: (isActive: Bool, jobName: String, location: String?, startTime: Date) {
        Provider().readTimerData()
    }
    
    var body: some View {
        let timer = timerData
        
        VStack(spacing: 6) {
            // App name header - colorful title without icon
            HStack {
                HStack(spacing: 0) {
                    Text("Vix")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundColor(Color(red: 0.2, green: 0.5, blue: 1.0))  // Blue
                    Text("Time")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundColor(Color(red: 0.6, green: 0.4, blue: 0.9))  // Purple
                }
                .padding(.leading, 25)  // Move VixTime more to the right
                Spacer()
            }
            
            // Show timer if active, otherwise show job and calendar
            if timer.isActive {
                Spacer(minLength: 2)
                CompactTimerView(
                    jobName: timer.jobName,
                    startTime: timer.startTime
                )
                Spacer(minLength: 2)
            } else {
                // Show first job if exists - aligned to left
                if let firstJob = entry.jobs.first {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color(hex: firstJob.color ?? "#059669") ?? Color.blue)
                            .frame(width: 8, height: 8)
                        Text(firstJob.name)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(Color(red: 0.2, green: 0.3, blue: 0.5))
                            .lineLimit(1)
                        Spacer()
                    }
                    .padding(.trailing, 8)  // Add right margin to prevent cutoff
                }
                
                Spacer(minLength: 0)
                
                // Mini Calendar - Show last 3 days
                MiniCalendarView(
                    days: MiniCalendarDataManager.readCalendarData(),
                    isCompact: true,
                    daysCount: 3
                )
            }
        }
        .padding(8)
        .widgetURL(URL(string: "worktrack://"))
        .modifier(BackgroundMod())
    }
}

struct WorkTrackMedium: View {
    let entry: WorktrackEntry
    
    private var timerData: (isActive: Bool, jobName: String, location: String?, startTime: Date) {
        Provider().readTimerData()
    }
    
    var body: some View {
        let timer = timerData
        
        VStack(spacing: 10) {
            // Header with colorful VixTime
            HStack(alignment: .center) {
                HStack(spacing: 0) {
                    Text("Vix")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundColor(Color(red: 0.2, green: 0.5, blue: 1.0))  // Blue
                    Text("Time")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundColor(Color(red: 0.6, green: 0.4, blue: 0.9))  // Purple
                }
                .padding(.leading, 25)  // Move VixTime more to the right
                
                Spacer()
                
                // Show jobs (up to 2)
                if !entry.jobs.isEmpty {
                    HStack(spacing: 8) {
                        ForEach(entry.jobs.prefix(2), id: \.name) { job in
                            HStack(spacing: 3) {
                                Circle()
                                    .fill(Color(hex: job.color ?? "#059669") ?? Color.blue)
                                    .frame(width: 8, height: 8)
                                Text(job.name)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(Color(red: 0.2, green: 0.3, blue: 0.5))
                                    .lineLimit(1)
                            }
                        }
                    }
                    .padding(.trailing, 20)  // Add right margin to prevent title cutoff
                }
            }
            
            // Timer status if active
            if timer.isActive {
                HStack(spacing: 8) {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.white)
                            .frame(width: 8, height: 8)
                        Text("Active")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(
                        Capsule()
                            .fill(Color.green.opacity(0.15))
                            .overlay(
                                Capsule()
                                    .strokeBorder(Color.green.opacity(0.3), lineWidth: 1)
                            )
                    )
                    
                    Spacer()
                    
                    if timer.isActive {
                        Text("Since \(timer.startTime, style: .time)")
                            .font(.system(size: 11, weight: .medium, design: .monospaced))
                            .foregroundColor(Color(red: 0.2, green: 0.3, blue: 0.5))
                    }
                }
            }
            
            Spacer(minLength: 4)
            
            // Compact Calendar
            MiniCalendarView(
                days: MiniCalendarDataManager.readCalendarData(),
                isCompact: true,
                daysCount: 7,
                useModernStyle: false
            )
            
            Spacer(minLength: 2)
        }
        .padding(10)
        .widgetURL(URL(string: "worktrack://"))
        .modifier(BackgroundMod())
    }
}

// MARK: - Medium Widget Components
struct TimerStatusMedium: View {
    let jobName: String
    let startTime: Date
    
    var body: some View {
        HStack(spacing: 8) {
            // Animated green dot
            Circle()
                .fill(
                    RadialGradient(
                        colors: [Color.green, Color.green.opacity(0.7)],
                        center: .center,
                        startRadius: 1,
                        endRadius: 8
                    )
                )
                .frame(width: 12, height: 12)
                .overlay(
                    Circle()
                        .stroke(Color.white.opacity(0.5), lineWidth: 1)
                )
                .shadow(color: Color.green.opacity(0.6), radius: 3, x: 0, y: 1)
            
            VStack(alignment: .leading, spacing: 1) {
                Text(jobName)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                Text(startTime, style: .time)
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(.white.opacity(0.8))
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            Capsule()
                .fill(Color.white.opacity(0.15))
                .overlay(
                    Capsule()
                        .strokeBorder(Color.white.opacity(0.2), lineWidth: 1)
                )
        )
    }
}

struct JobInfoMedium: View {
    let job: JobInfo
    
    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(Color(hex: job.color ?? "#059669") ?? Color.green)
                .frame(width: 10, height: 10)
                .shadow(color: (Color(hex: job.color ?? "#059669") ?? Color.green).opacity(0.5), radius: 2, x: 0, y: 1)
            
            Text(job.name)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.white.opacity(0.9))
                .lineLimit(1)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            Capsule()
                .fill(Color.white.opacity(0.1))
        )
    }
}

// Modern Background Modifier
struct ModernBackgroundMod: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 17.0, *) {
            content.containerBackground(
                LinearGradient(
                    colors: [
                        Color(red: 0.15, green: 0.15, blue: 0.3),  // Dark blue
                        Color(red: 0.2, green: 0.1, blue: 0.3),   // Dark purple
                        Color(red: 0.1, green: 0.2, blue: 0.35)   // Dark teal
                    ],
                    startPoint: .topLeading, 
                    endPoint: .bottomTrailing
                ),
                for: .widget
            )
        } else {
            ZStack {
                // Enhanced gradient background
                LinearGradient(
                    colors: [
                        Color(red: 0.15, green: 0.15, blue: 0.3),  // Dark blue
                        Color(red: 0.2, green: 0.1, blue: 0.3),   // Dark purple
                        Color(red: 0.1, green: 0.2, blue: 0.35)   // Dark teal
                    ],
                    startPoint: .topLeading, 
                    endPoint: .bottomTrailing
                )
                .overlay(
                    // Subtle noise texture
                    LinearGradient(
                        colors: [
                            Color.white.opacity(0.1),
                            Color.clear,
                            Color.white.opacity(0.05)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                
                content
            }
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }
}

struct WorkTrackLarge: View {
    let entry: WorktrackEntry
    
    private var timerData: (isActive: Bool, jobName: String, location: String?, startTime: Date) {
        Provider().readTimerData()
    }
    
    var body: some View {
        let timer = timerData
        
        VStack(spacing: 8) {
            // Simple Header with colorful title
            HStack {
                HStack(spacing: 0) {
                    Text("Vix")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundColor(Color(red: 0.2, green: 0.5, blue: 1.0))  // Blue
                    Text("Time")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundColor(Color(red: 0.6, green: 0.4, blue: 0.9))  // Purple
                }
                .padding(.leading, 25)  // Move VixTime more to the right
                
                Spacer()
                
                if timer.isActive {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 8, height: 8)
                        Text("AUTOTIMER ACTIVE • \(timer.jobName)")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(red: 0.2, green: 0.3, blue: 0.5))
                            .lineLimit(1)
                            .truncationMode(.tail)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(
                        Capsule()
                            .fill(Color.white.opacity(0.15))
                    )
                } else if !entry.jobs.isEmpty {
                    HStack(spacing: 8) {
                        ForEach(entry.jobs.prefix(2), id: \.name) { job in
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(Color(hex: job.color ?? "#059669") ?? Color.blue)
                                    .frame(width: 8, height: 8)
                                Text(job.name)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(Color(red: 0.2, green: 0.3, blue: 0.5))
                                    .lineLimit(1)
                            }
                        }
                    }
                    .padding(.leading, 25)  // Add left margin for spacing
                    .padding(.trailing, 15)  // Add right margin to prevent cutoff
                }
            }
            
            // Give more space at the top
            Spacer(minLength: 4)
            
            // Main Content - Clean Layout
            VStack(spacing: 10) {
                // Compact Timer Info
                if timer.isActive {
                    HStack(spacing: 8) {
                        Image(systemName: "timer")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Color(red: 0.1, green: 0.4, blue: 0.2))  // Dark green for readability
                        
                        Text("AutoTimer Running")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(red: 0.1, green: 0.4, blue: 0.2))  // Dark green for readability
                        
                        Text("Since \(timer.startTime, style: .time)")
                            .font(.system(size: 11, weight: .medium, design: .monospaced))
                            .foregroundColor(Color(red: 0.3, green: 0.4, blue: 0.6))
                        
                        Spacer()
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(Color.green.opacity(0.15))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .strokeBorder(Color.green.opacity(0.3), lineWidth: 1)
                            )
                    )
                }
                
                // Calendar without header labels
                VStack(spacing: 6) {
                    MiniCalendarView(
                        days: MiniCalendarDataManager.readCalendarData(),
                        isCompact: false,
                        daysCount: 21  // Always 3 weeks = 21 days
                    )
                }
                .padding(10)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(red: 0.85, green: 0.88, blue: 0.95).opacity(0.3))
                )
            }
            
            Spacer(minLength: 2)
        }
        .padding(14)
        .widgetURL(URL(string: "worktrack://"))
        .modifier(BackgroundMod())
    }
}

// MARK: - Large Widget Components
struct LargeWidgetHeader: View {
    let timer: (isActive: Bool, jobName: String, location: String?, startTime: Date)
    let firstJob: JobInfo?
    
    var body: some View {
        HStack(alignment: .center) {
            // Enhanced App Branding
            HStack(spacing: 10) {
                if let ui = UIImage(named: "worktrack_icon") {
                    Image(uiImage: ui)
                        .resizable().scaledToFit()
                        .frame(width: 28, height: 28)
                        .clipShape(RoundedRectangle(cornerRadius: 7))
                        .overlay(
                            RoundedRectangle(cornerRadius: 7)
                                .strokeBorder(Color.white.opacity(0.3), lineWidth: 1)
                        )
                        .shadow(color: .white.opacity(0.2), radius: 3, x: 0, y: 2)
                } else {
                    Image(systemName: "briefcase.fill")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.white)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("VixTime")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    Text("Work Tracker")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            
            Spacer()
            
            // Status Indicator
            if timer.isActive {
                TimerStatusLarge(jobName: timer.jobName, startTime: timer.startTime)
            } else if let job = firstJob {
                JobStatusLarge(job: job)
            }
        }
    }
}

struct TimerStatusLarge: View {
    let jobName: String
    let startTime: Date
    
    var body: some View {
        HStack(spacing: 10) {
            // Premium animated indicator
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color.green.opacity(0.3), Color.green.opacity(0.1)],
                            center: .center,
                            startRadius: 5,
                            endRadius: 15
                        )
                    )
                    .frame(width: 30, height: 30)
                
                Circle()
                    .fill(Color.green)
                    .frame(width: 14, height: 14)
                    .overlay(
                        Circle()
                            .stroke(Color.white.opacity(0.6), lineWidth: 2)
                    )
                    .shadow(color: Color.green.opacity(0.8), radius: 4, x: 0, y: 2)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text("AUTOTIMER ACTIVE")
                    .font(.system(size: 9, weight: .black, design: .rounded))
                    .foregroundColor(Color.green)
                    .tracking(1.0)
                
                Text(jobName)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                Text("Since \(startTime, style: .time)")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(.white.opacity(0.8))
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.15))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(Color.green.opacity(0.3), lineWidth: 2)
                )
        )
    }
}

struct JobStatusLarge: View {
    let job: JobInfo
    
    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(Color(hex: job.color ?? "#059669") ?? Color.green)
                .frame(width: 12, height: 12)
                .shadow(color: (Color(hex: job.color ?? "#059669") ?? Color.green).opacity(0.6), radius: 2, x: 0, y: 1)
            
            VStack(alignment: .leading, spacing: 1) {
                Text("AUTOTIMER READY")
                    .font(.system(size: 8, weight: .bold, design: .rounded))
                    .foregroundColor(.white.opacity(0.7))
                    .tracking(1)
                
                Text(job.name)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white.opacity(0.9))
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(Color.white.opacity(0.2), lineWidth: 1)
                )
        )
    }
}

struct ActiveTimerDisplayLarge: View {
    let jobName: String
    let location: String?
    let startTime: Date
    
    var body: some View {
        HStack(spacing: 16) {
            // Timer icon with glow effect
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color.green.opacity(0.3), Color.clear],
                            center: .center,
                            startRadius: 10,
                            endRadius: 25
                        )
                    )
                    .frame(width: 50, height: 50)
                
                Image(systemName: "timer")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(Color.green)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text("AutoTimer Running")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color.green)
                    .tracking(0.5)
                
                Text(jobName)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                if let location = location, !location.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "mappin.and.ellipse")
                            .font(.system(size: 10, weight: .medium))
                        Text(location)
                            .font(.system(size: 11, weight: .medium))
                            .lineLimit(1)
                    }
                    .foregroundColor(.white.opacity(0.8))
                }
                
                Text("Started at \(startTime, style: .time)")
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundColor(.white.opacity(0.7))
            }
            
            Spacer()
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(
                    LinearGradient(
                        colors: [
                            Color.green.opacity(0.15),
                            Color.green.opacity(0.08)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .strokeBorder(Color.green.opacity(0.3), lineWidth: 1.5)
                )
        )
    }
}

// MARK: - Switcher que usa @Environment correctamente
struct WorkTrackSwitcher: View {
    @Environment(\.widgetFamily) private var family
    let entry: WorktrackEntry

    var body: some View {
        switch family {
        case .systemSmall:
            WorkTrackSmall(entry: entry)
        case .systemMedium:
            WorkTrackMedium(entry: entry)
        case .systemLarge:
            WorkTrackLarge(entry: entry)
        default:
            WorkTrackSmall(entry: entry)
        }
    }
}

// MARK: - Configuración del Widget
struct WorkTrackWidget: Widget {
    let kind: String = "WorkTrackWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WorkTrackSwitcher(entry: entry)
        }
        .configurationDisplayName("VixTime")
        .description("View your work time at a glance")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
