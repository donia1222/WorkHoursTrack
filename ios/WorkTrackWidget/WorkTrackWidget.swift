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
                        Color(red: 0.09, green: 0.12, blue: 0.22),
                        Color(red: 0.05, green: 0.45, blue: 0.82)
                    ],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(Color.white.opacity(0.08), lineWidth: 1)
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
                    colors: [Color(red: 0.09, green: 0.12, blue: 0.22),
                             Color(red: 0.05, green: 0.45, blue: 0.82)],
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
        
        VStack(spacing: 8) {
            // App name header
            HStack {
                if let ui = UIImage(named: "worktrack_icon") {
                    Image(uiImage: ui)
                        .resizable().scaledToFit()
                        .frame(width: 18, height: 18)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                } else {
                    Image(systemName: "briefcase.fill")
                        .font(.system(size: 14))
                }
                Text("WorkTrack")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                Spacer()
            }
            .foregroundColor(.white.opacity(0.95))
            
            // Show timer if active, otherwise show job and calendar
            if timer.isActive {
                Spacer(minLength: 0)
                CompactTimerView(
                    jobName: timer.jobName,
                    startTime: timer.startTime
                )
                Spacer(minLength: 0)
            } else {
                // Show first job if exists
                if let firstJob = entry.jobs.first {
                    Text(firstJob.name)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.8))
                        .lineLimit(1)
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
        .padding(10)
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
            // App name header
            HStack {
                if let ui = UIImage(named: "worktrack_icon") {
                    Image(uiImage: ui)
                        .resizable().scaledToFit()
                        .frame(width: 20, height: 20)
                        .clipShape(RoundedRectangle(cornerRadius: 5))
                } else {
                    Image(systemName: "briefcase.fill")
                        .font(.system(size: 16))
                }
                Text("WorkTrack")
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                Spacer()
            }
            .foregroundColor(.white.opacity(0.95))
            
            // Jobs list
            VStack(alignment: .leading, spacing: 4) {
                if entry.jobs.isEmpty {
                    Text("No jobs synced")
                        .font(.system(size: 11))
                        .foregroundColor(.red.opacity(0.8))
                } else {
                    ForEach(entry.jobs.prefix(2), id: \.self) { job in
                        HStack(spacing: 4) {
                            Circle()
                                .fill(Color(hex: job.color ?? "#059669") ?? Color.green)
                                .frame(width: 6, height: 6)
                            Text(job.name)
                                .font(.system(size: 10, weight: .medium))
                            if let location = job.location {
                                Text("• \(location)")
                                    .font(.system(size: 9))
                                    .foregroundColor(.white.opacity(0.6))
                            }
                            Spacer()
                        }
                    }
                }
            }
            .foregroundColor(.white.opacity(0.85))
            
            // Show timer if active, otherwise show calendar
            if timer.isActive {
                Spacer(minLength: 4)
                
                MediumTimerView(
                    jobName: timer.jobName,
                    location: timer.location,
                    startTime: timer.startTime
                )
                
                Spacer(minLength: 4)
            } else {
                Spacer(minLength: 0)
                
                // Calendar - Show next 7 days (aligned to left)
                HStack {
                    MiniCalendarView(
                        days: MiniCalendarDataManager.readCalendarData(),
                        isCompact: true
                    )
                    Spacer()
                }
            }
        }
        .padding(12)
        .widgetURL(URL(string: "worktrack://"))
        .modifier(BackgroundMod())
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
            // App name header - Larger for big widget
            HStack {
                if let ui = UIImage(named: "worktrack_icon") {
                    Image(uiImage: ui)
                        .resizable().scaledToFit()
                        .frame(width: 24, height: 24)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                } else {
                    Image(systemName: "briefcase.fill")
                        .font(.system(size: 20))
                }
                Text("WorkTrack")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                Spacer()
            }
            .foregroundColor(.white.opacity(0.95))
            
            // Jobs list - only show 2 jobs to save space
            VStack(alignment: .leading, spacing: 4) {
                ForEach(entry.jobs.prefix(2), id: \.self) { job in
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color(hex: job.color ?? "#059669") ?? Color.green)
                            .frame(width: 6, height: 6)
                        Text(job.name)
                            .font(.system(size: 11, weight: .medium))
                            .lineLimit(1)
                        if let location = job.location {
                            Text("• \(location)")
                                .font(.system(size: 10))
                                .foregroundColor(.white.opacity(0.6))
                                .lineLimit(1)
                        }
                        Spacer()
                    }
                }
            }
            .foregroundColor(.white.opacity(0.85))
            
            Spacer(minLength: 2)
            
            // Show timer if active at the top, then smaller calendar
            if timer.isActive {
                ActiveTimerView(
                    jobName: timer.jobName,
                    location: timer.location,
                    startTime: timer.startTime,
                    isCompact: false
                )
                
                // Show smaller calendar with only 7 days
                MiniCalendarView(
                    days: MiniCalendarDataManager.readCalendarData(),
                    isCompact: true
                )
            } else {
                // Calendar - Back to 2 weeks instead of full month
                MiniCalendarView(
                    days: MiniCalendarDataManager.readCalendarData(),
                    isCompact: false
                )
            }
            
            Spacer(minLength: 2)
        }
        .padding(12)
        .widgetURL(URL(string: "worktrack://"))
        .modifier(BackgroundMod())
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
        .configurationDisplayName("WorkTrack")
        .description("View your work time at a glance")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
