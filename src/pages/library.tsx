import {
  type ComponentType,
  type FormEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate } from "react-router";
import {
  Clock,
  Disc3,
  Heart,
  ListMusic,
  Music,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionMenu, ActionMenuItem } from "@/components/action-menu";
import { TrackList } from "@/components/track-list";
import { useLibraryStore } from "@/stores/library-store";
import { usePlayerStore } from "@/stores/player-store";
import { getArtistPictureUrl, getCoverUrl } from "@/lib/api/music-api";
import { cn } from "@/lib/utils";
import type { Playlist, Track } from "@/types/music";

export function LibraryPage() {
  const navigate = useNavigate();
  const activeTab = useLibraryStore((s) => s.activeTab);
  const favoriteTracks = useLibraryStore((s) => s.favoriteTracks);
  const favoriteAlbums = useLibraryStore((s) => s.favoriteAlbums);
  const favoriteArtists = useLibraryStore((s) => s.favoriteArtists);
  const playlists = useLibraryStore((s) => s.playlists);
  const history = useLibraryStore((s) => s.history);
  const clearHistory = useLibraryStore((s) => s.clearHistory);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);
  const setActiveTab = useLibraryStore((s) => s.setActiveTab);

  const playTrack = usePlayerStore((s) => s.playTrack);

  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const sortedPlaylists = useMemo(
    () =>
      [...playlists].sort((left, right) =>
        (right.updatedAt ?? "").localeCompare(left.updatedAt ?? "")
      ),
    [playlists]
  );

  const handlePlayFavTrack = useCallback(
    (track: Track) => {
      playTrack(track, favoriteTracks);
    },
    [playTrack, favoriteTracks]
  );

  const handlePlayHistoryTrack = useCallback(
    (track: Track) => {
      playTrack(track, history);
    },
    [playTrack, history]
  );

  const handleCreatePlaylist = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const playlistId = createPlaylist(newPlaylistName);
      if (!playlistId) return;

      setNewPlaylistName("");
      setIsCreatingPlaylist(false);
      navigate(`/playlist/${playlistId}`);
    },
    [createPlaylist, navigate, newPlaylistName]
  );

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 sm:gap-6 sm:p-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        className="flex-1"
      >
        <TabsList className="w-full justify-start sm:w-fit">
          <TabsTrigger value="tracks" className="gap-1.5">
            <Music className="size-3.5" />
            Tracks ({favoriteTracks.length})
          </TabsTrigger>
          <TabsTrigger value="playlists" className="gap-1.5">
            <ListMusic className="size-3.5" />
            Playlists ({playlists.length})
          </TabsTrigger>
          <TabsTrigger value="albums" className="gap-1.5">
            <Disc3 className="size-3.5" />
            Albums ({favoriteAlbums.length})
          </TabsTrigger>
          <TabsTrigger value="artists" className="gap-1.5">
            <User className="size-3.5" />
            Artists ({favoriteArtists.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Clock className="size-3.5" />
            History ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracks" className="mt-4">
          {favoriteTracks.length > 0 ? (
            <TrackList tracks={favoriteTracks} onPlay={handlePlayFavTrack} />
          ) : (
            <EmptyState
              icon={Heart}
              title="No favorite tracks yet"
              description="Heart tracks to save them here"
            />
          )}
        </TabsContent>

        <TabsContent value="playlists" className="mt-4">
          <div className="flex flex-col gap-4">
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={() => setIsCreatingPlaylist((value) => !value)}
              >
                <Plus className="size-4" />
              </Button>
            </div>

            {isCreatingPlaylist ? (
              <form
                onSubmit={handleCreatePlaylist}
                className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/30 p-4 sm:flex-row"
              >
                <Input
                  value={newPlaylistName}
                  onChange={(event) => setNewPlaylistName(event.target.value)}
                  placeholder="My playlist"
                  maxLength={60}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button type="submit">Create</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreatingPlaylist(false);
                      setNewPlaylistName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : null}

            {sortedPlaylists.length > 0 ? (
              <div className="flex flex-col gap-2">
                {sortedPlaylists.map((playlist) => (
                  <PlaylistRow
                    key={playlist.id}
                    playlist={playlist}
                    onDelete={() => deletePlaylist(playlist.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ListMusic}
                title="No playlists yet"
                description="Create one to start collecting tracks"
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="albums" className="mt-4">
          {favoriteAlbums.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-4">
              {favoriteAlbums.map((album) => {
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
                        {album.artist?.name ?? "Unknown Artist"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Disc3}
              title="No favorite albums yet"
              description="Browse and save albums you love"
            />
          )}
        </TabsContent>

        <TabsContent value="artists" className="mt-4">
          {favoriteArtists.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:gap-4">
              {favoriteArtists.map((artist) => {
                const pictureUrl = artist.picture
                  ? getArtistPictureUrl(artist.picture, "320")
                  : "";
                return (
                  <Link
                    key={artist.id}
                    to={`/artist/${artist.id}`}
                    state={{ artist }}
                    className="group flex flex-col items-center gap-2 rounded-lg p-3 transition-colors hover:bg-accent/50"
                  >
                    {pictureUrl ? (
                      <img
                        src={pictureUrl}
                        alt=""
                        className="size-28 rounded-full object-cover"
                      />
                    ) : (
                      <div className="size-28 rounded-full bg-muted" />
                    )}
                    <p className="truncate text-sm font-medium">{artist.name}</p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={User}
              title="No favorite artists yet"
              description="Follow artists to see them here"
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {history.length > 0 ? (
            <div className="flex flex-col gap-4">
              <div className="flex justify-start sm:justify-end">
                <button
                  onClick={clearHistory}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Clear history
                </button>
              </div>
              <TrackList tracks={history} onPlay={handlePlayHistoryTrack} />
            </div>
          ) : (
            <EmptyState
              icon={Clock}
              title="No listening history"
              description="Tracks you play will appear here"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlaylistRow({
  playlist,
  onDelete,
}: {
  playlist: Playlist;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-accent/30">
      <Link to={`/playlist/${playlist.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <PlaylistArtwork playlist={playlist} className="size-16 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p className="truncate text-base font-medium">{playlist.name}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            Playlist • {playlist.numberOfTracks} track
            {playlist.numberOfTracks === 1 ? "" : "s"}
          </p>
        </div>
      </Link>

      <div className="md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
        <ActionMenu label={`${playlist.name} actions`}>
          <ActionMenuItem onSelect={onDelete}>
            <Trash2 className="size-4" />
            Delete playlist
          </ActionMenuItem>
        </ActionMenu>
      </div>
    </div>
  );
}

function PlaylistArtwork({
  playlist,
  className,
}: {
  playlist: Playlist;
  className?: string;
}) {
  const covers = playlist.tracks
    .map((track) => track.album?.cover)
    .filter((cover): cover is string => Boolean(cover))
    .slice(0, 4);

  if (covers.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[linear-gradient(135deg,rgba(236,72,153,0.18),rgba(59,130,246,0.18))] text-primary",
          className
        )}
      >
        <ListMusic className="size-6" />
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 overflow-hidden bg-muted", className)}>
      {Array.from({ length: 4 }, (_, index) => {
        const cover = covers[index];
        return cover ? (
          <img
            key={`${playlist.id}-${index}`}
            src={getCoverUrl(cover, "320")}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div key={`${playlist.id}-${index}`} className="bg-muted" />
        );
      })}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Icon className="size-12 text-muted-foreground/30" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
