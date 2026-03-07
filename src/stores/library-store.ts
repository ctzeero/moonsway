/**
 * Library store -- persists favorites and history locally via localStorage.
 *
 * Stores favorite tracks, albums, and artists, plus a play history log.
 * When PocketBase auth is wired up, this store can sync to the server.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Track, Album, ArtistMinified, Playlist, PlaylistTrack } from "@/types/music";

export type LibraryTab = "tracks" | "albums" | "artists" | "playlists" | "history";

interface LibraryState {
  activeTab: LibraryTab;
  lastOpenedPlaylistId: string | null;
  favoriteTracks: Track[];
  favoriteAlbums: Album[];
  favoriteArtists: ArtistMinified[];
  playlists: Playlist[];
  history: Track[];
}

interface LibraryActions {
  setActiveTab: (tab: LibraryTab) => void;
  setLastOpenedPlaylistId: (playlistId: string | null) => void;
  addFavoriteTrack: (track: Track) => void;
  addFavoriteTracks: (tracks: Track[]) => void;
  toggleFavoriteTrack: (track: Track) => void;
  toggleFavoriteAlbum: (album: Album) => void;
  toggleFavoriteArtist: (artist: ArtistMinified) => void;
  isTrackFavorited: (id: string) => boolean;
  isAlbumFavorited: (id: string) => boolean;
  isArtistFavorited: (id: string) => boolean;
  createPlaylist: (name: string) => string | null;
  importPlaylist: (name: string, tracks: Track[]) => string | null;
  renamePlaylist: (playlistId: string, name: string) => void;
  deletePlaylist: (playlistId: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  addToHistory: (track: Track) => void;
  clearHistory: () => void;
}

const MAX_HISTORY = 100;

function toPlaylistTrack(track: Track): PlaylistTrack {
  return {
    ...track,
    addedToPlaylistAt: new Date().toISOString(),
  };
}

export const useLibraryStore = create<LibraryState & LibraryActions>()(
  persist(
    (set, get) => ({
      activeTab: "tracks",
      lastOpenedPlaylistId: null,
      favoriteTracks: [],
      favoriteAlbums: [],
      favoriteArtists: [],
      playlists: [],
      history: [],

      setActiveTab(tab) {
        set({ activeTab: tab });
      },

      setLastOpenedPlaylistId(playlistId) {
        set({ lastOpenedPlaylistId: playlistId });
      },

      addFavoriteTrack(track) {
        const state = get();
        if (state.favoriteTracks.some((t) => t.id === track.id)) return;
        set({ favoriteTracks: [track, ...state.favoriteTracks] });
      },

      addFavoriteTracks(tracks) {
        if (tracks.length === 0) return;

        const state = get();
        const existingIds = new Set(state.favoriteTracks.map((track) => track.id));
        const freshTracks: Track[] = [];

        for (const track of tracks) {
          if (existingIds.has(track.id)) continue;
          existingIds.add(track.id);
          freshTracks.push(track);
        }

        if (freshTracks.length === 0) return;
        set({ favoriteTracks: [...freshTracks, ...state.favoriteTracks] });
      },

      toggleFavoriteTrack(track) {
        const state = get();
        const exists = state.favoriteTracks.some((t) => t.id === track.id);
        if (exists) {
          set({
            favoriteTracks: state.favoriteTracks.filter((t) => t.id !== track.id),
          });
        } else {
          set({ favoriteTracks: [track, ...state.favoriteTracks] });
        }
      },

      toggleFavoriteAlbum(album) {
        const state = get();
        const exists = state.favoriteAlbums.some((a) => a.id === album.id);
        if (exists) {
          set({
            favoriteAlbums: state.favoriteAlbums.filter((a) => a.id !== album.id),
          });
        } else {
          set({ favoriteAlbums: [album, ...state.favoriteAlbums] });
        }
      },

      toggleFavoriteArtist(artist) {
        const state = get();
        const exists = state.favoriteArtists.some((a) => a.id === artist.id);
        if (exists) {
          set({
            favoriteArtists: state.favoriteArtists.filter(
              (a) => a.id !== artist.id
            ),
          });
        } else {
          set({ favoriteArtists: [artist, ...state.favoriteArtists] });
        }
      },

      isTrackFavorited(id) {
        return get().favoriteTracks.some((t) => t.id === id);
      },

      isAlbumFavorited(id) {
        return get().favoriteAlbums.some((a) => a.id === id);
      },

      isArtistFavorited(id) {
        return get().favoriteArtists.some((a) => a.id === id);
      },

      createPlaylist(name) {
        const trimmedName = name.trim();
        if (!trimmedName) return null;

        const now = new Date().toISOString();
        const playlistId = `local-${crypto.randomUUID()}`;
        const playlist: Playlist = {
          id: playlistId,
          name: trimmedName,
          tracks: [],
          isPublic: false,
          numberOfTracks: 0,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          lastOpenedPlaylistId: playlistId,
          playlists: [playlist, ...state.playlists],
        }));

        return playlistId;
      },

      importPlaylist(name, tracks) {
        const trimmedName = name.trim();
        if (!trimmedName) return null;

        const now = new Date().toISOString();
        const playlistId = `local-${crypto.randomUUID()}`;
        const playlistTracks = tracks.map((track) => toPlaylistTrack(track));
        const playlist: Playlist = {
          id: playlistId,
          name: trimmedName,
          tracks: playlistTracks,
          isPublic: false,
          numberOfTracks: playlistTracks.length,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          lastOpenedPlaylistId: playlistId,
          playlists: [playlist, ...state.playlists],
        }));

        return playlistId;
      },

      renamePlaylist(playlistId, name) {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        set((state) => ({
          playlists: state.playlists.map((playlist) =>
            playlist.id === playlistId
              ? {
                  ...playlist,
                  name: trimmedName,
                  updatedAt: new Date().toISOString(),
                }
              : playlist
          ),
        }));
      },

      deletePlaylist(playlistId) {
        set((state) => ({
          lastOpenedPlaylistId:
            state.lastOpenedPlaylistId === playlistId
              ? null
              : state.lastOpenedPlaylistId,
          playlists: state.playlists.filter((playlist) => playlist.id !== playlistId),
        }));
      },

      addTrackToPlaylist(playlistId, track) {
        set((state) => ({
          playlists: state.playlists.map((playlist) => {
            if (playlist.id !== playlistId) return playlist;
            if (playlist.tracks.some((item) => item.id === track.id)) return playlist;

            const tracks = [toPlaylistTrack(track), ...playlist.tracks];
            return {
              ...playlist,
              tracks,
              numberOfTracks: tracks.length,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      removeTrackFromPlaylist(playlistId, trackId) {
        set((state) => ({
          playlists: state.playlists.map((playlist) => {
            if (playlist.id !== playlistId) return playlist;

            const tracks = playlist.tracks.filter((track) => track.id !== trackId);
            if (tracks.length === playlist.tracks.length) return playlist;

            return {
              ...playlist,
              tracks,
              numberOfTracks: tracks.length,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      addToHistory(track) {
        const state = get();
        const filtered = state.history.filter((t) => t.id !== track.id);
        const updated = [track, ...filtered].slice(0, MAX_HISTORY);
        set({ history: updated });
      },

      clearHistory() {
        set({ history: [] });
      },
    }),
    {
      name: "moonsway-library",
    }
  )
);
