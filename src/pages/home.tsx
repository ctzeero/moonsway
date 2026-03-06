import { Link } from "react-router";
import { Clock3, Headphones, Pause, Play, Search, Sparkles } from "lucide-react";
import { getCoverUrl } from "@/lib/api/music-api";
import { formatTime } from "@/lib/format";
import { useLibraryStore } from "@/stores/library-store";
import { usePlayerStore } from "@/stores/player-store";
import type { Track } from "@/types/music";

export function HomePage() {
  const history = useLibraryStore((s) => s.history);
  const favoriteTracks = useLibraryStore((s) => s.favoriteTracks);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);

  const recentTracks = history.slice(0, 6);
  const quickPickTracks = (favoriteTracks.length > 0 ? favoriteTracks : history).slice(
    0,
    4
  );
  const progressPercent = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:gap-8 sm:p-6 lg:p-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome to Moonsway
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          High fidelity music streaming. Press play with Moonsway.
        </p>
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur-sm sm:rounded-2xl sm:p-5">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/90">
              Continue Listening
            </p>
            <h2 className="mt-1 text-lg font-semibold sm:text-xl">
              {currentTrack ? currentTrack.title : "Pick your next track"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentTrack
                ? currentTrack.artist.name
                : "Search for tracks, albums, or artists to get started."}
            </p>
          </div>
          {currentTrack ? (
            <button
              type="button"
              onClick={togglePlayPause}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              {isPlaying ? <Pause className="size-4 fill-current stroke-none" /> : <Play className="size-4 fill-current stroke-none" />}
              {isPlaying ? "Pause" : "Resume"}
            </button>
          ) : (
            <Link
              to="/search"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              <Search className="size-4" />
              Browse Music
            </Link>
          )}
        </div>
        {currentTrack && (
          <div className="space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Clock3 className="size-4 text-primary" />
          <h2 className="text-lg font-semibold">Recently Played</h2>
        </div>
        {recentTracks.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
            {recentTracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                onClick={() => {
                  void playTrack(track, recentTracks);
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="No recent plays yet"
            description="Play a few tracks and they will appear here."
          />
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-lg font-semibold">Quick Picks</h2>
        </div>
        {quickPickTracks.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {quickPickTracks.map((track) => (
              <button
                key={`quick-${track.id}`}
                type="button"
                onClick={() => {
                  void playTrack(track, quickPickTracks);
                }}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/70 p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
              >
                <TrackArtwork track={track} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{track.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{track.artist.name}</p>
                </div>
                <Headphones className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="Nothing to suggest yet"
            description="Favorite tracks or play music to unlock quick picks."
          />
        )}
      </section>
    </div>
  );
}

function TrackArtwork({ track, size }: { track: Track; size: number }) {
  const coverUrl = track.album?.cover ? getCoverUrl(track.album.cover, "320") : "";

  if (coverUrl) {
    return (
      <img
        src={coverUrl}
        alt=""
        className="shrink-0 rounded-md object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="shrink-0 rounded-md bg-muted"
      style={{ width: size, height: size }}
    />
  );
}

function TrackCard({
  track,
  onClick,
}: {
  track: Track;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/70 p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40 sm:rounded-xl"
    >
      <TrackArtwork track={track} size={52} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{track.title}</p>
        <p className="truncate text-xs text-muted-foreground">{track.artist.name}</p>
      </div>
    </button>
  );
}

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-card/40 p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
