# World Focus product backlog

This backlog separates the cinematic UX refresh from future product work. Value and effort use a relative High / Medium / Low scale.

| Priority | Item | User value | Effort | Dependencies | Acceptance criteria |
| --- | --- | --- | --- | --- | --- |
| P0 | Timer and task interaction tests | High | Medium | Test DOM setup | Start, pause, reset, add, edit, complete, restore and delete flows are covered. |
| P0 | Modal accessibility foundation | High | Medium | Shared dialog primitive | Every modal traps focus, restores focus, closes with Escape and exposes a title. |
| P0 | Media failure states | High | Medium | YouTube and audio adapters | A failed stream or player shows a useful retry/fallback state without blocking the timer. |
| P0 | Active-session persistence | High | Medium | Existing local storage | Reloading restores mode, remaining time and running/paused status accurately. |
| P0 | Performance budget | High | Medium | Production analytics | Initial JS, image weight and third-party media loading are measured and documented. |
| P1 | Pomodoro estimates per task | High | Medium | Task model extension | Users can set and see estimated versus completed sessions without losing old tasks. |
| P1 | Active task selection | High | Medium | Task model extension | One task can be attached to a running session and appears in session history. |
| P1 | Timer presets | Medium | Low | Settings UI | Users can save and switch named focus/break presets. |
| P1 | Full-screen focus mode | High | Medium | Responsive shell | A distraction-free view retains timer, active task and essential controls. |
| P1 | Shortcut settings | Medium | Medium | Settings persistence | Users can view, disable and remap supported keyboard shortcuts. |
| P1 | Progressive notifications | Medium | Low | Browser Notifications API | Permission is requested only after clear user intent and failures are explained. |
| P1 | Weekly insights | High | Medium | Existing history | Reports compare the current week with the previous week and explain the trend. |
| P2 | Weekly goals | Medium | Medium | Report aggregation | Users can define a weekly target and track progress by day. |
| P2 | Contextual achievements | Medium | Medium | Achievement rules | Progress and the next achievable milestone appear without interrupting focus. |
| P2 | Atmosphere collections | Medium | Medium | Location metadata | Users can save and reorder favorite combinations of location and audio. |
| P2 | Stronger cross-device sync | High | High | Supabase conflict policy | Concurrent edits resolve predictably and sync status is visible. |
| P2 | JSON import/export | Medium | Medium | Versioned export schema | A full backup can be exported, validated and restored without data loss. |
| P2 | PWA and offline timer | High | High | Service worker | Installed app can run the timer and tasks offline, then sync later. |
| P3 | English/French localization | Medium | High | i18n framework | All UI strings, dates and validation messages can switch language. |
| P3 | Calendar integrations | Medium | High | OAuth and provider APIs | Focus blocks can be read from and written to a selected calendar. |
| P3 | Shared focus sessions | Medium | High | Realtime presence | Invited users can join a synchronized session with explicit privacy controls. |

## Implementation status

- [x] P0 — Timer and task logic tests, including session restoration and archive transitions.
- [x] P0 — Shared modal focus trapping, Escape handling and focus restoration for primary dialogs.
- [x] P0 — Visible video and Lofi stream failure states with retry behavior.
- [x] P0 — Versioned active-session persistence using an absolute timer deadline.
- [x] P0 — Automated production asset budget and documented baseline in `PERFORMANCE.md`.
- [x] P1 — Explicit active task, Pomodoro estimates and completed-session tracking.
- [x] P1 — Classic, Deep 50 and Flow 90 timer presets plus full-screen focus mode.
- [x] P1 — User-controlled keyboard shortcut setting and progressive notification request on first start.
- [x] P2 — Weekly goal progress and configurable weekly target.
- [x] P2 — Versioned JSON backup import/export while preserving local Spotify secrets.
- [x] P3 — Anonymous shared focus rooms via link with Supabase Realtime presence and host-synchronized timers.
- [x] P3 — English-only interface retained by product decision.
