import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { Check, ListMusic, Plus, X } from "lucide-react";
import { ActionMenu, ActionMenuItem } from "@/components/action-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLibraryStore } from "@/stores/library-store";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/music";

export function TrackActionMenu({
  track,
  children,
}: {
  track: Track;
  children?: ReactNode;
}) {
  const playlists = useLibraryStore((s) => s.playlists);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const addTrackToPlaylist = useLibraryStore((s) => s.addTrackToPlaylist);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");

  const sortedPlaylists = useMemo(
    () =>
      [...playlists].sort((left, right) =>
        (right.updatedAt ?? "").localeCompare(left.updatedAt ?? "")
      ),
    [playlists]
  );

  const handleCreatePlaylist = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const playlistId = createPlaylist(playlistName);
    if (!playlistId) return;

    addTrackToPlaylist(playlistId, track);
    setPlaylistName("");
    setIsPickerOpen(false);
  };

  return (
    <>
      <ActionMenu
        label={`${track.title} actions`}
        buttonClassName="p-1.5"
        menuClassName="right-0 min-w-52"
      >
        <ActionMenuItem onSelect={() => setIsPickerOpen(true)}>
          <ListMusic className="size-4" />
          Add to playlist
        </ActionMenuItem>
        {children}
      </ActionMenu>

      {isPickerOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
          onClick={() => setIsPickerOpen(false)}
        >
          <div className="flex h-full items-end justify-center md:items-center md:p-6">
            <div
              className="flex w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] border border-border/60 bg-background shadow-2xl md:rounded-[2rem]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
                <div>
                  <p className="text-sm font-semibold">Add to playlist</p>
                  <p className="text-xs text-muted-foreground">
                    {track.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="border-b border-border/60 px-4 py-4">
                <form onSubmit={handleCreatePlaylist} className="flex gap-2">
                  <Input
                    value={playlistName}
                    onChange={(event) => setPlaylistName(event.target.value)}
                    placeholder="New playlist"
                    maxLength={60}
                  />
                  <Button type="submit" className="shrink-0">
                    Create
                  </Button>
                </form>
              </div>

              <div className="max-h-[55vh] overflow-y-auto px-4 py-3">
                {sortedPlaylists.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {sortedPlaylists.map((playlist) => {
                      const hasTrack = playlist.tracks.some(
                        (item) => item.id === track.id
                      );

                      return (
                        <button
                          key={playlist.id}
                          type="button"
                          disabled={hasTrack}
                          onClick={() => {
                            addTrackToPlaylist(playlist.id, track);
                            setIsPickerOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors",
                            hasTrack
                              ? "bg-accent/30 text-muted-foreground"
                              : "hover:bg-accent/60"
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {playlist.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {playlist.numberOfTracks} track
                              {playlist.numberOfTracks === 1 ? "" : "s"}
                            </p>
                          </div>
                          {hasTrack ? (
                            <Check className="size-4 shrink-0 text-primary" />
                          ) : (
                            <Plus className="size-4 shrink-0 text-muted-foreground" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                    <ListMusic className="size-10 text-muted-foreground/30" />
                    <div>
                      <p className="text-sm font-medium">No playlists yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Create one above and this track will be added to it.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
