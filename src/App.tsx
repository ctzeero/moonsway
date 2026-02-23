import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router";
import { Home, Search, Library, Music2 } from "lucide-react";
import { PlayerBar } from "@/components/player-bar";
import { SearchBar } from "@/components/search-bar";
import { UserButton } from "@/components/user-button";
import { HomePage } from "@/pages/home";
import { SearchPage } from "@/pages/search";
import { AlbumPage } from "@/pages/album";
import { ArtistPage } from "@/pages/artist";
import { PlaylistPage } from "@/pages/playlist";
import { LibraryPage } from "@/pages/library";
import { SpotifyPage } from "@/pages/spotify";
import logoSrc from "@/assets/icons/moonsway.png";
import { cn } from "@/lib/utils";

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <NavLink
      to={to}
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

function AppLayout() {
  return (
    <div className="flex h-screen w-screen flex-col bg-background bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.14),transparent_36%)] text-foreground">
      {/* Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar/85 p-4">
          <div className="mb-6 flex items-center gap-2">
            <img src={logoSrc} alt="Moonsway" className="size-8" />
          </div>
          <nav className="flex flex-col gap-1">
            <NavItem to="/" icon={Home} label="Home" />
            <NavItem to="/search" icon={Search} label="Search" />
            <NavItem to="/library" icon={Library} label="Library" />
            <NavItem to="/spotify" icon={Music2} label="Spotify Import" />
          </nav>
          <div className="mt-auto">
            <UserButton />
          </div>
        </aside>

        {/* Main content area with header */}
        <div className="flex flex-1 flex-col overflow-hidden bg-background/40">
          {/* Header with search bar */}
          <header className="flex shrink-0 items-center gap-4 bg-background/70 px-6 py-4">
            <SearchBar />
          </header>

          {/* Scrollable content */}
          <main className="themed-scroll flex-1 overflow-y-auto">
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

      {/* Player bar */}
      <PlayerBar />
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
