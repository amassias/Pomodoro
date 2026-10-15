import SwiftUI
import WidgetKit
import ActivityKit

struct Countdown: View {
    let state: FocusActivity.ContentState
    var body: some View {
        if state.running && state.endAt > .now { Text(timerInterval: Date.now...state.endAt, countsDown: true).monospacedDigit() }
        else { Text(String(format: "%02d:%02d", Int(state.remainingSeconds) / 60, Int(state.remainingSeconds) % 60)).monospacedDigit() }
    }
}
struct FocusLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: FocusActivity.self) { context in
            HStack { Image(systemName: "timer"); VStack(alignment: .leading) { Text(context.state.label).font(.headline); Text(context.state.running ? "Protect this time" : "Paused").font(.caption) }; Spacer(); Countdown(state: context.state).font(.title) }.padding().activityBackgroundTint(Color(.systemBackground))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { Label(context.state.label, systemImage: "timer") }
                DynamicIslandExpandedRegion(.trailing) { Countdown(state: context.state) }
                DynamicIslandExpandedRegion(.bottom) { Text(context.state.running ? "World Focus" : "Paused") }
            } compactLeading: { Image(systemName: "timer") }
              compactTrailing: { Countdown(state: context.state).frame(width: 55) }
              minimal: { Image(systemName: "timer") }
              .widgetURL(URL(string: "worldfocus://timer"))
        }
    }
}
struct FocusEntry: TimelineEntry { let date: Date; let state: FocusActivity.ContentState }
struct FocusTimeline: TimelineProvider {
    func placeholder(in context: Context) -> FocusEntry { FocusEntry(date: .now, state: .init(mode: "focus", running: false, endAt: .now, remainingSeconds: 1500)) }
    func getSnapshot(in context: Context, completion: @escaping (FocusEntry) -> Void) { completion(entry(context)) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<FocusEntry>) -> Void) { completion(Timeline(entries: [entry(context)], policy: .after(.now.addingTimeInterval(900)))) }
    private func entry(_ context: Context) -> FocusEntry {
        guard let data = UserDefaults(suiteName: focusGroup)?.data(forKey: "focus-state"), var state = try? JSONDecoder().decode(FocusActivity.ContentState.self, from: data) else { return placeholder(in: context) }
        if state.running && state.endAt < .now { state.running = false; state.remainingSeconds = 0 }
        return FocusEntry(date: .now, state: state)
    }
}
struct FocusWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "FocusTimer", provider: FocusTimeline()) { entry in
            VStack(alignment: .leading, spacing: 8) { Label(entry.state.label, systemImage: "timer").font(.headline); Countdown(state: entry.state).font(.title2); Text(entry.state.running ? "In progress" : "Open World Focus").font(.caption).foregroundStyle(.secondary) }.containerBackground(.fill.tertiary, for: .widget).widgetURL(URL(string: "worldfocus://timer"))
        }.configurationDisplayName("World Focus").description("Your current focus session.").supportedFamilies([.systemSmall, .accessoryRectangular])
    }
}
@main struct FocusWidgets: WidgetBundle { var body: some Widget { FocusWidget(); FocusLiveActivity() } }
