/**
 * TIDAL API -- talks to community proxy instances.
 * Ported from Monochrome's js/api.js (LosslessAPI).
 */

import { fetchWithRetry } from "./fetch";
import type {
  Track,
  Album,
  ArtistMinified,
  SearchResult,
  StreamQuality,
} from "@/types/music";

// -- Response normalization helpers --

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_LOG_STRING_LENGTH = 400;

function sanitizeLogPayload(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") {
    if (value.length <= MAX_LOG_STRING_LENGTH) return value;
    return `${value.slice(0, MAX_LOG_STRING_LENGTH)}...[truncated ${value.length - MAX_LOG_STRING_LENGTH} chars]`;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogPayload(item, seen));
  }

  if (value instanceof Blob) {
    return `[Blob type=${value.type || "unknown"} size=${value.size}]`;
  }

  if (seen.has(value as object)) {
    return "[Circular]";
  }

  seen.add(value as object);
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    output[key] = sanitizeLogPayload(nested, seen);
  }
  return output;
}

function logApiResponse(label: string, payload: unknown): void {
  console.log(`[TIDAL] ${label}`, sanitizeLogPayload(payload));
}

function findSearchSection(
  source: any,
  key: string,
  visited: Set<any>
): any | undefined {
  if (!source || typeof source !== "object") return undefined;

  if (Array.isArray(source)) {
    for (const e of source) {
      const f = findSearchSection(e, key, visited);
      if (f) return f;
    }
    return undefined;
  }

  if (visited.has(source)) return undefined;
  visited.add(source);

  if ("items" in source && Array.isArray(source.items)) return source;

  if (key in source) {
    const f = findSearchSection(source[key], key, visited);
    if (f) return f;
  }

  for (const v of Object.values(source)) {
    const f = findSearchSection(v, key, visited);
    if (f) return f;
  }

  return undefined;
}

function normalizeSearchResponse<T>(data: any, key: string): SearchResult<T> {
  const section = findSearchSection(data, key, new Set());
  const items: T[] = section?.items ?? [];
  return {
    items,
    limit: section?.limit ?? items.length,
    offset: section?.offset ?? 0,
    totalNumberOfItems: section?.totalNumberOfItems ?? items.length,
  };
}

function prepareTrack(raw: any): Track {
  const track = { ...raw };

  if (!track.artist && Array.isArray(track.artists) && track.artists.length > 0) {
    track.artist = track.artists[0];
  }

  return {
    id: String(track.id),
    title: track.title ?? "Unknown",
    duration: track.duration ?? 0,
    explicit: track.explicit ?? false,
    artist: normalizeArtist(track.artist),
    artists: Array.isArray(track.artists)
      ? track.artists.map(normalizeArtist)
      : track.artist
        ? [normalizeArtist(track.artist)]
        : [],
    album: track.album
      ? {
          id: String(track.album.id),
          title: track.album.title ?? "",
          cover: track.album.cover ?? track.album.image ?? undefined,
          releaseDate: track.album.releaseDate ?? undefined,
          artist: normalizeArtist(track.album.artist ?? track.artist),
          numberOfTracks: track.album.numberOfTracks ?? undefined,
        }
      : { id: "", title: "", artist: normalizeArtist(null) },
    isrc: track.isrc ?? undefined,
    trackNumber: track.trackNumber ?? undefined,
    version: track.version ?? undefined,
    copyright: track.copyright ?? undefined,
  };
}

function prepareAlbum(raw: any): Album {
  const album = { ...raw };

  if (!album.artist && Array.isArray(album.artists) && album.artists.length > 0) {
    album.artist = album.artists[0];
  }

  return {
    id: String(album.id),
    title: album.title ?? "Unknown",
    cover: album.cover ?? album.image ?? undefined,
    releaseDate: album.releaseDate ?? undefined,
    artist: normalizeArtist(album.artist),
    numberOfTracks: album.numberOfTracks ?? undefined,
    explicit: album.explicit ?? false,
    type: album.type ?? "ALBUM",
  };
}

function normalizeArtist(raw: any): ArtistMinified {
  if (!raw) {
    return { id: "0", name: "Unknown Artist" };
  }
  return {
    id: String(raw.id),
    name: raw.name ?? "Unknown Artist",
    picture: raw.picture ?? undefined,
  };
}

// -- Manifest parsing --

function extractStreamUrlFromManifest(manifest: string): string | null {
  try {
    const decoded = atob(manifest);

    // DASH manifest -- create blob URL
    if (decoded.includes("<MPD")) {
      const blob = new Blob([decoded], { type: "application/dash+xml" });
      return URL.createObjectURL(blob);
    }

    // JSON manifest
    try {
      const parsed = JSON.parse(decoded);
      if (parsed?.urls?.[0]) {
        return parsed.urls[0];
      }
    } catch {
      // Not JSON -- try regex for URL
      const match = decoded.match(/https?:\/\/[\w\-.~:?#[@!$&'()*+,;=%/]+/);
      return match ? match[0] : null;
    }
  } catch (error) {
    console.error("[TIDAL] Failed to decode manifest:", error);
  }
  return null;
}

// -- Track lookup parsing (for stream endpoint) --

interface TrackLookup {
  track: any;
  info: any;
  originalTrackUrl?: string;
}

function parseTrackLookup(data: any): TrackLookup {
  const entries = Array.isArray(data) ? data : [data];
  let track: any;
  let info: any;
  let originalTrackUrl: string | undefined;

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;

    if (!track && "duration" in entry) {
      track = entry;
      continue;
    }

    if (!info && "manifest" in entry) {
      info = entry;
      continue;
    }

    if (!originalTrackUrl && "OriginalTrackUrl" in entry) {
      const candidate = entry.OriginalTrackUrl;
      if (typeof candidate === "string") {
        originalTrackUrl = candidate;
      }
    }
  }

  if (!track || !info) {
    throw new Error("Malformed track response");
  }

  return { track, info, originalTrackUrl };
}

function normalizeTrackResponse(apiResponse: any): any {
  if (!apiResponse || typeof apiResponse !== "object") return apiResponse;
  const raw = apiResponse.data ?? apiResponse;
  const trackStub = { duration: raw.duration ?? 0, id: raw.trackId ?? null };
  return [trackStub, raw];
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// -- Public API --

export async function searchTracks(
  query: string,
  signal?: AbortSignal
): Promise<SearchResult<Track>> {
  const response = await fetchWithRetry(
    `/search/?s=${encodeURIComponent(query)}`,
    { signal }
  );
  const data = await response.json();
  logApiResponse("searchTracks raw response", data);
  const normalized = normalizeSearchResponse<Track>(data, "tracks");
  const result = {
    ...normalized,
    items: normalized.items.map(prepareTrack),
  };
  logApiResponse("searchTracks normalized response", result);
  return result;
}

export async function searchAlbums(
  query: string,
  signal?: AbortSignal
): Promise<SearchResult<Album>> {
  const response = await fetchWithRetry(
    `/search/?al=${encodeURIComponent(query)}`,
    { signal }
  );
  const data = await response.json();
  logApiResponse("searchAlbums raw response", data);
  const normalized = normalizeSearchResponse<Album>(data, "albums");
  const result = {
    ...normalized,
    items: normalized.items.map(prepareAlbum),
  };
  logApiResponse("searchAlbums normalized response", result);
  return result;
}

export async function searchArtists(
  query: string,
  signal?: AbortSignal
): Promise<SearchResult<ArtistMinified>> {
  const response = await fetchWithRetry(
    `/search/?a=${encodeURIComponent(query)}`,
    { signal }
  );
  const data = await response.json();
  logApiResponse("searchArtists raw response", data);
  const normalized = normalizeSearchResponse<ArtistMinified>(data, "artists");
  const result = {
    ...normalized,
    items: normalized.items.map(normalizeArtist),
  };
  logApiResponse("searchArtists normalized response", result);
  return result;
}

export async function searchPlaylists(
  query: string,
  signal?: AbortSignal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<SearchResult<any>> {
  const response = await fetchWithRetry(
    `/search/?p=${encodeURIComponent(query)}`,
    { signal }
  );
  const data = await response.json();
  logApiResponse("searchPlaylists raw response", data);
  const result = normalizeSearchResponse(data, "playlists");
  logApiResponse("searchPlaylists normalized response", result);
  return result;
}

export async function getAlbum(
  id: string,
  signal?: AbortSignal
): Promise<{ album: Album; tracks: Track[] }> {
  const response = await fetchWithRetry(`/album/?id=${id}`, { signal });
  const jsonData = await response.json();
  logApiResponse("getAlbum raw response", jsonData);
  const data = jsonData.data || jsonData;

  let album: Album | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tracksSection: any;

  if (data && typeof data === "object" && !Array.isArray(data)) {
    if ("numberOfTracks" in data || "title" in data) {
      album = prepareAlbum(data);
    }

    if ("items" in data) {
      tracksSection = data;

      if (!album && data.items?.length > 0) {
        const firstItem = data.items[0];
        const track = firstItem.item || firstItem;
        if (track?.album) {
          album = prepareAlbum(track.album);
        }
      }
    }
  }

  if (!album) throw new Error("Album not found");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tracks = (tracksSection?.items ?? []).map((i: any) =>
    prepareTrack(i.item || i)
  );

  const result = { album, tracks };
  logApiResponse("getAlbum normalized response", result);
  return result;
}

export async function getArtist(
  artistId: string,
  signal?: AbortSignal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const response = await fetchWithRetry(`/artist/?id=${artistId}`, { signal });
  const jsonData = await response.json();
  logApiResponse("getArtist profile raw response", jsonData);
  const data = jsonData.data || jsonData;

  const artist = normalizeArtist(data);

  // Fetch artist content (albums, tracks)
  const contentResponse = await fetchWithRetry(
    `/artist/?f=${artistId}&skip_tracks=true`,
    { signal }
  );
  const contentJsonData = await contentResponse.json();
  logApiResponse("getArtist content raw response", contentJsonData);
  const contentData = contentJsonData.data || contentJsonData;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const albumMap = new Map<string, Album>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trackMap = new Map<string, Track>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isTrack = (v: any) => v?.id && v.duration && v.album;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAlbum = (v: any) => v?.id && "numberOfTracks" in v;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scan = (value: any, visited = new Set<any>()) => {
    if (!value || typeof value !== "object" || visited.has(value)) return;
    visited.add(value);

    if (Array.isArray(value)) {
      value.forEach((item) => scan(item, visited));
      return;
    }

    const item = value.item || value;
    if (isAlbum(item)) albumMap.set(String(item.id), prepareAlbum(item));
    if (isTrack(item)) trackMap.set(String(item.id), prepareTrack(item));

    Object.values(value).forEach((nested) => scan(nested, visited));
  };

  const entries = Array.isArray(contentData) ? contentData : [contentData];
  entries.forEach((entry) => scan(entry));

  const albums = Array.from(albumMap.values());
  const tracks = Array.from(trackMap.values()).slice(0, 15);

  const result = { ...artist, albums, tracks };
  logApiResponse("getArtist normalized response", result);
  return result;
}

export async function getPlaylist(
  id: string,
  signal?: AbortSignal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const response = await fetchWithRetry(`/playlist/?id=${id}`, { signal });
  const jsonData = await response.json();
  logApiResponse("getPlaylist raw response", jsonData);
  const data = jsonData.data || jsonData;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tracks = (data.items ?? []).map((i: any) =>
    prepareTrack(i.item || i)
  );

  const result = {
    id: String(data.uuid || data.id || id),
    title: data.title ?? "Unknown Playlist",
    image: data.image ?? data.squareImage ?? undefined,
    numberOfTracks: data.numberOfTracks ?? tracks.length,
    tracks,
  };
  logApiResponse("getPlaylist normalized response", result);
  return result;
}

export async function getTrackMetadata(
  id: string,
  signal?: AbortSignal
): Promise<Track> {
  const response = await fetchWithRetry(`/info/?id=${id}`, {
    type: "api",
    signal,
  });
  const json = await response.json();
  logApiResponse("getTrackMetadata raw response", json);
  const data = json.data || json;

  const items = Array.isArray(data) ? data : [data];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const found = items.find(
    (i: any) => String(i.id) === id || String(i.item?.id) === id
  );

  if (found) {
    const result = prepareTrack(found.item || found);
    logApiResponse("getTrackMetadata normalized response", result);
    return result;
  }

  throw new Error("Track metadata not found");
}

export async function getStreamUrl(
  id: string,
  quality: StreamQuality = "HI_RES_LOSSLESS",
  signal?: AbortSignal
): Promise<string> {
  const response = await fetchWithRetry(
    `/track/?id=${id}&quality=${quality}`,
    { type: "streaming", signal }
  );
  const jsonResponse = await response.json();
  logApiResponse("getStreamUrl raw response", jsonResponse);
  const normalized = normalizeTrackResponse(jsonResponse);
  logApiResponse("getStreamUrl normalized track response", normalized);
  const lookup = parseTrackLookup(normalized);

  if (lookup.originalTrackUrl) {
    return lookup.originalTrackUrl;
  }

  const streamUrl = extractStreamUrlFromManifest(lookup.info.manifest);
  if (!streamUrl) {
    throw new Error("Could not resolve stream URL from manifest");
  }

  return streamUrl;
}

// -- Cover/artwork helpers --

export function getCoverUrl(coverId: string | undefined, size = "320"): string {
  if (!coverId) {
    return "";
  }

  if (coverId.startsWith("http") || coverId.startsWith("blob:")) {
    return coverId;
  }

  const formattedId = coverId.replace(/-/g, "/");
  return `https://resources.tidal.com/images/${formattedId}/${size}x${size}.jpg`;
}

export function getArtistPictureUrl(
  pictureId: string | undefined,
  size = "320"
): string {
  if (!pictureId) {
    return "";
  }

  if (pictureId.startsWith("http") || pictureId.startsWith("blob:")) {
    return pictureId;
  }

  const formattedId = pictureId.replace(/-/g, "/");
  return `https://resources.tidal.com/images/${formattedId}/${size}x${size}.jpg`;
}
