/**
 * Library store -- persists favorites and history locally via localStorage.
 *
 * Stores favorite tracks, albums, and artists, plus a play history log.
 * When PocketBase auth is wired up, this store can sync to the server.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Track, Album, ArtistMinified } from "@/types/music";

interface LibraryState {
  favoriteTracks: Track[];
  favoriteAlbums: Album[];
  favoriteArtists: ArtistMinified[];
  history: Track[];
}

interface LibraryActions {
  addFavoriteTrack: (track: Track) => void;
  addFavoriteTracks: (tracks: Track[]) => void;
  toggleFavoriteTrack: (track: Track) => void;
  toggleFavoriteAlbum: (album: Album) => void;
  toggleFavoriteArtist: (artist: ArtistMinified) => void;
  isTrackFavorited: (id: string) => boolean;
  isAlbumFavorited: (id: string) => boolean;
  isArtistFavorited: (id: string) => boolean;
  addToHistory: (track: Track) => void;
  clearHistory: () => void;
}

const MAX_HISTORY = 100;

export const useLibraryStore = create<LibraryState & LibraryActions>()(
  persist(
    (set, get) => ({
      favoriteTracks: [],
      favoriteAlbums: [],
      favoriteArtists: [],
      history: [],

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
