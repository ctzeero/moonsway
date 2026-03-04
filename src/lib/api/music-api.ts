/**
 * Music API facade -- TIDAL only.
 *
 * Integrates with the CacheManager for all metadata calls.
 * Stream URLs use a separate in-memory cache (short-lived).
 */

import * as tidal from "./tidal";
import { cache } from "@/lib/cache";
import type {
  Track,
  Album,
  ArtistMinified,
  SearchResult,
  StreamQuality,
} from "@/types/music";

// In-memory stream URL cache (separate from API cache, shorter-lived)
const streamCache = new Map<string, string>();
const MAX_STREAM_CACHE = 50;

function pruneStreamCache(): void {
  if (streamCache.size > MAX_STREAM_CACHE) {
    const entries = Array.from(streamCache.keys());
    const toDelete = entries.slice(0, entries.length - MAX_STREAM_CACHE);
    toDelete.forEach((key) => streamCache.delete(key));
  }
}

// -- Search --

export async function searchTracks(
  query: string,
  signal?: AbortSignal
): Promise<SearchResult<Track>> {
  const cached = await cache.get<SearchResult<Track>>("search_tracks", query);
  if (cached) return cached;

  const result = await tidal.searchTracks(query, { signal });
  await cache.set("search_tracks", query, result);
  return result;
}

export async function searchAlbums(
  query: string,
  signal?: AbortSignal
): Promise<SearchResult<Album>> {
  const cached = await cache.get<SearchResult<Album>>("search_albums", query);
  if (cached) return cached;

  const result = await tidal.searchAlbums(query, signal);
  await cache.set("search_albums", query, result);
  return result;
}

export async function searchArtists(
  query: string,
  signal?: AbortSignal
): Promise<SearchResult<ArtistMinified>> {
  const cached = await cache.get<SearchResult<ArtistMinified>>(
    "search_artists",
    query
  );
  if (cached) return cached;

  const result = await tidal.searchArtists(query, signal);
  await cache.set("search_artists", query, result);
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function searchPlaylists(
  query: string,
  signal?: AbortSignal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<SearchResult<any>> {
  const cached = await cache.get("search_playlists", query);
  if (cached) return cached as SearchResult<unknown>;

  const result = await tidal.searchPlaylists(query, signal);
  await cache.set("search_playlists", query, result);
  return result;
}

// -- Get by ID --

export async function getAlbum(
  id: string,
  signal?: AbortSignal
): Promise<{ album: Album; tracks: Track[] }> {
  const cached = await cache.get<{ album: Album; tracks: Track[] }>(
    "album",
    id
  );
  if (cached) return cached;

  const result = await tidal.getAlbum(id, signal);
  await cache.set("album", id, result);
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getArtist(id: string, signal?: AbortSignal): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cached = await cache.get<any>("artist", id);
  if (cached) return cached;

  const result = await tidal.getArtist(id, signal);
  await cache.set("artist", id, result);
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPlaylist(id: string, signal?: AbortSignal): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cached = await cache.get<any>("playlist", id);
  if (cached) return cached;

  const result = await tidal.getPlaylist(id, signal);
  await cache.set("playlist", id, result);
  return result;
}

export async function getTrackMetadata(
  id: string,
  signal?: AbortSignal
): Promise<Track> {
  const cacheKey = `meta_${id}`;

  const cached = await cache.get<Track>("track", cacheKey);
  if (cached) return cached;

  const result = await tidal.getTrackMetadata(id, signal);
  await cache.set("track", cacheKey, result);
  return result;
}

// -- Streaming --

export async function getStreamUrl(
  id: string,
  quality: StreamQuality = "HI_RES_LOSSLESS",
  signal?: AbortSignal
): Promise<string> {
  const cacheKey = `stream_${id}_${quality}`;

  if (streamCache.has(cacheKey)) {
    return streamCache.get(cacheKey)!;
  }

  const url = await tidal.getStreamUrl(id, quality, signal);

  streamCache.set(cacheKey, url);
  pruneStreamCache();
  return url;
}

// -- Cover / artwork --

export function getCoverUrl(id: string | undefined, size = "320"): string {
  if (!id) return "";
  return tidal.getCoverUrl(id, size);
}

export function getArtistPictureUrl(
  id: string | undefined,
  size = "320"
): string {
  if (!id) return "";
  return tidal.getArtistPictureUrl(id, size);
}
