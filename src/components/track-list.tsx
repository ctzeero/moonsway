import { type ReactNode, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { TrackActionMenu } from "@/components/track-action-menu";
import { usePlayerStore } from "@/stores/player-store";
import { useLibraryStore } from "@/stores/library-store";
import { getCoverUrl } from "@/lib/api/music-api";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/music";

interface TrackListProps {
  tracks: Track[];
  onPlay: (track: Track, index: number) => void;
  renderActions?: (track: Track) => ReactNode;
  renderMenuItems?: (track: Track) => ReactNode;
  showFavoriteButton?: boolean;
}

function NowPlayingIndicator() {
  return (
    <span
      className="inline-flex h-3 items-end gap-[2px] text-primary"
      aria-hidden="true"
    >
      <span className="now-playing-bar h-[55%] w-[3px] rounded-full bg-current" />
      <span
        className="now-playing-bar h-full w-[3px] rounded-full bg-current"
        style={{ animationDelay: "120ms" }}
      />
      <span
        className="now-playing-bar h-[70%] w-[3px] rounded-full bg-current"
        style={{ animationDelay: "240ms" }}
      />
    </span>
  );
}

export function TrackList({
  tracks,
  onPlay,
  renderActions,
  renderMenuItems,
  showFavoriteButton = true,
}: TrackListProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const favoriteTracks = useLibraryStore((s) => s.favoriteTracks);
  const toggleFavoriteTrack = useLibraryStore((s) => s.toggleFavoriteTrack);
  const [failedCoverIds, setFailedCoverIds] = useState<Set<string>>(
    () => new Set()
  );
  const favoriteTrackIds = useMemo(
    () => new Set(favoriteTracks.map((track) => track.id)),
    [favoriteTracks]
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="hidden grid-cols-[1fr_1fr_auto_4rem] items-center gap-3 border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
        <span>Title</span>
        <span>Album</span>
        <span />
        <span className="text-right">Time</span>
      </div>

      {/* Rows */}
      {tracks.map((track, index) => {
        const isCurrent = currentTrack?.id === track.id;
        const isFav = favoriteTrackIds.has(track.id);
        const coverUrl = track.album?.cover
          ? getCoverUrl(track.album.cover, "320")
          : "";
        const canShowCover = Boolean(coverUrl) && !failedCoverIds.has(track.id);

        return (
          <div
            key={`${track.id}-${index}`}
            className={cn(
              "group grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-1 py-3 transition-colors hover:bg-accent/22 md:grid-cols-[1fr_1fr_auto_4rem] md:items-center md:gap-3 md:px-3 md:hover:bg-accent/28",
              isCurrent && "bg-accent/18"
            )}
          >
            {/* Title + artist */}
            <button
              onClick={() => onPlay(track, index)}
              className="row-span-2 flex min-w-0 items-center gap-3 text-left md:row-span-1"
            >
              {canShowCover ? (
                <img
                  src={coverUrl}
                  alt=""
                  className="size-10 shrink-0 rounded-xl object-cover md:size-8 md:rounded"
                  loading="lazy"
                  onError={() => {
                    setFailedCoverIds((prev) => {
                      if (prev.has(track.id)) return prev;
                      const next = new Set(prev);
                      next.add(track.id);
                      return next;
                    });
                  }}
                />
              ) : (
                <div className="size-10 shrink-0 rounded-xl bg-muted md:size-8 md:rounded" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {isCurrent && isPlaying ? <NowPlayingIndicator /> : null}
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      isCurrent && "text-primary"
                    )}
                  >
                    {track.title}
                  </p>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {track.artist?.name ?? "Unknown Artist"}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground md:hidden">
                  {track.album?.title ?? "Single"}
                </p>
              </div>
            </button>

            {/* Album */}
            <span className="hidden truncate text-sm text-muted-foreground md:block">
              {track.album?.title ?? ""}
            </span>

            {/* Favorite */}
            <div
              className={cn(
                "col-start-2 row-start-1 flex items-center gap-1 self-start transition-opacity md:col-start-auto md:row-start-auto md:self-auto md:opacity-0 md:group-hover:opacity-100",
                (isFav || renderActions || renderMenuItems) && "opacity-100"
              )}
            >
              <TrackActionMenu track={track}>
                {renderMenuItems ? renderMenuItems(track) : null}
              </TrackActionMenu>
              {renderActions ? renderActions(track) : null}
              {showFavoriteButton ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavoriteTrack(track);
                  }}
                  className="flex items-center justify-center"
                >
                  <Heart
                    className={cn(
                      "size-4 transition-colors md:size-3.5",
                      isFav
                        ? "fill-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  />
                </button>
              ) : null}
            </div>

            {/* Duration */}
            <span className="col-start-2 row-start-2 text-right text-xs tabular-nums text-muted-foreground md:col-start-auto md:row-start-auto md:text-sm">
              {formatTime(track.duration)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
