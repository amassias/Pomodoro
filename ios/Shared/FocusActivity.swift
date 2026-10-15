import ActivityKit
import Foundation

struct FocusActivity: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var mode: String
        var running: Bool
        var endAt: Date
        var remainingSeconds: Double
        var label: String { mode == "focus" ? "Focus" : mode == "shortBreak" ? "Short break" : "Long break" }
    }
    var name: String = "World Focus"
}
let focusGroup = "group.com.worldfocus.app"
