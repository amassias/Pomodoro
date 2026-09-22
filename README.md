# World Focus

> A focused Pomodoro workspace where a live place, your next task, and your music live on one screen.

[![Live on Vercel](https://img.shields.io/badge/Live%20demo-Vercel-black?logo=vercel)](https://pomodoro-khaki-one.vercel.app)
[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Built%20with-Vite-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)

## Focus somewhere real

Pick a live atmosphere and keep it behind your session. The desktop app stays immersive while the timer, tasks, music, progress, and utilities remain immediately accessible.

<p align="center">
  <a href="https://pomodoro-khaki-one.vercel.app">
    <img src="docs/assets/screenshots/home-live-workspace.webp" alt="World Focus workspace over a live Tokyo Shibuya video background" width="100%" />
  </a>
</p>

<p align="center"><strong>Live Tokyo, a clear task, and one timer.</strong> World Focus keeps the active atmosphere visible behind the workspace.</p>

**[Open the live web app ↗](https://pomodoro-khaki-one.vercel.app)**

## Explore the workspace

| Live atmospheres | Session options |
| --- | --- |
| Choose a city, a nature scene, or a focus vibe — and save a favorite atmosphere. | Switch between Classic, Deep 50, and Flow 90; create calendar blocks or enter full screen. |
| [<img src="docs/assets/screenshots/atmosphere-selector.webp" alt="World Focus atmosphere selector over the live Tokyo video background" width="520" />](https://pomodoro-khaki-one.vercel.app) | [<img src="docs/assets/screenshots/session-options.webp" alt="World Focus session options for focus length, calendar blocks, and full screen" width="520" />](https://pomodoro-khaki-one.vercel.app) |

| Session plan | Insights and achievements |
| --- | --- |
| Keep one priority in view, set a due date, estimate focus sessions, and share a temporary focus room. | Track milestones, streaks, daily progress, and earned achievements. |
| [<img src="docs/assets/screenshots/session-plan.webp" alt="World Focus timer and session plan with a live Tokyo video background" width="520" />](https://pomodoro-khaki-one.vercel.app) | [<img src="docs/assets/screenshots/insights-achievements.webp" alt="World Focus achievements view" width="520" />](https://pomodoro-khaki-one.vercel.app) |

The public app is available at **[pomodoro-khaki-one.vercel.app](https://pomodoro-khaki-one.vercel.app)**.

## ✨ Features

### ⏱️ Smart Timer
- **Customizable Intervals:** Adjustable Focus, Short Break, and Long Break durations.
- **Auto-Transition:** Option to auto-start breaks and focus sessions.
- **Audio Feedback:** Pleasant distinct sounds for timer completion and ticking (optional).

### 🌆 Live Backgrounds
- **Immersive Atmosphere:** Choose from a curated list of live video feeds including:
  - **Urban Night:** Tokyo (Shibuya, Shinjuku), NYC, Seoul, Hong Kong.
  - **Urban Day:** Paris, London, Venice, Santorini.
  - **Nature:** Namibia, Kenya, Maldives, Northern Lights.
  - **Focus:** Space (ISS), Lofi Girl, Synthwave, Norway Train.
- **Glassmorphism UI:** A sleek, semi-transparent interface that blends beautifully with the background.

### 🎵 Lofi Player
- **Integrated Radio:** Built-in "Lofi Girl" radio player.
- **Draggable Widget:** Move the player anywhere on your screen.
- **Compact Design:** Designed to stay out of your way while keeping the vibes going.

### 📊 Productivity Tracking
- **Detailed Reports:** Meaningful statistics including Total Hours, Pomodoros Completed, and Current Streak.
- **Visual Charts:** Weekly activity charts to track your consistency.
- **Task Management:** A built-in task list to organize your session goals.
- **Daily Progress Indicator:** Visual display of your daily focus session progress.
- **Data Export:** Download your focus history as a CSV file for your own records.

### 🏆 Achievements System
- **Unlock Badges:** Earn achievements based on your productivity milestones:
  - **First Step:** Complete your first focus session.
  - **Early Bird:** Complete a session between 4 AM and 8 AM.
  - **Night Owl:** Complete a session between 12 AM and 4 AM.
  - **Marathoner:** Focus for 4+ hours in a single day.
  - **Streak Master:** Maintain a 7-day streak.
  - **Dedication:** Complete 50 total lifetime sessions.
- **Visual Badge Display:** View all unlocked and locked achievements in your productivity report.

### 💬 Feedback System
- **User Feedback Modal:** Easily submit feedback and suggestions directly from the app.
- **In-App Notifications:** Real-time feedback for user actions and app interactions.

## 🛠️ Tech Stack

- **Frontend Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** Vanilla CSS (Glassmorphism, Responsive Grid)
- **Backend:** [Supabase](https://supabase.com/) (PostgreSQL + Authentication)
- **Error Handling:** React Error Boundary for graceful error management
- **OAuth Integration:** GitHub and Google authentication support

## 🗂️ Project Structure

The code follows the [Bulletproof React](https://github.com/alan2207/bulletproof-react) layout:

```
api/              Vercel serverless functions
docs/             Backlog, performance budget, location sources, screenshots
public/           Static files served as-is (sounds, icons, service worker)
scripts/          Build tooling (performance budget check)
supabase/         Database schema
src/
  app/            Application shell (App.jsx)
  assets/         Images bundled by Vite
  components/ui/  Shared UI components (Toast, ErrorBoundary)
  features/       One folder per feature (timer, tasks, audio, report…)
  hooks/          Shared React hooks
  lib/            Pure logic and API clients, with colocated tests
  providers/      React context providers (auth, user data, shared session)
```

## 🚀 Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/pomodoro-app.git
    cd pomodoro-app
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open your browser at `http://localhost:5173` (or the port shown in your terminal).

### Supabase Auth Setup (Email + OAuth)

This app supports Supabase Auth with:
- Email + Password
- OAuth providers (GitHub / Google)

#### 1) Create env vars

Create a `.env.local` at the repo root:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_PUBLIC_KEY
```

Important:
- Never put Supabase `service_role` keys in the frontend.

#### 2) Configure Redirect URLs in Supabase

In Supabase Dashboard → Authentication → URL Configuration:

- Site URL:
    - `https://pomodoro-khaki-one.vercel.app`

- Additional Redirect URLs:
    - `http://localhost:5173/auth-callback`
    - `https://pomodoro-khaki-one.vercel.app/auth-callback`

The app handles OAuth redirects on `/auth-callback`.

### Supabase Database Setup (Per‑Account Sync)

To sync tasks, pomodoro history (reports), settings, and city selection per user (and across devices), you must create the `user_state` table and its RLS policies.

1) In Supabase Dashboard → **SQL Editor**, run the script in:

- [supabase/user_state.sql](supabase/user_state.sql)

2) Confirm **Row Level Security** is enabled for `public.user_state`.

Notes:
- Spotify access/refresh tokens are still stored locally in the browser (but are isolated per Supabase user on the same device). Spotify preferences (e.g., selected playlist, provider) sync via `user_state.settings`.

#### 3) Configure Vercel env vars

In Vercel Project → Settings → Environment Variables, add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then redeploy.

### Spotify Setup (optional)

- In the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/), create an app and note the Client ID.
- Add these Redirect URIs to the app settings:
    - `http://localhost:5173/spotify-callback` (development)
    - `https://pomodoro-khaki-one.vercel.app/spotify-callback` (production)
- Paste the Client ID in Settings → Music Provider → Spotify, then click **Connect to Spotify**.
- Ensure “Web Playback SDK” is enabled and that your Spotify account is Premium.

Notes:
- This app uses PKCE and does not require a Spotify Client Secret on the frontend.
- By default the app uses `/spotify-callback` as the redirect path. You can override it with `VITE_SPOTIFY_REDIRECT_URI` or `VITE_SPOTIFY_REDIRECT_PATH`.

Tip: keep Spotify on `/spotify-callback` (see Redirect URIs above) to avoid conflicts with other OAuth flows.

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| **Space** | Start/Pause Timer |
| **R** | Reset Timer |
| **M** | Mute/Unmute All Sounds |
| **Esc** | Close Settings/Report Modals |

## 📄 License

This project is available under the MIT License.
