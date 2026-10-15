import SwiftUI
import WebKit
import ActivityKit
import WidgetKit

@main
struct WorldFocusApp: App {
    var body: some Scene { WindowGroup { Workspace().ignoresSafeArea(.container, edges: .bottom) } }
}
struct Workspace: UIViewRepresentable {
    func makeCoordinator() -> Bridge { Bridge() }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.userContentController.add(context.coordinator, name: "focusTimer")
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        view.isInspectable = false
        view.load(URLRequest(url: URL(string: "https://pomodoro-khaki-one.vercel.app")!))
        return view
    }
    func updateUIView(_ view: WKWebView, context: Context) {}
    static func dismantleUIView(_ view: WKWebView, coordinator: Bridge) { view.configuration.userContentController.removeScriptMessageHandler(forName: "focusTimer") }
}
final class Bridge: NSObject, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    private var last: FocusActivity.ContentState?
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.securityOrigin.protocol == "https",
              message.frameInfo.securityOrigin.host == "pomodoro-khaki-one.vercel.app",
              let value = message.body as? [String: Any],
              let mode = value["mode"] as? String, ["focus", "shortBreak", "longBreak"].contains(mode),
              let active = value["isActive"] as? Bool,
              let remaining = value["remainingMs"] as? Double, remaining.isFinite, remaining >= 0, remaining <= 86400000 else { return }
        let milliseconds = value["endAt"] as? Double ?? Date().timeIntervalSince1970 * 1000
        guard milliseconds.isFinite else { return }
        let state = FocusActivity.ContentState(mode: mode, running: active, endAt: Date(timeIntervalSince1970: milliseconds / 1000), remainingSeconds: remaining / 1000)
        if let last, last.mode == state.mode, last.running == state.running,
           (state.running ? last.endAt == state.endAt : last.remainingSeconds == state.remainingSeconds) { return }
        last = state
        if let data = try? JSONEncoder().encode(state) { UserDefaults(suiteName: focusGroup)?.set(data, forKey: "focus-state") }
        WidgetCenter.shared.reloadAllTimelines()
        Task { @MainActor in
            let content = ActivityContent(state: state, staleDate: state.running ? state.endAt : nil)
            if let activity = Activity<FocusActivity>.activities.first {
                if remaining == 0 { await activity.end(content, dismissalPolicy: .immediate) }
                else { await activity.update(content) }
            } else if active && ActivityAuthorizationInfo().areActivitiesEnabled {
                _ = try? Activity.request(attributes: FocusActivity(), content: content, pushType: nil)
            }
        }
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if navigationAction.targetFrame?.isMainFrame != false && url.host != "pomodoro-khaki-one.vercel.app" {
            if url.scheme == "https" { UIApplication.shared.open(url) }
            decisionHandler(.cancel)
        } else { decisionHandler(.allow) }
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, url.scheme == "https" { UIApplication.shared.open(url) }
        return nil
    }
}
