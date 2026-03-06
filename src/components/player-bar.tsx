import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/stores/player-store";
import { getCoverUrl } from "@/lib/api/music-api";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PlayerBar() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const duration = usePlayerStore((s) => s.duration);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const shuffleActive = usePlayerStore((s) => s.shuffleActive);
  const repeatMode = usePlayerStore((s) => s.repeatMode);

  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const playNext = usePlayerStore((s) => s.playNext);
  const playPrev = usePlayerStore((s) => s.playPrev);
  const seek = usePlayerStore((s) => s.seek);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const coverUrl = currentTrack?.album?.cover
    ? getCoverUrl(currentTrack.album.cover, "640")
    : "";
  const miniCoverUrl = currentTrack?.album?.cover
    ? getCoverUrl(currentTrack.album.cover, "160")
    : "";

  const VolumeIcon = isMuted || volume === 0
    ? VolumeX
    : volume < 0.5
      ? Volume1
      : Volume2;

  const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;
  const progressValue = isScrubbing ? scrubTime : currentTime;
  const hasActiveTrack = Boolean(currentTrack) || isLoading;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTypingTarget =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable;
      const isInteractiveTarget =
        tag === "BUTTON" ||
        tag === "A" ||
        Boolean(target?.closest("[role='button'],[role='link']"));

      if (isTypingTarget || isInteractiveTarget) return;

      event.preventDefault();
      togglePlayPause();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePlayPause]);

  useEffect(() => {
    if (!hasActiveTrack) {
      setIsExpanded(false);
    }
  }, [hasActiveTrack]);

  const playButton = (
    <Button
      variant="default"
      size="icon-lg"
      className="rounded-full shadow-sm"
      onClick={togglePlayPause}
      disabled={!currentTrack && !isLoading}
    >
      {isLoading ? (
        <Loader2 className="size-5 animate-spin" />
      ) : isPlaying ? (
        <Pause className="size-5 fill-current stroke-none" />
      ) : (
        <Play className="size-5 fill-current stroke-none" />
      )}
    </Button>
  );

  return (
    <>
      {hasActiveTrack && (
        <div className="px-2 pb-2 pt-2 md:hidden">
          <div className="overflow-hidden rounded-[1.65rem] border border-border/60 bg-card/92 shadow-[0_-8px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl">
            <div className="h-1 w-full bg-muted/40">
              <div
                className="h-full bg-primary transition-[width]"
                style={{
                  width: `${duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0}%`,
                }}
              />
            </div>
            <div className="flex items-center gap-3 px-3 py-3">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                {miniCoverUrl ? (
                  <img
                    src={miniCoverUrl}
                    alt=""
                    className="size-11 shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="size-11 shrink-0 rounded-2xl bg-muted" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {currentTrack?.title ?? "Loading track"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {currentTrack?.artist?.name ?? "Please wait"}
                  </p>
                </div>
              </button>

              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                onClick={togglePlayPause}
                disabled={!currentTrack && !isLoading}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="size-4 fill-current stroke-none" />
                ) : (
                  <Play className="size-4 fill-current stroke-none" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {hasActiveTrack && (
        <div
          className={cn(
            "pointer-events-none fixed inset-0 z-50 md:hidden",
            isExpanded && "pointer-events-auto"
          )}
        >
          <div
            className={cn(
              "absolute inset-0 bg-black/50 transition-opacity duration-300",
              isExpanded ? "opacity-100" : "opacity-0"
            )}
            onClick={() => setIsExpanded(false)}
          />
          <div
            className={cn(
              "absolute inset-0 flex flex-col overflow-hidden transition-transform duration-300 ease-out",
              isExpanded ? "translate-y-0" : "translate-y-full"
            )}
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(178,93,54,0.95),rgba(90,48,30,0.98))]" />
            {coverUrl && (
              <div
                className="absolute inset-0 opacity-30 blur-3xl"
                style={{
                  backgroundImage: `url(${coverUrl})`,
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                }}
              />
            )}

            <div className="relative flex h-full min-h-0 flex-col overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)] text-white">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="flex size-11 items-center justify-center rounded-full bg-white/8 transition-colors hover:bg-white/14"
                >
                  <ChevronDown className="size-6" />
                </button>
                <div className="text-center">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/70">
                    Now Playing
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {currentTrack?.album?.title ?? "Moonsway"}
                  </p>
                </div>
                <div className="size-11" />
              </div>

              <div className="flex flex-1 flex-col justify-between gap-5 pt-4">
                <div className="mx-auto w-full max-w-[18rem] sm:max-w-[20rem]">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt=""
                      className="aspect-square w-full rounded-[2rem] object-cover shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
                    />
                  ) : (
                    <div className="aspect-square w-full rounded-[2rem] bg-white/10" />
                  )}
                </div>

                <div className="flex min-h-0 flex-col gap-5">
                  <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[2rem] font-semibold tracking-tight leading-none">
                        {currentTrack?.title ?? "Loading track"}
                      </h2>
                      <p className="mt-2 truncate text-lg text-white/72">
                        {currentTrack?.artist?.name ?? "Please wait"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Slider
                      min={0}
                      max={duration || 1}
                      step={0.1}
                      value={[progressValue]}
                      onPointerDownCapture={() => {
                        setIsScrubbing(true);
                        setScrubTime(currentTime);
                      }}
                      onValueChange={([val]) => {
                        setScrubTime(val ?? 0);
                      }}
                      onValueCommit={([val]) => {
                        setIsScrubbing(false);
                        seek(val ?? 0);
                      }}
                      className="w-full [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-white/20"
                    />
                    <div className="mt-2 flex justify-between text-sm tabular-nums text-white/72">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={toggleShuffle}
                      className={cn(
                        "size-9 rounded-full text-white/80 hover:bg-white/10 hover:text-white",
                        shuffleActive && "text-white"
                      )}
                    >
                      <Shuffle className="size-4.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={playPrev}
                      className="size-11 rounded-full text-white hover:bg-white/10"
                    >
                      <SkipBack className="size-5" />
                    </Button>
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      disabled={!currentTrack && !isLoading}
                      className="flex size-20 items-center justify-center rounded-full bg-white text-[#4b291e] shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition-transform active:scale-95 disabled:opacity-60"
                    >
                      {isLoading ? (
                        <Loader2 className="size-7 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="size-7 fill-current stroke-none" />
                      ) : (
                        <Play className="ml-0.5 size-7 fill-current stroke-none" />
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={playNext}
                      className="size-11 rounded-full text-white hover:bg-white/10"
                    >
                      <SkipForward className="size-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={cycleRepeat}
                      className={cn(
                        "size-9 rounded-full text-white/80 hover:bg-white/10 hover:text-white",
                        repeatMode !== "off" && "text-white"
                      )}
                    >
                      <RepeatIcon className="size-4.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-3 rounded-full bg-black/18 px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={toggleMute}
                      className="size-9 rounded-full text-white hover:bg-white/10"
                    >
                      <VolumeIcon className="size-4.5" />
                    </Button>
                    <Slider
                      min={0}
                      max={1}
                      step={0.01}
                      value={[isMuted ? 0 : volume]}
                      onValueChange={([val]) => setVolume(val)}
                      className="flex-1 [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:size-4 [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-white/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="hidden h-24 shrink-0 items-center border-t border-border/70 bg-card/88 px-5 shadow-[0_-3px_10px_rgba(0,0,0,0.18)] md:flex">
        <div className="flex w-1/3 min-w-0 items-center gap-3">
          {miniCoverUrl ? (
            <img
              src={miniCoverUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="h-14 w-14 shrink-0 rounded-md bg-muted" />
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">
              {currentTrack?.title ?? "No track playing"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {currentTrack?.artist?.name ?? "--"}
            </p>
          </div>
        </div>

        <div className="flex w-1/3 flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={toggleShuffle}
              className={cn(
                "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                shuffleActive && "text-primary"
              )}
            >
              <Shuffle className="size-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={playPrev}
              className="text-muted-foreground hover:bg-accent/70 hover:text-foreground"
            >
              <SkipBack className="size-4" />
            </Button>

            {playButton}

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={playNext}
              className="text-muted-foreground hover:bg-accent/70 hover:text-foreground"
            >
              <SkipForward className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={cycleRepeat}
              className={cn(
                "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                repeatMode !== "off" && "text-primary"
              )}
            >
              <RepeatIcon className="size-3.5" />
            </Button>
          </div>

          <div className="flex w-full max-w-lg items-center gap-2.5">
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
              {formatTime(currentTime)}
            </span>
            <Slider
              min={0}
              max={duration || 1}
              step={0.1}
              value={[progressValue]}
              onPointerDownCapture={() => {
                setIsScrubbing(true);
                setScrubTime(currentTime);
              }}
              onValueChange={([val]) => {
                setScrubTime(val ?? 0);
              }}
              onValueCommit={([val]) => {
                setIsScrubbing(false);
                seek(val ?? 0);
              }}
              className="flex-1 [&_[data-slot=slider-thumb]]:size-3.5 [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-muted/80"
            />
            <span className="w-10 text-xs tabular-nums text-muted-foreground">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex w-1/3 items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleMute}
            className="text-muted-foreground hover:bg-accent/70 hover:text-foreground"
          >
            <VolumeIcon className="size-4" />
          </Button>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[isMuted ? 0 : volume]}
            onValueChange={([val]) => setVolume(val)}
            className="w-32 [&_[data-slot=slider-thumb]]:size-3.5 [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-muted/80"
          />
        </div>
      </footer>
    </>
  );
}
