import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowUpDown,
  ArrowLeft,
  Check,
  Clock,
  ListMusic,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { getCoverUrl, getPlaylist } from "@/lib/api/music-api";
import { ActionMenu, ActionMenuItem } from "@/components/action-menu";
import { TrackList } from "@/components/track-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLibraryStore } from "@/stores/library-store";
import { usePlayerStore } from "@/stores/player-store";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Playlist, Track } from "@/types/music";

interface RemotePlaylistDetail {
  id: string;
  title: string;
  image?: string;
  numberOfTracks: number;
  tracks: Track[];
}

interface PlaylistViewModel {
  id: string;
  title: string;
  image?: string;
  numberOfTracks: number;
  tracks: Track[];
  isLocal: boolean;
}

type PlaylistSortMode =
  | "default"
  | "recently-added"
  | "title"
  | "artist"
  | "album"
  | "duration";

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const playlists = useLibraryStore((s) => s.playlists);
  const favoriteTracks = useLibraryStore((s) => s.favoriteTracks);
  const history = useLibraryStore((s) => s.history);
  const addTrackToPlaylist = useLibraryStore((s) => s.addTrackToPlaylist);
  const removeTrackFromPlaylist = useLibraryStore((s) => s.removeTrackFromPlaylist);
  const renamePlaylist = useLibraryStore((s) => s.renamePlaylist);

  const playTrack = usePlayerStore((s) => s.playTrack);
  const playQueue = usePlayerStore((s) => s.playQueue);

  const [remotePlaylist, setRemotePlaylist] = useState<RemotePlaylistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddSongsOpen, setIsAddSongsOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [sortMode, setSortMode] = useState<PlaylistSortMode>("default");
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const isLocalPlaylist = Boolean(id?.startsWith("local-"));
  const localPlaylist = useMemo(
    () => playlists.find((playlist) => playlist.id === id) ?? null,
    [id, playlists]
  );

  useEffect(() => {
    if (!id) return;

    if (isLocalPlaylist) {
      setRemotePlaylist(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    setError(null);

    getPlaylist(id)
      .then((result: RemotePlaylistDetail) => {
        if (cancelled) return;
        setRemotePlaylist(result);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[Playlist] Failed to load:", err);
        setError("Failed to load playlist");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isLocalPlaylist]);

  const playlist = useMemo<PlaylistViewModel | null>(() => {
    if (isLocalPlaylist) {
      if (!localPlaylist) return null;
      return {
        id: localPlaylist.id,
        title: localPlaylist.name,
        image: localPlaylist.cover,
        numberOfTracks: localPlaylist.numberOfTracks,
        tracks: localPlaylist.tracks,
        isLocal: true,
      };
    }

    if (!remotePlaylist) return null;
    return {
      ...remotePlaylist,
      isLocal: false,
    };
  }, [isLocalPlaylist, localPlaylist, remotePlaylist]);

  const availableTracks = useMemo(() => {
    if (!localPlaylist) return [];

    const currentTrackIds = new Set(localPlaylist.tracks.map((track) => track.id));
    const uniqueTracks = new Map<string, Track>();

    for (const track of favoriteTracks) {
      if (currentTrackIds.has(track.id)) continue;
      uniqueTracks.set(track.id, track);
    }

    for (const track of history) {
      if (currentTrackIds.has(track.id) || uniqueTracks.has(track.id)) continue;
      uniqueTracks.set(track.id, track);
    }

    return Array.from(uniqueTracks.values());
  }, [favoriteTracks, history, localPlaylist]);

  useEffect(() => {
    if (!playlist?.isLocal) return;
    setTitleDraft(playlist.title);
  }, [playlist?.id, playlist?.isLocal, playlist?.title]);

  useEffect(() => {
    setSortMode(isLocalPlaylist ? "recently-added" : "default");
  }, [id, isLocalPlaylist]);

  useEffect(() => {
    if (!isEditingTitle) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [isEditingTitle]);

  const sortedTracks = useMemo(() => {
    if (!playlist) return [];

    const tracks = [...playlist.tracks];
    const collator = new Intl.Collator(undefined, { sensitivity: "base" });

    switch (sortMode) {
      case "recently-added":
        return tracks.sort((left, right) => {
          const leftAddedToPlaylistAt =
            "addedToPlaylistAt" in left && typeof left.addedToPlaylistAt === "string"
              ? left.addedToPlaylistAt
              : undefined;
          const rightAddedToPlaylistAt =
            "addedToPlaylistAt" in right && typeof right.addedToPlaylistAt === "string"
              ? right.addedToPlaylistAt
              : undefined;
          const leftTime = leftAddedToPlaylistAt ?? left.addedAt ?? "";
          const rightTime = rightAddedToPlaylistAt ?? right.addedAt ?? "";
          return rightTime.localeCompare(leftTime);
        });
      case "title":
        return tracks.sort((left, right) => collator.compare(left.title, right.title));
      case "artist":
        return tracks.sort((left, right) =>
          collator.compare(left.artist?.name ?? "", right.artist?.name ?? "")
        );
      case "album":
        return tracks.sort((left, right) =>
          collator.compare(left.album?.title ?? "", right.album?.title ?? "")
        );
      case "duration":
        return tracks.sort((left, right) => right.duration - left.duration);
      case "default":
      default:
        return tracks;
    }
  }, [playlist, sortMode]);

  const handlePlayTrack = useCallback(
    (track: Track) => {
      if (!playlist) return;
      playTrack(track, sortedTracks);
    },
    [playTrack, playlist, sortedTracks]
  );

  const handlePlayAll = useCallback(() => {
    if (!playlist || sortedTracks.length === 0) return;
    playQueue(sortedTracks, 0);
  }, [playQueue, playlist, sortedTracks]);

  const handlePreviewAvailableTrack = useCallback(
    (track: Track) => {
      playTrack(track, availableTracks);
    },
    [availableTracks, playTrack]
  );

  const renderRemoveTrackAction = useCallback(
    (track: Track) => {
      if (!playlist?.isLocal) return null;

      return (
        <ActionMenu
          label={`${track.title} actions`}
          buttonClassName="p-1.5"
          menuClassName="right-0 min-w-52"
        >
          <ActionMenuItem
            onSelect={() => removeTrackFromPlaylist(playlist.id, track.id)}
            destructive
          >
            <Trash2 className="size-4" />
            Remove from playlist
          </ActionMenuItem>
        </ActionMenu>
      );
    },
    [playlist, removeTrackFromPlaylist]
  );

  const submitTitleEdit = useCallback(() => {
    if (!playlist?.isLocal) return;

    const trimmedTitle = titleDraft.trim();
    if (!trimmedTitle) {
      setTitleDraft(playlist.title);
      setIsEditingTitle(false);
      return;
    }

    renamePlaylist(playlist.id, trimmedTitle);
    setIsEditingTitle(false);
  }, [playlist, renamePlaylist, titleDraft]);

  const cancelTitleEdit = useCallback(() => {
    if (playlist?.isLocal) {
      setTitleDraft(playlist.title);
    }
    setIsEditingTitle(false);
  }, [playlist]);

  if (isLoading) return <PlaylistSkeleton />;

  if (error || !playlist) {
    const message =
      isLocalPlaylist && !localPlaylist ? "Playlist not found" : error ?? "Playlist not found";

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-muted-foreground">{message}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-primary hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const coverUrl = playlist.image ? getCoverUrl(playlist.image, "640") : "";
  const totalDuration = playlist.tracks.reduce((sum, track) => sum + track.duration, 0);

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="relative overflow-hidden border-b border-border/50 bg-[linear-gradient(180deg,rgba(236,72,153,0.18),rgba(15,23,42,0.02)_65%)]">
          <div className="relative flex flex-col items-center gap-4 p-4 pb-5 sm:flex-row sm:items-start sm:gap-6 sm:p-6 sm:pb-6">
            <button
              onClick={() => navigate(-1)}
              className="z-10 flex items-center gap-2 self-start rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:absolute sm:mt-1 sm:border-0 sm:bg-transparent sm:px-1 sm:py-1"
            >
              <ArrowLeft className="size-5" />
              <span className="sm:hidden">Back</span>
            </button>

            {playlist.isLocal ? (
              <LocalPlaylistArtwork
                playlist={localPlaylist}
                className="size-40 shrink-0 self-center rounded-[1.75rem] shadow-lg sm:ml-8 sm:size-48 sm:self-auto sm:rounded-2xl"
              />
            ) : coverUrl ? (
              <img
                src={coverUrl}
                alt=""
                className="size-40 shrink-0 self-center rounded-[1.75rem] object-cover shadow-lg sm:ml-8 sm:size-48 sm:self-auto sm:rounded-2xl"
              />
            ) : (
              <div className="flex size-40 shrink-0 self-center items-center justify-center rounded-[1.75rem] bg-muted shadow-lg sm:ml-8 sm:size-48 sm:self-auto sm:rounded-2xl">
                <ListMusic className="size-16 text-muted-foreground/50" />
              </div>
            )}

            <div className="flex min-w-0 flex-col items-center justify-end gap-3 text-center sm:items-start sm:text-left">
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                {playlist.isLocal ? "Your playlist" : "Playlist"}
              </span>
              {playlist.isLocal ? (
                isEditingTitle ? (
                  <Input
                    ref={titleInputRef}
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onBlur={submitTitleEdit}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        submitTitleEdit();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelTitleEdit();
                      }
                    }}
                    maxLength={60}
                    className="h-auto min-h-0 border-0 bg-transparent px-0 py-0 text-center text-2xl font-bold tracking-tight shadow-none focus-visible:ring-0 sm:text-left sm:text-4xl"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    className="text-2xl font-bold tracking-tight transition-colors hover:text-primary sm:text-4xl"
                  >
                    {playlist.title}
                  </button>
                )
              ) : (
                <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
                  {playlist.title}
                </h1>
              )}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground sm:justify-start">
                <span>{sortedTracks.length} tracks</span>
                {totalDuration > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {formatTime(totalDuration)}
                  </span>
                ) : null}
                {playlist.isLocal ? <span>Created by you</span> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
          {playlist.isLocal ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setIsAddSongsOpen(true)}
            >
              <Plus className="size-4" />
              Add songs
            </Button>
          ) : null}
          <SortMenu
            value={sortMode}
            onChange={setSortMode}
            includeRecentlyAdded={playlist.isLocal}
          />
          <Button
            type="button"
            className="rounded-full"
            onClick={handlePlayAll}
            disabled={sortedTracks.length === 0}
          >
            <Play className="size-4" />
            Play
          </Button>
        </div>

        <div className="px-3 pb-6 sm:px-4">
          {sortedTracks.length > 0 ? (
            <TrackList
              tracks={sortedTracks}
              onPlay={handlePlayTrack}
              renderActions={playlist.isLocal ? renderRemoveTrackAction : undefined}
              showFavoriteButton={!playlist.isLocal}
            />
          ) : (
            <div className="px-4 py-12 sm:px-6">
              <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/70 bg-card/20 px-6 py-12 text-center">
                <ListMusic className="size-12 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium">This playlist is empty</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add songs from your saved tracks or listening history.
                  </p>
                </div>
                {playlist.isLocal ? (
                  <Button type="button" onClick={() => setIsAddSongsOpen(true)}>
                    <Plus className="size-4" />
                    Add songs
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {playlist.isLocal && localPlaylist ? (
        <AddSongsSheet
          open={isAddSongsOpen}
          playlist={localPlaylist}
          tracks={availableTracks}
          onClose={() => setIsAddSongsOpen(false)}
          onAddTrack={(track) => addTrackToPlaylist(localPlaylist.id, track)}
          onPlayTrack={handlePreviewAvailableTrack}
        />
      ) : null}
    </>
  );
}

function SortMenu({
  value,
  onChange,
  includeRecentlyAdded,
}: {
  value: PlaylistSortMode;
  onChange: (value: PlaylistSortMode) => void;
  includeRecentlyAdded: boolean;
}) {
  const options: { value: PlaylistSortMode; label: string }[] = [
    ...(includeRecentlyAdded
      ? [{ value: "recently-added" as const, label: "Recently added" }]
      : [{ value: "default" as const, label: "Default order" }]),
    { value: "title", label: "Title" },
    { value: "artist", label: "Artist" },
    { value: "album", label: "Album" },
    { value: "duration", label: "Duration" },
  ];

  return (
    <ActionMenu
      label="Sort playlist"
      buttonClassName="inline-flex h-9 items-center gap-2 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
      menuClassName="left-0 right-auto min-w-52"
      triggerContent={
        <>
          <ArrowUpDown className="size-4" />
          Sort
        </>
      }
    >
      {options.map((option) => (
        <ActionMenuItem key={option.value} onSelect={() => onChange(option.value)}>
          <span className="flex flex-1 items-center gap-2">
            <ArrowUpDown className="size-4 text-muted-foreground" />
            {option.label}
          </span>
          {value === option.value ? <Check className="size-4" /> : null}
        </ActionMenuItem>
      ))}
    </ActionMenu>
  );
}

function AddSongsSheet({
  open,
  playlist,
  tracks,
  onClose,
  onAddTrack,
  onPlayTrack,
}: {
  open: boolean;
  playlist: Playlist;
  tracks: Track[];
  onClose: () => void;
  onAddTrack: (track: Track) => void;
  onPlayTrack: (track: Track, index: number) => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const filteredTracks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tracks;

    return tracks.filter((track) => {
      const haystack = [
        track.title,
        track.artist?.name,
        track.album?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [query, tracks]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm">
      <div className="flex h-full items-end justify-center md:items-center md:p-6">
        <div className="flex h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] border border-border/60 bg-background shadow-2xl md:h-[min(760px,88vh)] md:rounded-[2rem]">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-6" />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold">Add to this playlist</p>
              <p className="text-xs text-muted-foreground">{playlist.name}</p>
            </div>
            <div className="size-10" />
          </div>

          <div className="border-b border-border/60 px-4 py-4 sm:px-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search saved or recent tracks"
                className="h-11 rounded-2xl bg-card/60 pl-9"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="mb-3">
              <p className="text-lg font-semibold">Suggested songs</p>
              <p className="mt-1 text-sm text-muted-foreground">
                From your favorites and listening history
              </p>
            </div>

            {filteredTracks.length > 0 ? (
              <TrackList
                tracks={filteredTracks}
                onPlay={onPlayTrack}
                showFavoriteButton={false}
                renderActions={(track) => (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddTrack(track);
                    }}
                    className="flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                    title={`Add ${track.title}`}
                  >
                    <Plus className="size-5 md:size-4" />
                  </button>
                )}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/70 px-6 py-12 text-center">
                <ListMusic className="size-12 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium">No songs found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Save more tracks or clear your search to see suggestions.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LocalPlaylistArtwork({
  playlist,
  className,
}: {
  playlist: Playlist | null;
  className?: string;
}) {
  const covers = playlist?.tracks
    .map((track) => track.album?.cover)
    .filter((cover): cover is string => Boolean(cover))
    .slice(0, 4) ?? [];

  if (covers.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[linear-gradient(135deg,rgba(236,72,153,0.22),rgba(59,130,246,0.22))] text-primary",
          className
        )}
      >
        <ListMusic className="size-14" />
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 overflow-hidden bg-muted", className)}>
      {Array.from({ length: 4 }, (_, index) => {
        const cover = covers[index];
        return cover ? (
          <img
            key={`${playlist?.id}-${index}`}
            src={getCoverUrl(cover, "640")}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div key={`${playlist?.id}-${index}`} className="bg-muted" />
        );
      })}
    </div>
  );
}

function PlaylistSkeleton() {
  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <Skeleton className="size-40 rounded-[1.75rem] sm:size-48 sm:rounded-2xl" />
        <div className="flex flex-col justify-end gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-56 sm:w-72" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
      <div className="mt-8 flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
