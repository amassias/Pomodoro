---
name: World Focus
description: Immersive Pomodoro workspace with live world atmospheres, focus audio, and progress tracking.
colors:
  ink: "#000000"
  surface-night: "#090a0c"
  surface-glass: "rgba(12, 15, 18, 0.72)"
  surface-glass-strong: "rgba(9, 11, 14, 0.9)"
  border-glass: "rgba(255, 255, 255, 0.12)"
  text-primary: "#ffffff"
  text-secondary: "rgba(255, 255, 255, 0.68)"
  text-muted: "rgba(255, 255, 255, 0.66)"
  accent-coral: "#ff716b"
  accent-soft: "rgba(255, 113, 107, 0.16)"
  success-mint: "#72d6a0"
  short-break-teal: "#54e0c4"
  long-break-violet: "#9789ff"
  spotify-green: "#1cb954"
  achievement-gold: "#ffd700"
typography:
  display:
    fontFamily: "Outfit, sans-serif"
    fontSize: "clamp(4.5rem, 9vw, 7rem)"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Outfit, sans-serif"
    fontSize: "clamp(1.8rem, 6vw, 2.6rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Outfit, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Outfit, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Outfit, sans-serif"
    fontSize: "0.68rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.14em"
  button:
    fontFamily: "Outfit, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.01em"
rounded:
  micro: "4px"
  field: "8px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  glass-panel:
    backgroundColor: "{colors.surface-glass}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "16px"
  button-primary:
    backgroundColor: "{colors.accent-coral}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0.95rem 2rem"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0.75rem 1rem"
  text-field:
    backgroundColor: "rgba(255, 255, 255, 0.1)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.field}"
    padding: "0.7rem"
  phase-chip:
    backgroundColor: "{colors.short-break-teal}"
    textColor: "#062d2c"
    rounded: "{rounded.pill}"
    padding: "0.2rem 0.5rem"
  mode-control:
    backgroundColor: "rgba(255, 255, 255, 0.045)"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    padding: "0.35rem"
  stat-card:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "1.5rem"
  atmosphere-bar:
    backgroundColor: "{colors.surface-glass}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1.2rem"
  audio-dock:
    backgroundColor: "{colors.surface-glass}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    height: "80px"
  mobile-nav:
    backgroundColor: "rgba(8, 10, 12, 0.88)"
    textColor: "{colors.text-secondary}"
    rounded: "14px"
    padding: "0.35rem"
---

# Design System: World Focus

## Overview

**Creative North Star: "The Ambient Focus Cockpit"**

Observed in the incumbent implementation, World Focus treats the work session as a quiet cockpit placed inside a live world. The video atmosphere owns the canvas; the interface floats above it in dark translucent surfaces, allowing the environment to remain present without competing with the countdown and the next action.

The system is compact, rounded and tactile. Large numerals establish the timer as the primary visual anchor, while low-contrast labels, pill controls and small status lights keep supporting information scannable. Focus, short break and long break are deliberately differentiated through the surface tint and action color so the current phase is never only a text distinction.

**Key Characteristics:**

- Full-viewport live atmosphere with layered dark overlays.
- Dark glass surfaces with soft borders and strong blur.
- One large countdown supported by compact uppercase metadata.
- Coral focus actions with turquoise and violet break states.
- Floating, responsive controls that become stacked and bottom-anchored on narrow screens.

## Colors

The palette is a near-black neutral field with white hierarchy, a coral action signal, a mint synchronization signal and two phase-specific accents. Transparency is part of the color language: surfaces are meant to mix with the live background.

### Primary

- **Coral Signal**: the primary action, focus selection, task completion, selected progress and attention-calling states.
- **Short-break Teal**: the restorative short-break surface, badge and active control state.
- **Long-break Violet**: the longer recovery surface, badge and active control state.

### Secondary

- **Success Mint**: connected, synced and live-status feedback.
- **Spotify Green**: provider-specific identity used only inside Spotify settings and playback states.
- **Achievement Gold**: the completed daily goal and achievement emphasis.

### Neutral

- **Surface Night**: the black page base and fallback behind the video.
- **Glass Surface**: the default translucent panel layer.
- **Strong Glass Surface**: denser popovers, room panels and mobile navigation.
- **Text Primary**: high-contrast labels, values and controls.
- **Text Secondary / Muted**: supporting copy, metadata and inactive controls.
- **Glass Border**: the fine white-alpha outline used to separate translucent layers.

### Named Rules

**The Atmosphere-First Rule.** Keep the live scene visible behind the interface; translucent dark surfaces should support focus without turning the page into a solid dashboard.

**The Phase-Color Rule.** Coral belongs to focus and primary action states; short breaks use turquoise and long breaks use violet.

## Typography

**Display Font:** Outfit (with `sans-serif` fallback)

**Body Font:** Outfit (with `sans-serif` fallback)

**Label/Mono Font:** No distinct label or mono family is present; labels stay in Outfit.

**Character:** A single geometric sans family keeps the interface contemporary and cohesive. Weight and opacity do the hierarchy work: the timer is light and expansive, actions are semibold, and context recedes through muted white-alpha text.

### Hierarchy

- **Display** (300, `clamp(4.5rem, 9vw, 7rem)`, line-height 1): the countdown and other primary numeric readouts.
- **Headline** (600, `clamp(1.8rem, 6vw, 2.6rem)`, line-height 1.1): welcome and prominent modal headings.
- **Title** (600, `1.1rem`, line-height 1.2): panel and section titles such as Tasks and modal headings.
- **Body** (400, `0.95rem`, line-height 1.5): descriptions, forms and explanatory copy.
- **Label** (600, `0.68rem`, letter-spacing `0.14em`, uppercase): section eyebrows, phase badges and compact metadata.

### Named Rules

**The Timer-First Rule.** The countdown is the largest visual element; supporting text stays compact and low-contrast.

## Layout

The page is a full-viewport composition. A fixed YouTube frame sits behind a dark two-direction overlay, while the application layer uses responsive padding between `0.75rem` and `2rem`. The desktop header is capped at `1180px` and the primary workspace is an `840px` grid with a wider timer column (`1.15fr`) beside the task column (`0.85fr`).

At widths up to `980px`, the workspace collapses to one column. At `768px` and below, the atmosphere selector becomes a bottom sheet attached to the viewport, audio docks become full-width, and a five-item fixed navigation bar appears at the bottom. The right action rail is hidden on mobile and its actions move into the mobile navigation. Internal modal and archive content scrolls rather than pushing the entire viewport.

The atmosphere control is a centered pill at rest and a wide panel when open. The audio dock is anchored near the lower-left corner on larger screens and becomes a horizontal block with viewport-safe margins on small screens. Safe-area insets are used by the fixed controls and mobile sheet.

## Elevation & Depth

Depth is a hybrid of live imagery, tonal overlays, blur and restrained shadows. The shared glass panel uses a translucent dark surface, `24px` backdrop blur, a one-pixel glass border and a broad panel shadow. Stronger modal surfaces add a darker opaque layer and a blurred overlay; hover states use small scale or translate responses instead of extra decoration.

### Shadow Vocabulary

- **Panel shadow** (`0 24px 80px rgba(0, 0, 0, 0.38)`): shared glass panels and large dialogs.
- **Action lift** (`0 12px 30px rgba(255, 113, 107, 0.24)`): hover feedback for coral primary actions.
- **Floating control shadow** (`0 4px 12px rgba(0, 0, 0, 0.15)`): the compact atmosphere pill.
- **Toast shadow** (`0 8px 32px rgba(0, 0, 0, 0.4)`): transient notifications above the interface.

### Named Rules

**The Soft-Lift Rule.** Surfaces are calm at rest; elevation is communicated through blur, tonal contrast and a small state response rather than hard borders or heavy ornament.

## Shapes

The form language is rounded-first. Pills define phase selectors, status badges, atmospheric location controls, compact actions and category tabs. Fields, task rows and small controls use gently rounded corners; modal and panel silhouettes use larger radii. Borders are thin white-alpha strokes, and dashed borders identify add-or-suggest actions.

The system avoids sharp rectangular primary actions. Circular dots, progress rings and icon buttons provide the small geometric counterpoint to the dominant pills and rounded cards.

## Components

### Buttons

Buttons are compact and tactile, with the main action carrying the strongest color signal.

- **Shape:** pill controls use `999px`; fields and compact icon actions use the field radius.
- **Primary:** coral focus action with dark text, semibold Outfit and generous horizontal padding; short and long breaks replace coral with their phase color.
- **Hover / Focus:** primary actions scale slightly and lift with a colored shadow; all interactive controls expose a coral focus ring.
- **Secondary / Ghost / Tertiary:** transparent or white-alpha surfaces with muted text and a fine border; reset and utility actions often use an underline or no filled surface.

### Chips

- **Phase badges:** compact uppercase pills with a turquoise or violet tint and a matching light text color.
- **Status chips:** live, sync and achievement states use small dots or compact white-alpha pills with mint, coral or gold accents.
- **Category tabs:** filled pills; the selected category becomes white with dark text.

### Cards / Containers

- **Corner Style:** large panels use the shared `24px` radius; cards and modals use `12–16px`; small task rows use `8px`.
- **Background:** translucent dark glass is the default; timer phase cards add a tinted gradient, while reports and settings use denser dark surfaces.
- **Shadow Strategy:** use the shared panel shadow for floating surfaces and tonal layering for internal cards.
- **Border:** one-pixel white-alpha glass border, with accent borders for selected tasks, break states and active locations.
- **Internal Padding:** common panel rhythm is `16px` with larger modal padding and compact control padding.

### Inputs / Fields

Fields use a dark white-alpha fill, a one-pixel light border, white text and an `8px` radius. Focus increases the border contrast and applies the global coral focus ring. Number inputs, selects, textareas and the task date field share this language; sliders use a thin track and a white circular thumb.

### Navigation

Desktop utility actions form a fixed right rail: Settings, Insights, Feedback and authentication. The header carries brand, sync status, shared-session controls and daily progress. On mobile, the rail becomes a five-item bottom navigation bar with dark glass, compact labels and touch-sized targets.

### Timer Card

The timer card is the signature component: a centered phase status, three-way mode switch, optional session tools, oversized tabular countdown, one-sentence guidance and a single prominent start/pause action. Focus is near-black, short break is deep teal, and long break is deep violet. The current phase remains legible through both color and explicit copy such as `Start focus` or `Start break`.

### Atmosphere Selector

The location control starts as a centered pill labelled `Studying in …`. When expanded, it becomes a wide glass panel with saveable atmosphere collections, category tabs, a flexible city grid, favorites, custom-stream entry and an explicit retry/failure state for unavailable live video.

### Audio Dock

The Lofi dock is a compact floating glass card with an `80px` cover block, track title, provider label, a minimal volume slider and a circular play/pause control. It is draggable on larger screens and becomes a full-width row on small screens. Spotify reuses the same floating footprint for its embedded player.

### Insights & Feedback

Insights uses a scrollable dark modal with three large statistic cards, a weekly comparison strip, a 28-day coral heatmap, period controls, a bar chart, task insights, achievement groups and export/reset actions. Feedback uses a narrower dark form modal with radio choices, selects, textareas and a coral submit action. Welcome, tour, toast and error states reuse the same dark glass, rounded geometry and restrained motion.

## Do's and Don'ts

### Do:

- **Do** keep the live background visible and legible beneath new surfaces.
- **Do** use Outfit and the existing white-alpha hierarchy for new copy.
- **Do** reserve coral for focus actions, selected work and attention states.
- **Do** preserve the turquoise short-break and violet long-break distinction.
- **Do** use rounded controls, thin glass borders and the existing blur/shadow vocabulary.
- **Do** make new fixed elements respect safe-area insets and the mobile bottom navigation.
- **Do** keep reduced-motion behavior and keyboard/focus visibility intact.

### Don't:

- **Don't** replace the atmosphere-first canvas with a solid dashboard background.
- **Don't** flatten all timer phases into the same coral treatment.
- **Don't** introduce a second display font or a new unrelated color system.
- **Don't** use heavy decorative patterns that obscure the video or the countdown.
- **Don't** rely on hover-only access for actions that must work on touch and keyboard.
- **Don't** turn a temporary stream or provider state into a permanent availability promise.
