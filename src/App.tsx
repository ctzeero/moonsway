import { type ComponentType } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from "react-router";
import { Home, Search, Library, Music2 } from "lucide-react";
import { PlayerBar } from "@/components/player-bar";
import { SearchBar } from "@/components/search-bar";
import { UserButton, UserButtonCompact } from "@/components/user-button";
import { HomePage } from "@/pages/home";
import { SearchPage } from "@/pages/search";
import { AlbumPage } from "@/pages/album";
import { ArtistPage } from "@/pages/artist";
import { PlaylistPage } from "@/pages/playlist";
import { LibraryPage } from "@/pages/library";
import { SpotifyPage } from "@/pages/spotify";
import logoSrc from "@/assets/icons/moonsway.png";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home", mobileTitle: "Discover" },
  { to: "/search", icon: Search, label: "Search", mobileTitle: "Search" },
  { to: "/library", icon: Library, label: "Library", mobileTitle: "Library" },
  { to: "/spotify", icon: Music2, label: "Import", mobileTitle: "Spotify Import" },
] as const;

function isRouteActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function getMobileTitle(pathname: string) {
  const navMatch = NAV_ITEMS.find((item) => isRouteActive(pathname, item.to));

  if (navMatch) {
    return navMatch.mobileTitle;
  }

  if (pathname.startsWith("/album/")) return "Album";
  if (pathname.startsWith("/artist/")) return "Artist";
  if (pathname.startsWith("/playlist/")) return "Playlist";

  return "Moonsway";
}

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-2 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/15 text-foreground before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-r-full before:bg-primary"
            : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
        )
      }
    >
      <Icon className="size-4" />
      {label}
    </NavLink>
  );
}

function MobileHeader() {
  const { pathname } = useLocation();
  const mobileTitle = getMobileTitle(pathname);
  const activeNavItem = NAV_ITEMS.find((item) => isRouteActive(pathname, item.to));
  const showSearch = isRouteActive(pathname, "/search");
  const showLibrary = isRouteActive(pathname, "/library");
  const showTitle = showSearch || showLibrary || !activeNavItem;

  return (
    <header className="relative z-30 shrink-0 border-b border-border/50 bg-background/72 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl md:hidden">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/20">
          <img src={logoSrc} alt="Moonsway" className="size-6" />
        </div>
        {showTitle ? (
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {mobileTitle}
            </h1>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <UserButtonCompact />
      </div>
      {showSearch ? (
        <div className="mt-3">
          <SearchBar />
        </div>
      ) : null}
    </header>
  );
}

function MobileNav() {
  return (
    <nav className="shrink-0 bg-background/72 px-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-4 gap-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(236,72,153,0.24)]"
                  : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
              )
            }
          >
            <Icon className="size-[18px]" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function AppLayout() {
  const { pathname } = useLocation();
  const showDesktopSearch = isRouteActive(pathname, "/search");

  return (
    <div className="flex h-dvh min-h-dvh w-screen flex-col overflow-hidden bg-background bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.14),transparent_36%)] text-foreground">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar/85 p-4 md:flex">
          <div className="mb-6 flex items-center gap-2">
            <img src={logoSrc} alt="Moonsway" className="size-8" />
          </div>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ to, icon, label }) => (
              <NavItem key={to} to={to} icon={icon} label={label} />
            ))}
          </nav>
          <div className="mt-auto">
            <UserButton />
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background/40">
          <MobileHeader />

          {showDesktopSearch ? (
            <header className="hidden shrink-0 items-center border-b border-border/50 bg-background/64 px-6 py-3 md:flex">
              <SearchBar />
            </header>
          ) : null}

          <main className="themed-scroll flex-1 overflow-y-auto overscroll-contain">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/search/:query" element={<SearchPage />} />
              <Route path="/album/:id" element={<AlbumPage />} />
              <Route path="/artist/:id" element={<ArtistPage />} />
              <Route path="/playlist/:id" element={<PlaylistPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/spotify" element={<SpotifyPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>

      <div className="shrink-0">
        <PlayerBar />
        <MobileNav />
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
