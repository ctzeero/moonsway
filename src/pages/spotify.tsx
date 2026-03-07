/**
 * Spotify Import page.
 *
 * Steps:
 *   1. Connect — initiate PKCE flow or show connected user
 *   2. Pick — checklist of playlists to import
 *   3. Import — progress bar per playlist/track
 *   4. Done — results summary with unmatched tracks panel
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Music2,
  Sparkles,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  LogOut,
  Check,
  CheckCheck,
  X,
  Loader2,
  ListMusic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpotifyStore, type UnmatchedTrack } from "@/stores/spotify-store";
import { useLibraryStore } from "@/stores/library-store";
import { searchTracks } from "@/lib/api/tidal";
import { initiateSpotifyAuth, exchangeCodeForToken, isSpotifyConfigured } from "@/lib/spotify";
import { getCoverUrl } from "@/lib/api/music-api";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/music";

// -- Connect step --

function ConnectStep() {
  const { step, spotifyUser, disconnect } = useSpotifyStore();
  const configured = isSpotifyConfigured();

  if (!configured) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-[#1DB954]/10">
          <Music2 className="size-8 text-[#1DB954]" />
        </div>
        <h2 className="text-xl font-semibold">Spotify Import</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Add your Spotify Client ID to{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            spotify
          </code>{" "}
          to enable playlist import.
        </p>
      </div>
    );
  }

  if (step === "connecting") {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Connecting to Spotify…</p>
      </div>
    );
  }

  if (spotifyUser) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-[#1DB954]/10">
          <Music2 className="size-8 text-[#1DB954]" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Connected as</p>
          <p className="font-semibold">{spotifyUser.display_name}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => disconnect()}
        >
          <LogOut className="size-4" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-[#1DB954]/10">
        <Music2 className="size-8 text-[#1DB954]" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Import from Spotify</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Connect your Spotify account to import playlists. Tracks are matched
          to TIDAL via ISRC for lossless quality.
        </p>
      </div>
      <Button
        className="bg-[#1DB954] text-black hover:bg-[#1DB954]/90"
        onClick={() => initiateSpotifyAuth()}
      >
        <Music2 className="size-4" />
        Connect Spotify
      </Button>
    </div>
  );
}

// -- Playlist picker step --

function PlaylistRow({
  playlist,
  selected,
  onToggle,
}: {
  playlist: { id: string; name: string; images: { url: string }[]; items: { total: number } | null; owner: { display_name: string } | null };
  selected: boolean;
  onToggle: () => void;
}) {
  const cover = playlist.images[0]?.url;

  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/60",
        selected && "bg-accent/40"
      )}
    >
      {selected ? (
        <CheckSquare className="size-4 shrink-0 text-primary" />
      ) : (
        <Square className="size-4 shrink-0 text-muted-foreground" />
      )}
      {cover ? (
        <img
          src={cover}
          alt={playlist.name}
          referrerPolicy="no-referrer"
          className="size-10 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
          <Music2 className="size-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{playlist.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {playlist.items?.total ?? 0} tracks · {playlist.owner?.display_name ?? ""}
        </p>
      </div>
    </button>
  );
}

function PickStep() {
  const { playlists, selectedIds, togglePlaylist, selectAll, deselectAll, startImport } =
    useSpotifyStore();
  const [search, setSearch] = useState("");

  const filtered = playlists.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const allSelected = playlists.length > 0 && selectedIds.size === playlists.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[#1DB954]/20 bg-[radial-gradient(circle_at_top_left,_rgba(29,185,84,0.18),_transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#6ee7a8]">
          <Sparkles className="size-3.5" />
          Ready to import
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Choose playlists to import</h2>
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} of {playlists.length} selected
            </p>
          </div>
          <Button
            disabled={selectedIds.size === 0}
            onClick={() => startImport()}
            className="h-12 w-full rounded-xl bg-[#1DB954] px-5 text-base font-semibold text-black shadow-[0_12px_30px_rgba(29,185,84,0.28)] transition-transform hover:scale-[1.01] hover:bg-[#23c759] disabled:scale-100 disabled:opacity-50 sm:w-auto"
          >
            <Music2 className="size-4" />
            Import {selectedIds.size > 0 ? selectedIds.size : ""} playlist
            {selectedIds.size !== 1 ? "s" : ""}
          </Button>
        </div>

        <div className="mt-3 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (allSelected ? deselectAll() : selectAll())}
            className="shrink-0 rounded-lg px-3"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter playlists…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-input/30 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
        />
      </div>

      <div className="themed-scroll max-h-[420px] overflow-y-auto rounded-lg border border-border/60">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No playlists found.
          </p>
        ) : (
          <div className="p-1">
            {filtered.map((p) => (
              <PlaylistRow
                key={p.id}
                playlist={p}
                selected={selectedIds.has(p.id)}
                onToggle={() => togglePlaylist(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// -- Import progress step --

function ImportStep() {
  const { progress, cancelImport } = useSpotifyStore();

  if (!progress) return null;

  const playlistPct = Math.round(
    (progress.playlistIndex / progress.playlistTotal) * 100
  );
  const trackPct =
    progress.trackTotal > 0
      ? Math.round((progress.trackIndex / progress.trackTotal) * 100)
      : 0;

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <Loader2 className="size-10 animate-spin text-[#1DB954]" />
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">
              Playlist {progress.playlistIndex} of {progress.playlistTotal}
            </span>
            <span className="text-muted-foreground">{playlistPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[#1DB954] transition-all duration-300"
              style={{ width: `${playlistPct}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="truncate text-muted-foreground">
              {progress.playlistName}
            </span>
            <span className="text-muted-foreground">
              {progress.trackIndex}/{progress.trackTotal} tracks
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/60 transition-all duration-150"
              style={{ width: `${trackPct}%` }}
            />
          </div>
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={() => cancelImport()}>
        <X className="size-4" />
        Cancel
      </Button>
    </div>
  );
}

// -- Unmatched track row with manual TIDAL search --

function UnmatchedRow({ track }: { track: UnmatchedTrack }) {
  const [query, setQuery] = useState(`${track.name} ${track.artist}`);
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolved, setResolved] = useState<Track | null>(null);
  const addFavoriteTrack = useLibraryStore((s) => s.addFavoriteTrack);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await searchTracks(query);
      setResults(res.items.slice(0, 5));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handlePick = (t: Track) => {
    setResolved(t);
    setResults([]);
    addFavoriteTrack(t);
  };

  if (resolved) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-green-500/10 px-3 py-2.5">
        <Check className="size-4 shrink-0 text-green-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{resolved.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {resolved.artist.name} · Matched manually
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="mb-2 flex items-start gap-2">
        <X className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{track.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {track.artist} · {track.album}
            {track.isrc && (
              <span className="ml-1 font-mono opacity-50">
                ISRC: {track.isrc}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 rounded-md border border-border bg-input/30 px-3 py-1.5 text-sm outline-none focus:border-primary/50"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSearch}
          disabled={searching}
        >
          {searching ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Search className="size-3.5" />
          )}
        </Button>
      </div>
      {results.length > 0 && (
        <div className="mt-2 space-y-1">
          {results.map((t) => (
            <button
              key={t.id}
              onClick={() => handlePick(t)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/60"
            >
              <img
                src={getCoverUrl(t.album.cover, "80")}
                alt={t.album.title}
                className="size-8 shrink-0 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.artist.name} · {t.album.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// -- Results / Done step --

function DoneStep() {
  const navigate = useNavigate();
  const { results, reset } = useSpotifyStore();
  const totalMatched = results.reduce((n, r) => n + r.matched.length, 0);
  const totalUnmatched = results.reduce((n, r) => n + r.unmatched.length, 0);
  const importedPlaylistIds = results.flatMap((result) =>
    result.localPlaylistId ? [result.localPlaylistId] : []
  );
  const importedPlaylistCount = importedPlaylistIds.length;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleOpenImportedPlaylists = () => {
    if (importedPlaylistCount === 1) {
      navigate(`/playlist/${importedPlaylistIds[0]}`);
      return;
    }

    navigate("/library");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/40 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#6ee7a8]">
            <CheckCheck className="size-3.5" />
            Saved automatically
          </div>
          <h2 className="text-lg font-semibold">Imported to your library</h2>
          <p className="text-sm text-muted-foreground">
            {importedPlaylistCount} playlist{importedPlaylistCount === 1 ? "" : "s"} added to
            {" "}Playlists
            {totalMatched > 0 ? ` · ${totalMatched} matched tracks imported` : ""}
            {totalUnmatched > 0 ? ` · ${totalUnmatched} unmatched need review` : ""}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenImportedPlaylists}
              disabled={importedPlaylistCount === 0}
            >
              <ListMusic className="size-4" />
              {importedPlaylistCount === 1 ? "Open playlist" : "Open playlists"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => reset()}>
              <RefreshCw className="size-4" />
              Import more
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {results.map((result) => {
          const isExpanded = expandedId === result.spotifyId;
          const hasSavedTracks = result.matched.length > 0;

          return (
            <div
              key={result.spotifyId}
              className="rounded-lg border border-border/60 overflow-hidden"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedId(isExpanded ? null : result.spotifyId)
                }
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 hover:bg-accent/40"
              >
                {result.coverUrl ? (
                  <img
                    src={result.coverUrl}
                    alt={result.name}
                    referrerPolicy="no-referrer"
                    className="size-10 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
                    <Music2 className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate font-medium">{result.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-500">
                      {result.matched.length} imported
                    </span>
                    {result.unmatched.length > 0 && (
                      <span className="ml-2 text-destructive">
                        {result.unmatched.length} unmatched
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[#1DB954]/20 bg-[#1DB954]/10 px-2.5 py-1 text-xs font-medium text-[#6ee7a8]">
                    {hasSavedTracks ? "Added to playlist" : "Playlist imported empty"}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border/60 bg-muted/20 p-4">
                  {result.matched.length > 0 && (
                    <div>
                      <p className="mb-3 text-sm font-medium text-muted-foreground">
                        Added to playlist
                      </p>
                      <div className="space-y-2">
                        {result.matched.map((track) => (
                          <div
                            key={track.id}
                            className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 px-3 py-2.5"
                          >
                            <img
                              src={getCoverUrl(track.album.cover, "80")}
                              alt={track.album.title}
                              className="size-10 shrink-0 rounded object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{track.title}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {track.artist.name} · {track.album.title}
                              </p>
                            </div>
                            <Check className="size-4 shrink-0 text-green-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.unmatched.length > 0 && (
                    <div className={cn(result.matched.length > 0 && "mt-4")}>
                      <p className="mb-3 text-sm font-medium text-muted-foreground">
                        Unmatched tracks — search TIDAL manually:
                      </p>
                      <div className="space-y-2">
                        {result.unmatched.map((t) => (
                          <UnmatchedRow key={t.spotifyId} track={t} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- Main page --

export function SpotifyPage() {
  const { step, error, clearError } = useSpotifyStore();
  const hasProcessedCode = useRef(false);

  // Handle OAuth callback: ?code= in URL after Spotify redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code || hasProcessedCode.current) return;
    hasProcessedCode.current = true;

    exchangeCodeForToken(code)
      .then((token) => {
        window.history.replaceState({}, "", window.location.pathname);
        useSpotifyStore.getState().connect(token);
      })
      .catch((err) => {
        window.history.replaceState({}, "", window.location.pathname);
        console.error("[spotify] Token exchange failed:", err);
      });
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-8 flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-[#1DB954]/10">
          <Music2 className="size-5 text-[#1DB954]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Spotify Import</h1>
          <p className="text-sm text-muted-foreground">
            Transfer your playlists to Moonsway
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <button onClick={clearError}>
            <X className="size-4" />
          </button>
        </div>
      )}

      {(step === "idle" || step === "connecting") && <ConnectStep />}
      {step === "picking" && <PickStep />}
      {step === "importing" && <ImportStep />}
      {step === "done" && <DoneStep />}
    </div>
  );
}
