import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft, Clock, Heart, Play } from "lucide-react";
import { getAlbum, getCoverUrl } from "@/lib/api/music-api";
import { TrackList } from "@/components/track-list";
import { usePlayerStore } from "@/stores/player-store";
import { useLibraryStore } from "@/stores/library-store";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Album, Track } from "@/types/music";

export function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const playTrack = usePlayerStore((s) => s.playTrack);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const favoriteAlbums = useLibraryStore((s) => s.favoriteAlbums);
  const toggleFavoriteAlbum = useLibraryStore((s) => s.toggleFavoriteAlbum);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    getAlbum(id)
      .then((result) => {
        if (cancelled) return;
        setAlbum(result.album);
        setTracks(result.tracks);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[Album] Failed to load:", err);
        setError("Failed to load album");
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
      playTrack(track, tracks);
    },
    [playTrack, tracks]
  );

  const handlePlayAll = useCallback(() => {
    if (tracks.length > 0) {
      playQueue(tracks, 0);
    }
  }, [playQueue, tracks]);

  if (isLoading) return <AlbumSkeleton />;

  if (error || !album) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-muted-foreground">{error ?? "Album not found"}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-primary hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const coverUrl = album.cover ? getCoverUrl(album.cover, "640") : "";
  const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0);
  const isFav = favoriteAlbums.some((item) => item.id === album.id);
  const metadata = [
    album.releaseDate ? album.releaseDate.substring(0, 4) : null,
    album.numberOfTracks != null ? `${album.numberOfTracks} tracks` : null,
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
          <div className="size-40 shrink-0 rounded-[1.75rem] bg-muted sm:ml-8 sm:size-48 sm:rounded-lg" />
        )}

        <div className="flex min-w-0 flex-col justify-end gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {album.type ?? "Album"}
          </span>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {album.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <Link
              to={`/artist/${album.artist.id}`}
              state={{ artist: album.artist }}
              className="font-medium text-foreground hover:underline"
            >
              {album.artist.name}
            </Link>
            {metadata.map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <span className="text-border/70">•</span>
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

      {/* Actions */}
      <div className="flex items-center gap-3 px-4 pb-4 sm:px-6">
        {tracks.length > 0 && (
          <button
            onClick={handlePlayAll}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Play className="size-4" />
            Play
          </button>
        )}
        {album && (
          <button
            onClick={() => toggleFavoriteAlbum(album)}
            className="rounded-full p-2 transition-colors hover:bg-accent"
          >
            <Heart
              className={cn(
                "size-5 transition-colors",
                isFav ? "fill-primary text-primary" : "text-muted-foreground"
              )}
            />
          </button>
        )}
      </div>

      {/* Track list */}
      <div className="px-0 pb-6 sm:px-2">
        <TrackList tracks={tracks} onPlay={handlePlayTrack} />
      </div>
    </div>
  );
}

function AlbumSkeleton() {
  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <Skeleton className="size-40 rounded-[1.75rem] sm:size-48 sm:rounded-lg" />
        <div className="flex flex-col justify-end gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-56 sm:w-64" />
          <Skeleton className="h-4 w-48" />
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
