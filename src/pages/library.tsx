import { useCallback } from "react";
import { Link } from "react-router";
import { Heart, Clock, Music, Disc3, User, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrackList } from "@/components/track-list";
import { useLibraryStore } from "@/stores/library-store";
import { usePlayerStore } from "@/stores/player-store";
import { getCoverUrl, getArtistPictureUrl } from "@/lib/api/music-api";
import type { Track } from "@/types/music";

export function LibraryPage() {
  const favoriteTracks = useLibraryStore((s) => s.favoriteTracks);
  const favoriteAlbums = useLibraryStore((s) => s.favoriteAlbums);
  const favoriteArtists = useLibraryStore((s) => s.favoriteArtists);
  const history = useLibraryStore((s) => s.history);
  const clearHistory = useLibraryStore((s) => s.clearHistory);

  const playTrack = usePlayerStore((s) => s.playTrack);

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

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 sm:gap-6 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your favorites and listening history
        </p>
      </div>

      <Tabs defaultValue="tracks" className="flex-1">
        <TabsList className="w-full justify-start sm:w-fit">
          <TabsTrigger value="tracks" className="gap-1.5">
            <Music className="size-3.5" />
            Tracks ({favoriteTracks.length})
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

        {/* Favorite tracks */}
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

        {/* Favorite albums */}
        <TabsContent value="albums" className="mt-4">
          {favoriteAlbums.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-4">
              {favoriteAlbums.map((album) => {
                const coverUrl = album.cover
                  ? getCoverUrl(album.cover, "320")
                  : "";
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
                      <p className="truncate text-sm font-medium">
                        {album.title}
                      </p>
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

        {/* Favorite artists */}
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
                    <p className="truncate text-sm font-medium">
                      {artist.name}
                    </p>
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

        {/* History */}
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

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
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
