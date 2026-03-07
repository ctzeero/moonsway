/**
 * Spotify import store.
 *
 * State machine for the Spotify → TIDAL import flow:
 *   idle → connecting → picking → importing → done
 *
 * ISRC matching: for each Spotify track, search TIDAL by ISRC.
 * Matched tracks are saved as a Moonsway playlist in the library store.
 * Unmatched tracks are surfaced for manual search.
 */

import { create } from "zustand";
import {
  loadSpotifyToken,
  clearSpotifyToken,
  fetchSpotifyPlaylists,
  fetchPlaylistTracks,
  fetchSpotifyUser,
  type SpotifyPlaylist,
  type SpotifyTrack,
} from "@/lib/spotify";
import { searchTracks } from "@/lib/api/tidal";
import { useLibraryStore } from "@/stores/library-store";
import type { Track } from "@/types/music";

// -- Types --

export type ImportStep = "idle" | "connecting" | "picking" | "importing" | "done";

export interface ImportedPlaylist {
  spotifyId: string;
  name: string;
  coverUrl: string;
  localPlaylistId: string | null;
  matched: Track[];
  unmatched: UnmatchedTrack[];
}

export interface UnmatchedTrack {
  spotifyId: string;
  name: string;
  artist: string;
  album: string;
  isrc?: string;
}

export interface ImportProgress {
  playlistName: string;
  playlistIndex: number;
  playlistTotal: number;
  trackIndex: number;
  trackTotal: number;
}

interface SpotifyState {
  step: ImportStep;
  token: string | null;
  spotifyUser: { id: string; display_name: string } | null;
  playlists: SpotifyPlaylist[];
  selectedIds: Set<string>;
  progress: ImportProgress | null;
  results: ImportedPlaylist[];
  error: string | null;

  // Actions
  connect: (token: string) => Promise<void>;
  disconnect: () => void;
  togglePlaylist: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  startImport: () => Promise<void>;
  cancelImport: () => void;
  reset: () => void;
  clearError: () => void;
}

const INITIAL_STATE = {
  step: "idle" as ImportStep,
  token: loadSpotifyToken(),
  spotifyUser: null,
  playlists: [],
  selectedIds: new Set<string>(),
  progress: null,
  results: [],
  error: null,
};

// Held outside Zustand state so it doesn't trigger re-renders
let importController: AbortController | null = null;

export const useSpotifyStore = create<SpotifyState>((set, get) => ({
  ...INITIAL_STATE,

  connect: async (token: string) => {
    set({ step: "connecting", token, error: null });
    try {
      const [user, playlists] = await Promise.all([
        fetchSpotifyUser(token),
        fetchSpotifyPlaylists(token),
      ]);
      set({ step: "picking", spotifyUser: user, playlists });
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "Failed to connect to Spotify.";
      if (msg === "spotify/unauthorized") {
        clearSpotifyToken();
        set({ ...INITIAL_STATE, error: "Spotify session expired. Please reconnect." });
      } else {
        set({ step: "idle", error: msg });
      }
    }
  },

  disconnect: () => {
    clearSpotifyToken();
    set({ ...INITIAL_STATE, token: null });
  },

  togglePlaylist: (id: string) => {
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    });
  },

  selectAll: () => {
    set((state) => ({
      selectedIds: new Set(state.playlists.map((p) => p.id)),
    }));
  },

  deselectAll: () => set({ selectedIds: new Set() }),

  cancelImport: () => {
    importController?.abort();
    importController = null;
    set({ step: "picking", progress: null, error: null });
  },

  startImport: async () => {
    const { token, playlists, selectedIds } = get();
    if (!token) return;

    const selected = playlists.filter((p) => selectedIds.has(p.id));
    if (selected.length === 0) return;

    importController = new AbortController();
    const { signal } = importController;

    set({ step: "importing", results: [], error: null });

    const results: ImportedPlaylist[] = [];
    for (let pi = 0; pi < selected.length; pi++) {
      const playlist = selected[pi];

      set({
        progress: {
          playlistName: playlist.name,
          playlistIndex: pi + 1,
          playlistTotal: selected.length,
          trackIndex: 0,
          trackTotal: playlist.items?.total ?? 0,
        },
      });

      if (signal.aborted) break;

      try {
        const rawTracks = await fetchPlaylistTracks(playlist.id, token);

        console.log(`[spotify] Fetching playlist tracks for ${playlist.name} (${playlist.id})`);
        // js-combine-iterations: single pass instead of .map().filter()
        // Use `item` (current) with `track` as deprecated fallback
        const tracks: SpotifyTrack[] = [];
        for (const pt of rawTracks) {
          if (pt.is_local) continue; // skip local files — no ISRC, can't match
          const t = pt.item ?? pt.track;
          if (t && t.id) tracks.push(t);
        }

        const matched: Track[] = [];
        const unmatched: UnmatchedTrack[] = [];

        // rerender-use-ref-transient-values: throttle progress updates to ~10fps
        // to avoid a set() call per track (potentially hundreds of re-renders)
        let lastProgressUpdate = 0;

        for (let ti = 0; ti < tracks.length; ti++) {
          const track = tracks[ti];

          const now = Date.now();
          if (now - lastProgressUpdate > 100) {
            lastProgressUpdate = now;
            set((state) => ({
              progress: state.progress
                ? { ...state.progress, trackIndex: ti + 1, trackTotal: tracks.length }
                : null,
            }));
          }

          // Stop immediately if the user cancelled
          if (signal.aborted) break;

          const isrc = track.external_ids?.isrc;
          let tidalTrack: Track | null = null;

          if (isrc) {
            try {
              // Search TIDAL by ISRC — most reliable cross-service identifier
              const result = await searchTracks(`isrc:${isrc}`, { signal });
              tidalTrack = result.items[0] ?? null;

              // Fallback: search by title + artist if ISRC gives no result
              if (!tidalTrack) {
                const fallback = await searchTracks(
                  `${track.name} ${track.artists[0]?.name ?? ""}`,
                  { signal }
                );
                tidalTrack = fallback.items[0] ?? null;
              }
            } catch (e) {
              if ((e as Error).name === "AbortError") break;
              // Other TIDAL lookup failure — treat as unmatched
            }
          } else {
            // No ISRC — search by title + artist
            try {
              const fallback = await searchTracks(
                `${track.name} ${track.artists[0]?.name ?? ""}`,
                { signal }
              );
              tidalTrack = fallback.items[0] ?? null;
            } catch (e) {
              if ((e as Error).name === "AbortError") break;
            }
          }

          if (tidalTrack) {
            matched.push(tidalTrack);
          } else {
            unmatched.push({
              spotifyId: track.id,
              name: track.name,
              artist: track.artists.map((a) => a.name).join(", "),
              album: track.album.name,
              isrc,
            });
          }
        }

        const localPlaylistId = useLibraryStore
          .getState()
          .importPlaylist(playlist.name, matched);

        results.push({
          spotifyId: playlist.id,
          name: playlist.name,
          coverUrl: playlist.images[0]?.url ?? "",
          localPlaylistId,
          matched,
          unmatched,
        });
      } catch (err: unknown) {
        const msg = (err as Error).message ?? "Import failed.";
        if (msg === "spotify/unauthorized") {
          clearSpotifyToken();
          set({ ...INITIAL_STATE, token: null, error: "Spotify session expired." });
          return;
        }
        // Skip failed playlist, continue with rest
        results.push({
          spotifyId: playlist.id,
          name: playlist.name,
          coverUrl: playlist.images[0]?.url ?? "",
          localPlaylistId: null,
          matched: [],
          unmatched: [],
        });
      }
    }

    importController = null;
    useLibraryStore.getState().setActiveTab("playlists");
    set({ step: "done", results, progress: null });
  },

  reset: () => set({ step: "picking", results: [], progress: null, error: null }),

  clearError: () => set({ error: null }),
}));

// advanced-init-once: guard against re-running on HMR hot reloads in dev
let didAutoConnect = false;
const storedToken = loadSpotifyToken();
if (storedToken && !didAutoConnect) {
  didAutoConnect = true;
  useSpotifyStore.getState().connect(storedToken);
}
