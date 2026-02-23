/**
 * Spotify OAuth PKCE + API helpers.
 *
 * OAuth flow:
 * 1. initiateSpotifyAuth() → redirects to Spotify in same window
 * 2. Spotify redirects back to localhost:1420/?code=...
 * 3. App.tsx detects ?code= on mount → calls exchangeCodeForToken()
 * 4. Token saved to localStorage, used for all API calls
 */

const SPOTIFY_CLIENT_ID = "002aca4ba54644358e3ea3949261d770"; // <-- paste your Spotify app Client ID here
const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_SCOPES =
  "playlist-read-private playlist-read-collaborative user-library-read";

const REDIRECT_URI = "http://127.0.0.1:1420/spotify";
const TOKEN_KEY = "moonsway-spotify-token";
const VERIFIER_KEY = "moonsway-spotify-verifier";

// -- Token management (js-cache-storage: cache localStorage reads in memory) --

let cachedToken: string | null | undefined = undefined;

export function loadSpotifyToken(): string | null {
  if (cachedToken === undefined) {
    cachedToken = localStorage.getItem(TOKEN_KEY);
  }
  return cachedToken;
}

export function saveSpotifyToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  cachedToken = token;
}

export function clearSpotifyToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(VERIFIER_KEY);
  cachedToken = null;
}

export function isSpotifyConfigured(): boolean {
  return !!SPOTIFY_CLIENT_ID;
}

// -- PKCE helpers --

function generateCodeVerifier(): string {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = crypto.getRandomValues(new Uint8Array(64));
  return Array.from(randomValues)
    .map((v) => possible[v % possible.length])
    .join("");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hashed = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hashed);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// -- Auth flow --

export async function initiateSpotifyAuth(): Promise<void> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem(VERIFIER_KEY, verifier);

  const url = new URL(SPOTIFY_AUTH_URL);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
    redirect_uri: REDIRECT_URI,
  }).toString();

  window.location.href = url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error("PKCE verifier missing from localStorage");

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const data = await response.json();
  const token: string = data.access_token;
  saveSpotifyToken(token);
  localStorage.removeItem(VERIFIER_KEY);
  return token;
}

// -- Spotify API --

async function spotifyFetch(
  url: string,
  token: string
): Promise<Response> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    clearSpotifyToken();
    throw new Error("spotify/unauthorized");
  }

  if (!res.ok) {
    throw new Error(`Spotify API error ${res.status}: ${url}`);
  }

  return res;
}

// Paginate through all items from a Spotify paged endpoint.
// Spotify's `next` URL sometimes uses /users/{id}/playlists which 403s —
// rewrite it back to /me/playlists to stay on the authenticated endpoint.
async function fetchAllPages<T>(
  initialUrl: string,
  token: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<T[]> {
  const items: T[] = [];
  let url: string | null = initialUrl;

  while (url) {
    const res = await spotifyFetch(url, token);
    const page = await res.json();
    items.push(...(page.items ?? []));
    if (onProgress) onProgress(items.length, page.total ?? items.length);
    const next: string | null = page.next ?? null;
    url = next
      ? next.replace(
          /\/users\/[^/]+\/playlists/,
          "/me/playlists"
        )
      : null;
  }

  return items;
}

// -- Types --

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  items: { total: number } | null;  // Spotify returns "items" not "tracks" in /me/playlists
  owner: { display_name: string } | null;
  public: boolean;
  collaborative: boolean;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  external_ids: { isrc?: string };
  duration_ms: number;
  explicit: boolean;
}

export interface SpotifyPlaylistTrack {
  item: SpotifyTrack | null;   // current field (replaces deprecated `track`)
  track: SpotifyTrack | null;  // deprecated fallback — some old playlists still use this
  added_at: string;
  is_local: boolean;
}

// -- API calls --

export async function fetchSpotifyPlaylists(
  token: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<SpotifyPlaylist[]> {
  const items = await fetchAllPages<{ track: null } & SpotifyPlaylist>(
    "https://api.spotify.com/v1/me/playlists?limit=50",
    token,
    onProgress
  );
  return items as unknown as SpotifyPlaylist[];
}

export async function fetchPlaylistTracks(
  playlistId: string,
  token: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<SpotifyPlaylistTrack[]> {
  const url =
    playlistId === "liked"
      ? "https://api.spotify.com/v1/me/tracks?limit=50"
      : `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;

  return fetchAllPages<SpotifyPlaylistTrack>(url, token, onProgress);
}

export async function fetchSpotifyUser(
  token: string
): Promise<{ id: string; display_name: string; images: { url: string }[] }> {
  const res = await spotifyFetch("https://api.spotify.com/v1/me", token);
  return res.json();
}
