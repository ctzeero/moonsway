# Moonsway

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="./src/assets/icons/moonsway.png">
    <img
      src="./src/assets/icons/moonsway.png"
      alt="Moonsway logo"
      width="96"
    >
  </picture>
</p>

<p align="center">
  Lightweight lossless music streaming app built with Tauri, React, and Bun.
</p>

Moonsway is a music streaming app focused on fast discovery, high-quality playback, and a local-first library experience. It uses a React frontend inside a Tauri shell, plays music through community TIDAL proxy instances, bundles a PocketBase sidecar, and can import Spotify playlists into local Moonsway playlists.

## Features

- Search tracks, albums, artists, and playlists
- Play lossless streams with queue, shuffle, repeat, seek, volume, and media session support
- Save favorite tracks, albums, and artists
- Create and manage local playlists
- Keep recent listening history and player preferences in local storage
- Import Spotify playlists with PKCE OAuth and match tracks to TIDAL by ISRC with title/artist fallback
- Optional Google sign-in via Firebase
- Bundled PocketBase sidecar started automatically by the Tauri app
- Multi-instance API failover for TIDAL metadata and stream endpoints

## Stack

- Tauri v2 + Rust
- React 19 + React Router 7
- Vite 7
- Zustand
- Tailwind CSS v4
- PocketBase sidecar
- Firebase Auth
- Spotify Web API

## Current Status

Moonsway is usable as a local-first desktop app today.

- Library data, playlists, history, and player state are currently persisted in `localStorage`
- PocketBase is bundled and started automatically on `127.0.0.1:8090`, but the main library flow is not fully synced through PocketBase yet
- Spotify import and Firebase auth are optional integrations
- The repository currently includes a PocketBase sidecar binary for `aarch64-apple-darwin`, so Apple Silicon macOS is the out-of-the-box target right now

## Getting Started

### Prerequisites

- [Bun](https://bun.sh)
- Rust toolchain
- Tauri system dependencies for your platform

### Install

```bash
bun install
cp .env.example .env
```

### Configure Environment

Only Spotify and Firebase need environment values. TIDAL requests use built-in community proxy instance lists.

```env
TAURI_DEV_HOST=127.0.0.1
VITE_DEBUG_TIDAL=false

VITE_SPOTIFY_CLIENT_ID=
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:1420/spotify

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

Notes:

- Spotify import works only when `VITE_SPOTIFY_CLIENT_ID` is set
- In the Spotify dashboard, add `http://127.0.0.1:1420/spotify` as a redirect URI for local development
- Google sign-in appears only when the Firebase config is valid

### Run In Development

```bash
bun run tauri:dev
```

This starts the Vite frontend and launches the Tauri desktop app. In development, the frontend runs at `http://127.0.0.1:1420`.

### Build

```bash
bun run build
bun run tauri build
```

## Available Scripts

- `bun run dev` - start the Vite frontend only
- `bun run build` - type-check and build the frontend
- `bun run lint` - run ESLint
- `bun run preview` - preview the built frontend
- `bun run tauri:dev` - run the desktop app in development
- `bun run tauri build` - create a desktop build

## Notes

- This project currently depends on public community TIDAL proxy instances

