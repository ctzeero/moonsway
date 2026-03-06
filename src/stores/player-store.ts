/**
 * Player store -- Zustand state for audio playback, queue, and controls.
 *
 * A single HTMLAudioElement is created at module level and managed
 * entirely through the store's actions. React components subscribe
 * via `usePlayerStore()`.
 */

import { create } from "zustand";
import { getStreamUrl, getCoverUrl } from "@/lib/api/music-api";
import { useLibraryStore } from "./library-store";
import type { Track, StreamQuality } from "@/types/music";

// -- Types --

export type RepeatMode = "off" | "all" | "one";

interface PersistedPlayerState {
  version: number;
  currentTrackId: string | null;
  queueTrackIds: string[];
  currentIndex: number;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  quality: StreamQuality;
  repeatMode: RepeatMode;
}

interface PlayerState {
  // Queue
  queue: Track[];
  shuffledQueue: Track[];
  originalQueue: Track[];
  currentIndex: number;
  shuffleActive: boolean;
  repeatMode: RepeatMode;

  // Current track
  currentTrack: Track | null;
  streamUrl: string | null;
  streamQuality: StreamQuality | null;

  // Playback
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  currentTime: number;

  // Volume
  volume: number;
  isMuted: boolean;

  // Quality
  quality: StreamQuality;
}

interface PlayerActions {
  // Playback
  playTrack: (track: Track, queue?: Track[]) => Promise<void>;
  playQueue: (tracks: Track[], startIndex?: number) => Promise<void>;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrev: () => void;
  seek: (time: number) => void;

  // Volume
  setVolume: (vol: number) => void;
  toggleMute: () => void;

  // Queue
  addToQueue: (tracks: Track[]) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;

  // Shuffle / Repeat
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}

// -- Audio element (singleton) --

const audio = new Audio();
audio.preload = "auto";
let activeLoadRequestId = 0;

// -- Shuffle utility --

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const PLAYER_STORAGE_KEY = "moonsway-player-state";
const CURRENT_VERSION = 1;
const MAX_QUEUE_SIZE = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stopAudioPlayback(): void {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

function readPersistedPlayerState(): PersistedPlayerState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedPlayerState>;

    // Migration: discard old versions
    if (!parsed.version || parsed.version < CURRENT_VERSION) {
      localStorage.removeItem(PLAYER_STORAGE_KEY);
      return null;
    }

    return {
      version: CURRENT_VERSION,
      currentTrackId: typeof parsed.currentTrackId === "string" ? parsed.currentTrackId : null,
      queueTrackIds: Array.isArray(parsed.queueTrackIds) ? parsed.queueTrackIds : [],
      currentIndex:
        typeof parsed.currentIndex === "number" ? parsed.currentIndex : -1,
      currentTime: typeof parsed.currentTime === "number" ? parsed.currentTime : 0,
      volume:
        typeof parsed.volume === "number" ? clamp(parsed.volume, 0, 1) : 1,
      isMuted: Boolean(parsed.isMuted),
      quality:
        parsed.quality === "HI_RES_LOSSLESS" ||
        parsed.quality === "LOSSLESS" ||
        parsed.quality === "HIGH" ||
        parsed.quality === "LOW"
          ? parsed.quality
          : "HI_RES_LOSSLESS",
      repeatMode:
        parsed.repeatMode === "off" ||
        parsed.repeatMode === "all" ||
        parsed.repeatMode === "one"
          ? parsed.repeatMode
          : "off",
    };
  } catch {
    return null;
  }
}

function writePersistedPlayerState(state: PersistedPlayerState): void {
  if (typeof window === "undefined") return;
  try {
    const limitedState: PersistedPlayerState = {
      ...state,
      queueTrackIds: state.queueTrackIds.slice(0, MAX_QUEUE_SIZE),
    };
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(limitedState));
  } catch {
    // Ignore storage failures (private mode/quota)
  }
}

// -- Store --

export const usePlayerStore = create<PlayerState & PlayerActions>()(
  (set, get) => {
    const persisted = readPersistedPlayerState();
    
    // Note: We don't hydrate tracks from IDs on init to avoid blocking startup.
    // The app will start with empty state, and users can resume by playing a track.
    // Future enhancement: fetch tracks by IDs in background after hydration.
    
    const hydratedVolume = persisted?.volume ?? 1;
    const hydratedMuted = persisted?.isMuted ?? false;
    const hydratedQuality = persisted?.quality ?? "HI_RES_LOSSLESS";
    const hydratedRepeatMode = persisted?.repeatMode ?? "off";

    audio.volume = hydratedMuted ? 0 : hydratedVolume;

    let pendingPersist: ReturnType<typeof setTimeout> | null = null;

    function persistPlayerState(force = false): void {
      if (force) {
        if (pendingPersist) {
          clearTimeout(pendingPersist);
          pendingPersist = null;
        }
        const state = get();
        writePersistedPlayerState({
          version: CURRENT_VERSION,
          currentTrackId: state.currentTrack?.id ?? null,
          queueTrackIds: state.queue.map((t) => t.id),
          currentIndex: state.currentIndex,
          currentTime: state.currentTime,
          volume: state.volume,
          isMuted: state.isMuted,
          quality: state.quality,
          repeatMode: state.repeatMode,
        });
        return;
      }

      if (pendingPersist) return;

      pendingPersist = setTimeout(() => {
        const state = get();
        writePersistedPlayerState({
          version: CURRENT_VERSION,
          currentTrackId: state.currentTrack?.id ?? null,
          queueTrackIds: state.queue.map((t) => t.id),
          currentIndex: state.currentIndex,
          currentTime: state.currentTime,
          volume: state.volume,
          isMuted: state.isMuted,
          quality: state.quality,
          repeatMode: state.repeatMode,
        });
        pendingPersist = null;
      }, 1000);
    }

    // -- Internal helpers --

    function activeQueue(): Track[] {
      const state = get();
      return state.shuffleActive ? state.shuffledQueue : state.queue;
    }

    async function loadAndPlay(track: Track, startAt = 0): Promise<void> {
      const requestId = ++activeLoadRequestId;

      stopAudioPlayback();
      set({
        isLoading: true,
        isPlaying: false,
        currentTrack: track,
        streamUrl: null,
        streamQuality: get().quality,
        duration: 0,
        currentTime: Math.max(0, startAt),
      });
      persistPlayerState(true);

      useLibraryStore.getState().addToHistory(track);

      document.title = `${track.title} - ${track.artist.name} | Moonsway`;

      // Update Media Session
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist.name,
          album: track.album?.title ?? "",
          artwork: track.album?.cover
            ? [
                { src: getCoverUrl(track.album.cover, "96"), sizes: "96x96" },
                { src: getCoverUrl(track.album.cover, "320"), sizes: "320x320" },
                { src: getCoverUrl(track.album.cover, "640"), sizes: "640x640" },
              ]
            : [],
        });
      }

      try {
        const url = await getStreamUrl(track.id, get().quality);
        if (requestId !== activeLoadRequestId) return;

        audio.src = url;
        audio.load();
        set({ streamUrl: url, streamQuality: get().quality });

        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => {
            if (requestId !== activeLoadRequestId) {
              cleanup();
              reject(new Error("stale-load"));
              return;
            }
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error("Audio load error"));
          };
          const cleanup = () => {
            audio.removeEventListener("canplay", onCanPlay);
            audio.removeEventListener("error", onError);
          };
          audio.addEventListener("canplay", onCanPlay, { once: true });
          audio.addEventListener("error", onError, { once: true });
        });
        if (requestId !== activeLoadRequestId) return;

        if (startAt > 0) {
          const safeStartAt =
            Number.isFinite(audio.duration) && audio.duration > 0
              ? clamp(startAt, 0, Math.max(audio.duration - 0.25, 0))
              : Math.max(0, startAt);
          audio.currentTime = safeStartAt;
          set({ currentTime: safeStartAt });
        }

        await audio.play();
        if (requestId !== activeLoadRequestId) {
          stopAudioPlayback();
          return;
        }
        set({ isPlaying: true, isLoading: false });
        persistPlayerState(true);
      } catch (error) {
        if (requestId !== activeLoadRequestId) return;

        console.error("[Player] Failed to play track:", error);
        set({ isLoading: false, isPlaying: false });
        persistPlayerState(true);

        // Try fallback to LOSSLESS if hi-res failed
        const state = get();
        if (
          state.quality === "HI_RES_LOSSLESS" &&
          error instanceof Error &&
          error.message !== "stale-load"
        ) {
          try {
            const url = await getStreamUrl(track.id, "LOSSLESS");
            if (requestId !== activeLoadRequestId) return;

            audio.src = url;
            audio.load();
            set({ streamUrl: url, streamQuality: "LOSSLESS" });
            if (startAt > 0) {
              audio.currentTime = Math.max(0, startAt);
              set({ currentTime: Math.max(0, startAt) });
            }
            await audio.play();
            if (requestId !== activeLoadRequestId) {
              stopAudioPlayback();
              return;
            }
            set({ isPlaying: true, isLoading: false });
            persistPlayerState(true);
          } catch {
            console.error("[Player] Fallback to LOSSLESS also failed");
          }
        }
      }
    }

    // -- Wire audio element events --

    audio.addEventListener("timeupdate", () => {
      set({ currentTime: audio.currentTime });
      // Don't persist on timeupdate - too frequent, let other events handle it
    });

    audio.addEventListener("loadedmetadata", () => {
      set({ duration: audio.duration });
    });

    audio.addEventListener("ended", () => {
      get().playNext();
    });

    audio.addEventListener("play", () => {
      set({ isPlaying: true });
    });

    audio.addEventListener("pause", () => {
      set({ isPlaying: false });
      persistPlayerState(true); // Persist position when pausing
    });

    // -- Media Session controls --

    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => get().togglePlayPause());
      navigator.mediaSession.setActionHandler("pause", () => get().togglePlayPause());
      navigator.mediaSession.setActionHandler("previoustrack", () => get().playPrev());
      navigator.mediaSession.setActionHandler("nexttrack", () => get().playNext());
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime != null) get().seek(details.seekTime);
      });
    }

    if (typeof window !== "undefined") {
      // More reliable than beforeunload
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          persistPlayerState(true);
        }
      });

      // Fallback for older browsers
      window.addEventListener("beforeunload", () => {
        persistPlayerState(true);
      });
    }

    // -- Initial state --

    return {
      queue: [],
      shuffledQueue: [],
      originalQueue: [],
      currentIndex: -1,
      shuffleActive: false,
      repeatMode: hydratedRepeatMode,

      currentTrack: null,
      streamUrl: null,
      streamQuality: null,

      isPlaying: false,
      isLoading: false,
      duration: 0,
      currentTime: 0,

      volume: hydratedVolume,
      isMuted: hydratedMuted,

      quality: hydratedQuality,

      // -- Actions --

      async playTrack(track, queue) {
        const newQueue = queue ?? [track];
        const index = queue ? newQueue.findIndex((t) => t.id === track.id) : 0;

        set({
          queue: newQueue,
          originalQueue: newQueue,
          shuffledQueue: [],
          shuffleActive: false,
          currentIndex: index >= 0 ? index : 0,
        });
        persistPlayerState(true);

        await loadAndPlay(track);
      },

      async playQueue(tracks, startIndex = 0) {
        if (tracks.length === 0) return;

        const idx = Math.min(startIndex, tracks.length - 1);
        set({
          queue: tracks,
          originalQueue: tracks,
          shuffledQueue: [],
          shuffleActive: false,
          currentIndex: idx,
        });
        persistPlayerState(true);

        await loadAndPlay(tracks[idx]);
      },

      togglePlayPause() {
        const state = get();
        if (!audio.src && state.currentTrack) {
          void loadAndPlay(state.currentTrack, state.currentTime);
          return;
        }

        if (audio.src) {
          if (audio.paused) {
            void audio.play();
          } else {
            audio.pause();
          }
        }
      },

      playNext() {
        const state = get();
        const q = activeQueue();
        if (q.length === 0) return;

        if (state.repeatMode === "one") {
          audio.currentTime = 0;
          audio.play();
          return;
        }

        let nextIndex = state.currentIndex + 1;

        if (nextIndex >= q.length) {
          if (state.repeatMode === "all") {
            nextIndex = 0;
          } else {
            // End of queue, no repeat
            set({ isPlaying: false, currentTime: 0 });
            audio.pause();
            audio.currentTime = 0;
            document.title = "Moonsway";
            persistPlayerState(true);
            return;
          }
        }

        set({ currentIndex: nextIndex });
        persistPlayerState(true);
        void loadAndPlay(q[nextIndex]);
      },

      playPrev() {
        // If more than 3 seconds in, restart current track
        if (audio.currentTime > 3) {
          audio.currentTime = 0;
          return;
        }

        const state = get();
        const q = activeQueue();
        if (q.length === 0) return;

        let prevIndex = state.currentIndex - 1;
        if (prevIndex < 0) {
          if (state.repeatMode === "all") {
            prevIndex = q.length - 1;
          } else {
            prevIndex = 0;
          }
        }

        set({ currentIndex: prevIndex });
        persistPlayerState(true);
        void loadAndPlay(q[prevIndex]);
      },

      seek(time) {
        const state = get();
        const max = state.duration > 0 ? state.duration : Number.POSITIVE_INFINITY;
        const clamped = clamp(time, 0, max);
        audio.currentTime = clamped;
        set({ currentTime: clamped });
        persistPlayerState(true);
      },

      setVolume(vol) {
        const clamped = Math.max(0, Math.min(1, vol));
        audio.volume = clamped;
        set({ volume: clamped, isMuted: clamped === 0 });
        persistPlayerState(true);
      },

      toggleMute() {
        const state = get();
        if (state.isMuted) {
          audio.volume = state.volume > 0 ? state.volume : 0.5;
          set({ isMuted: false, volume: audio.volume });
        } else {
          audio.volume = 0;
          set({ isMuted: true });
        }
        persistPlayerState(true);
      },

      addToQueue(tracks) {
        const state = get();
        const newQueue = [...state.queue, ...tracks];
        set({ queue: newQueue, originalQueue: newQueue });
        persistPlayerState(true);

        if (state.shuffleActive) {
          set({ shuffledQueue: [...state.shuffledQueue, ...tracks] });
        }

        // If nothing is playing, start
        if (!state.currentTrack && tracks.length > 0) {
          set({ currentIndex: newQueue.length - tracks.length });
          void loadAndPlay(tracks[0]);
        }
      },

      removeFromQueue(index) {
        const state = get();
        const q = [...state.queue];
        q.splice(index, 1);

        let newIndex = state.currentIndex;
        if (index < newIndex) {
          newIndex--;
        } else if (index === newIndex) {
          newIndex = Math.min(newIndex, q.length - 1);
        }

        set({ queue: q, originalQueue: q, currentIndex: newIndex });
        persistPlayerState(true);
      },

      clearQueue() {
        activeLoadRequestId++;
        audio.pause();
        audio.src = "";
        set({
          queue: [],
          shuffledQueue: [],
          originalQueue: [],
          currentIndex: -1,
          currentTrack: null,
          streamUrl: null,
          streamQuality: null,
          isPlaying: false,
          currentTime: 0,
          duration: 0,
        });
        document.title = "Moonsway";
        persistPlayerState(true);
      },

      toggleShuffle() {
        const state = get();
        if (state.shuffleActive) {
          // Turn off -- restore original order, find current track
          const currentTrack = state.currentTrack;
          const originalIndex = currentTrack
            ? state.originalQueue.findIndex((t) => t.id === currentTrack.id)
            : 0;
          set({
            shuffleActive: false,
            queue: state.originalQueue,
            shuffledQueue: [],
            currentIndex: originalIndex >= 0 ? originalIndex : 0,
          });
        } else {
          // Turn on -- shuffle, keep current track first
          const q = state.queue;
          const current = q[state.currentIndex];
          const rest = q.filter((_, i) => i !== state.currentIndex);
          const shuffled = current ? [current, ...shuffleArray(rest)] : shuffleArray(q);

          set({
            shuffleActive: true,
            originalQueue: [...q],
            shuffledQueue: shuffled,
            currentIndex: 0,
          });
        }
        persistPlayerState(true);
      },

      cycleRepeat() {
        const state = get();
        const modes: RepeatMode[] = ["off", "all", "one"];
        const currentIdx = modes.indexOf(state.repeatMode);
        const next = modes[(currentIdx + 1) % modes.length];
        set({ repeatMode: next });
        persistPlayerState(true);
      },
    };
  }
);
