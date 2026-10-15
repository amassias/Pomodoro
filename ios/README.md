# World Focus for iPhone

SwiftUI application containing the production workspace, a WidgetKit extension and an ActivityKit Live Activity. The web timer sends only its phase, deadline and remaining duration to a native message handler; messages from other origins or child frames are rejected. No account or calendar tokens are sent to the widget.

## Build

Open `WorldFocus.xcodeproj`, select the WorldFocus scheme and an iPhone simulator. The generated project is committed. To regenerate it after changing target configuration, install XcodeGen and run `xcodegen generate --spec ios/project.yml` from the repository root.

For a physical iPhone, select your Apple development team for both targets, use bundle IDs owned by that team and register the shared App Group `group.com.worldfocus.app` (or change it consistently in the entitlements and Shared/FocusActivity.swift). Build and install through Xcode. Distribution via TestFlight/App Store requires the corresponding Apple Developer membership and signing assets.

The Home Screen/accessory widget reads the last timer state from the App Group. The Live Activity displays the running countdown on the Lock Screen and Dynamic Island; it updates when the timer changes mode, starts, pauses, resets or clears. iOS controls widget refresh timing. Timer transitions and sounds execute in the workspace when its web view is active; this app does not promise JavaScript execution or an alarm while iOS suspends the web view.

Calendar OAuth opens in the system browser. An OAuth connection made in Safari is separate from the WKWebView session; native OAuth handoff is not implemented. The web calendar integration remains available in Safari.
