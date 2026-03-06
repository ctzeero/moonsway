import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Clock, ListMusic, Play } from "lucide-react";
import { getPlaylist, getCoverUrl } from "@/lib/api/music-api";
import { TrackList } from "@/components/track-list";
import { usePlayerStore } from "@/stores/player-store";
import { formatTime } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { Track } from "@/types/music";

interface PlaylistDetail {
  id: string;
  title: string;
  image?: string;
  numberOfTracks: number;
  tracks: Track[];
}

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const playTrack = usePlayerStore((s) => s.playTrack);
  const playQueue = usePlayerStore((s) => s.playQueue);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    getPlaylist(id)
      .then((result: PlaylistDetail) => {
        if (cancelled) return;
        setPlaylist(result);
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
  }, [id]);

  const handlePlayTrack = useCallback(
    (track: Track) => {
      if (playlist) {
        playTrack(track, playlist.tracks);
      }
    },
    [playTrack, playlist]
  );

  const handlePlayAll = useCallback(() => {
    if (playlist && playlist.tracks.length > 0) {
      playQueue(playlist.tracks, 0);
    }
  }, [playQueue, playlist]);

  if (isLoading) return <PlaylistSkeleton />;

  if (error || !playlist) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-muted-foreground">{error ?? "Playlist not found"}</p>
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
  const totalDuration = playlist.tracks.reduce((sum, t) => sum + t.duration, 0);
  const metadata = [
    `${playlist.numberOfTracks} tracks`,
    totalDuration > 0 ? formatTime(totalDuration) : null,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="relative flex flex-col gap-4 p-4 pb-3 sm:flex-row sm:gap-6 sm:p-6 sm:pb-4">
        <button
          onClick={() => navigate(-1)}
          className="z-10 flex items-center gap-2 self-start rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:absolute sm:mt-1 sm:border-0 sm:bg-transparent sm:px-1 sm:py-1"
        >
          <ArrowLeft className="size-5" />
          <span className="sm:hidden">Back</span>
        </button>

        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="size-40 shrink-0 rounded-[1.75rem] object-cover shadow-lg sm:ml-8 sm:size-48 sm:rounded-lg"
          />
        ) : (
          <div className="flex size-40 shrink-0 items-center justify-center rounded-[1.75rem] bg-muted sm:ml-8 sm:size-48 sm:rounded-lg">
            <ListMusic className="size-16 text-muted-foreground/50" />
          </div>
        )}

        <div className="flex min-w-0 flex-col justify-end gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Playlist
          </span>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {playlist.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {metadata.map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                {item !== metadata[0] && <span className="text-border/70">•</span>}
                {item === formatTime(totalDuration) ? (
                  <>
                    <Clock className="size-3.5" />
                    <span>{item}</span>
                  </>
                ) : (
                  <span>{item}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Play All button */}
      {playlist.tracks.length > 0 && (
        <div className="px-4 pb-4 sm:px-6">
          <button
            onClick={handlePlayAll}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Play className="size-4" />
            Play
          </button>
        </div>
      )}

      {/* Track list */}
      <div className="px-0 pb-6 sm:px-2">
        <TrackList tracks={playlist.tracks} onPlay={handlePlayTrack} />
      </div>
    </div>
  );
}

function PlaylistSkeleton() {
  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <Skeleton className="size-40 rounded-[1.75rem] sm:size-48 sm:rounded-lg" />
        <div className="flex flex-col justify-end gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-56 sm:w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
