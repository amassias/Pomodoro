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

### Spotify Setup (optional)

- In the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/), create an app and note the Client ID.
- Add these Redirect URIs to the app settings:
    - `http://localhost:5173/spotify-callback` (development)
    - `https://pomodoro-khaki-one.vercel.app/spotify-callback` (production)
- Paste the Client ID in Settings → Music Provider → Spotify, then click **Connect to Spotify**.
- Ensure “Web Playback SDK” is enabled and that your Spotify account is Premium.

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| **Space** | Start/Pause Timer |
| **R** | Reset Timer |
| **M** | Mute/Unmute All Sounds |
| **Esc** | Close Settings/Report Modals |

## 📄 License

This project is available under the MIT License.
