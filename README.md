# World Focus 🌍⚡

**World Focus** is a premium, immersive Pomodoro application designed to boost your productivity with stunning live backgrounds and high-quality audio features. Built with modern web technologies, it transforms your workspace into a focused environment—whether you're studying in a rainy Tokyo street or working from a quiet cabin in Norway.

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

## 🛠️ Tech Stack

- **Frontend Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** Vanilla CSS (Glassmorphism, Responsive Grid)

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
- OAuth providers (GitHub / Google / Spotify)

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

### Spotify Setup (Required for Spotify Integration)

**⚠️ IMPORTANT:** To use Spotify features, you **must** configure your own Spotify Client ID. Without this configuration, the app will use the LoFi player as the music provider.

#### Setup Steps:

1. **Create a Spotify App:**
   - Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
   - Log in with your Spotify account
   - Click "Create app"
   - Fill in the app name and description
   - Note your **Client ID** (you'll need this)

2. **Configure Redirect URIs:**
   Add these Redirect URIs in your Spotify app settings:
   - `http://localhost:5173/spotify-callback` (for development)
   - `https://pomodoro-khaki-one.vercel.app/spotify-callback` (for production)

3. **Set Environment Variable:**
   Create a `.env.local` file in the project root (or add to your existing one):
   ```bash
   VITE_SPOTIFY_CLIENT_ID=your_actual_client_id_here
   ```

4. **Restart Development Server:**
   ```bash
   npm run dev
   ```

5. **Connect Your Account:**
   - Open Settings → Music Provider → Toggle to Spotify
   - Click "Connect to Spotify"
   - Log in and authorize the app

#### Requirements:
- Spotify Premium account (required for Web Playback SDK)
- "Web Playback SDK" must be enabled in your Spotify app settings

#### Security Notes:
- This app uses PKCE (Proof Key for Code Exchange) for OAuth
- No Client Secret is required on the frontend
- Never commit your `.env.local` file to version control
- Each deployment environment needs its own Client ID configuration

#### Default Behavior:
- Without `VITE_SPOTIFY_CLIENT_ID` configured, the app will display a configuration error message in Settings
- The LoFi player remains available as an alternative music provider
- By default, the app uses `/spotify-callback` as the redirect path (override with `VITE_SPOTIFY_REDIRECT_PATH` if needed)

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| **Space** | Start/Pause Timer |
| **R** | Reset Timer |
| **M** | Mute/Unmute All Sounds |
| **Esc** | Close Settings/Report Modals |

## 📄 License

This project is available under the MIT License.
