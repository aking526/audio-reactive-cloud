# Step 1 — Scaffold the “Audio-Reactive Cloud” MVP (routing + 3D scene shell)

## Project overview (context for the agent)

We’re building a small Next.js app where a 3D particle field (“cloud”) reacts to audio energy in real time. Multiple users who visit the same room URL will eventually see synchronized parameters (modes, sliders) via Supabase Realtime, and we’ll persist named presets in Postgres. The experience should feel lightweight, creative, and demo-ready.

## Objective of this step

Create the initial app skeleton: routes, layout, and a basic 3D scene with orbit controls and a placeholder particle cloud. No audio input, no realtime, and no database work yet—this step is only about getting a reliable visual baseline that renders smoothly and gives us places to plug in audio, realtime, and presets later.

## Tasks

1. **Confirm router and project shape**

   * Detect whether the template uses the App Router (`app/`) or the Pages Router (`pages/`). We will create a room route that works with whichever the template already uses.

2. **Install essential UI/3D packages**

   * Add: `@react-three/fiber`, `three`, `@react-three/drei` for the WebGL scene and controls.
   * Add: `framer-motion` for simple panel transitions.
   * Add (but do not use deeply yet): `zustand` for lightweight UI state, `zod` for future param schema validation.

3. **Create routes**

   * Landing route at `/` with a minimal UI: a single text input for a “room slug” and a button that navigates to `/room/[slug]`.
   * Room route at `/room/[slug]` that renders the 3D scene and a right-side control panel placeholder.
   * Ensure the slug is read from the URL and exposed to the page/component (we’ll later use it for realtime channels and preset queries).

4. **Build the 3D scene shell**

   * Create a `Scene` component that mounts a `<Canvas>` (react-three-fiber), sets up a Perspective camera, ambient light, and `OrbitControls` (from `drei`) with smooth damping.
   * Render a placeholder particle cloud of \~10k–25k points (enough to look interesting but guaranteed to run at 60fps on a typical laptop). It can be a simple randomized sphere or grid—no shaders or audio mapping yet.
   * Expose a couple of props on the `Scene` component (such as `pointCount` and `pointSize`) so we can tune performance and look without touching internals.

5. **Create the UI scaffolding around the scene**

   * Add a right-side control panel container (`ControlPanel` component) with just headings and empty slots for:

     * Mode selector (will be three modes later).
     * Sliders for sensitivity, warp, and hue shift (placeholders only—no state yet).
   * Use a responsive layout: on desktop, the panel is a fixed-width right rail; on mobile, it collapses to a bottom sheet or stacked block. Keep styles minimal but neat (Tailwind is available in the template).

6. **Presence strip placeholder**

   * Add a thin horizontal area (`PresenceStrip`) above or below the canvas with placeholder avatars/initials to indicate where realtime presence will go later. Hard-code two or three fake participants for now.

7. **Basic theming and motion**

   * Add a tiny motion touch (e.g., the panel glides in on mount) using Framer Motion.
   * Keep color and spacing consistent with the template; ensure the canvas fills available space and resizes correctly.

8. **Validation and performance check**

   * Run the dev server and visit `/room/test`.
   * Confirm: the canvas renders, you can orbit smoothly, and FPS feels solid; the panel and presence strip are visible and responsive.
   * Test at two viewport widths (mobile and desktop) to verify the layout behaves.

## Files to create or adjust (by intent, not code)

* Landing page file for `/` with a simple input + button that routes to `/room/[slug]`.
* Room page file for `/room/[slug]` that composes:

  * `Scene` component (Canvas + orbit controls + placeholder points).
  * `ControlPanel` component (UI stub).
  * `PresenceStrip` component (UI stub).
* A lightweight layout wrapper (if the template doesn’t already provide one) to manage a split view: large canvas area and a right panel.

## Definition of done (acceptance criteria)

* Visiting `/` shows a room input and a button; submitting navigates to `/room/<your-slug>`.
* Visiting `/room/test` renders a smooth, interactive 3D particle cloud with orbit controls.
* A right-side control panel and a presence strip are visible, responsive, and styled simply but cleanly.
* No audio, no realtime, no database calls yet; zero console errors; steady performance on a typical laptop.

## Out of scope for this step

* Microphone access, FFT, or any audio mapping.
* Supabase Realtime (presence/broadcast) or Postgres reads/writes.
* Preset saving/loading.
* Shader effects or post-processing (we can add later if perf allows).