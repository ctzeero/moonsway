import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router";
import { ArrowLeft, Heart, Play } from "lucide-react";
import { getArtist, getCoverUrl, getArtistPictureUrl } from "@/lib/api/music-api";
import { TrackList } from "@/components/track-list";
import { usePlayerStore } from "@/stores/player-store";
import { useLibraryStore } from "@/stores/library-store";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Album, ArtistMinified, Track } from "@/types/music";

interface ArtistDetail extends ArtistMinified {
  albums: Album[];
  tracks: Track[];
}

interface ArtistRouteState {
  artist?: ArtistMinified;
}

function buildArtistPictureCandidates(
  primaryPicture?: string,
  fallbackPicture?: string
): string[] {
  const pictureIds = [primaryPicture, fallbackPicture].filter(
    (value): value is string => Boolean(value)
  );
  const urls: string[] = [];

  for (const pictureId of pictureIds) {
    urls.push(getArtistPictureUrl(pictureId, "640"));
    urls.push(getArtistPictureUrl(pictureId, "320"));
  }

  return Array.from(new Set(urls.filter(Boolean)));
}

function mergeArtistDetail(
  artist: ArtistDetail,
  fallbackArtist: ArtistMinified | null
): ArtistDetail {
  if (!fallbackArtist || fallbackArtist.id !== artist.id) return artist;

  return {
    ...artist,
    name:
      artist.name && artist.name !== "Unknown Artist"
        ? artist.name
        : fallbackArtist.name,
    picture: artist.picture ?? fallbackArtist.picture,
  };
}

function ArtistHeroImage({
  picture,
  fallbackPicture,
}: {
  picture?: string;
  fallbackPicture?: string;
}) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const pictureCandidates = buildArtistPictureCandidates(picture, fallbackPicture);
  const activePicture = pictureCandidates[candidateIndex];

  if (!activePicture) {
    return <div className="size-32 shrink-0 rounded-full bg-muted sm:size-40" />;
  }

  return (
    <img
      src={activePicture}
      alt=""
      className="size-32 shrink-0 rounded-full object-cover shadow-lg sm:size-40"
      onError={() => {
        setCandidateIndex((current) =>
          current < pictureCandidates.length - 1 ? current + 1 : current
        );
      }}
    />
  );
}

export function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const playTrack = usePlayerStore((s) => s.playTrack);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const favoriteArtists = useLibraryStore((s) => s.favoriteArtists);
  const toggleFavoriteArtist = useLibraryStore((s) => s.toggleFavoriteArtist);
  const upsertFavoriteArtist = useLibraryStore((s) => s.upsertFavoriteArtist);
  const routeArtist = (location.state as ArtistRouteState | null)?.artist ?? null;
  const favoriteArtist = favoriteArtists.find((item) => item.id === id) ?? null;
  const fallbackArtist =
    routeArtist && routeArtist.id === id ? routeArtist : favoriteArtist;
  const [artist, setArtist] = useState<ArtistDetail | null>(
    fallbackArtist ? { ...fallbackArtist, albums: [], tracks: [] } : null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    setArtist(fallbackArtist ? { ...fallbackArtist, albums: [], tracks: [] } : null);

    getArtist(id)
      .then((result: ArtistDetail) => {
        if (cancelled) return;
        setArtist(mergeArtistDetail(result, fallbackArtist));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[Artist] Failed to load:", err);
        setError("Failed to load artist");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackArtist, id]);

  useEffect(() => {
    if (!artist || !favoriteArtist) return;

    const hasBetterName =
      favoriteArtist.name === "Unknown Artist" && artist.name !== "Unknown Artist";
    const hasBetterPicture = !favoriteArtist.picture && Boolean(artist.picture);

    if (hasBetterName || hasBetterPicture) {
      upsertFavoriteArtist(artist);
    }
  }, [artist, favoriteArtist, upsertFavoriteArtist]);

  const handlePlayTrack = useCallback(
    (track: Track) => {
      if (artist) {
        playTrack(track, artist.tracks);
      }
    },
    [playTrack, artist]
  );

  const handlePlayAll = useCallback(() => {
    if (artist && artist.tracks.length > 0) {
      playQueue(artist.tracks, 0);
    }
  }, [playQueue, artist]);

  if (isLoading) return <ArtistSkeleton />;

  if (error || !artist) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-muted-foreground">{error ?? "Artist not found"}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-primary hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const isFav = favoriteArtists.some((item) => item.id === artist.id);
  const pictureKey = `${artist.picture ?? ""}:${fallbackArtist?.picture ?? ""}`;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="relative flex flex-col gap-4 p-4 pb-4 sm:flex-row sm:items-end sm:gap-6 sm:p-6">
        <button
          onClick={() => navigate(-1)}
          className="z-10 flex items-center gap-2 self-start rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:absolute sm:left-6 sm:top-6 sm:border-0 sm:bg-transparent sm:px-1 sm:py-1"
        >
          <ArrowLeft className="size-5" />
          <span className="sm:hidden">Back</span>
        </button>

        <ArtistHeroImage
          key={pictureKey}
          picture={artist.picture}
          fallbackPicture={fallbackArtist?.picture}
        />

        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Artist
          </span>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {artist.name}
          </h1>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 px-4 pb-2 sm:px-6">
        {artist.tracks.length > 0 && (
          <button
            onClick={handlePlayAll}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Play className="size-4" />
            Play
          </button>
        )}
        <button
          onClick={() => toggleFavoriteArtist(artist)}
          className="rounded-full p-2 transition-colors hover:bg-accent"
        >
          <Heart
            className={cn(
              "size-5 transition-colors",
              isFav ? "fill-primary text-primary" : "text-muted-foreground"
            )}
          />
        </button>
      </div>

      {/* Top tracks */}
      {artist.tracks.length > 0 && (
        <section className="px-4 pb-6 sm:px-2">
          <h2 className="pb-3 pt-4 text-lg font-semibold">Popular Tracks</h2>
          <TrackList tracks={artist.tracks} onPlay={handlePlayTrack} />
        </section>
      )}

      {/* Albums */}
      {artist.albums.length > 0 && (
        <section className="px-4 pb-8 sm:px-6">
          <h2 className="pb-4 text-lg font-semibold">Discography</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-4">
            {artist.albums.map((album) => {
              const coverUrl = album.cover ? getCoverUrl(album.cover, "320") : "";
              return (
                <Link
                  key={album.id}
                  to={`/album/${album.id}`}
                  className="group flex flex-col gap-2 rounded-lg p-3 transition-colors hover:bg-accent/50"
                >
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt=""
                      className="aspect-square w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="aspect-square w-full rounded-md bg-muted" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{album.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {album.releaseDate
                        ? album.releaseDate.substring(0, 4)
                        : album.type ?? "Album"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function ArtistSkeleton() {
  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <Skeleton className="size-32 rounded-full sm:size-40" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
