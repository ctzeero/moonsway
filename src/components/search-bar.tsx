import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Search as SearchIcon, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 300;
const RECENT_SEARCHES_KEY = "moonsway-recent-searches";
const CURRENT_SEARCH_KEY = "moonsway-current-search";
const MAX_RECENT_QUERIES = 6;

function readRecentQueries(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function persistRecentQueries(queries: string[]): void {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(queries));
  } catch {
    // Ignore storage errors.
  }
}

function clearRecentQueriesStorage(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore storage errors.
  }
}

function persistCurrentSearch(query: string): void {
  try {
    if (!query.trim()) {
      localStorage.removeItem(CURRENT_SEARCH_KEY);
      return;
    }
    localStorage.setItem(CURRENT_SEARCH_KEY, query);
  } catch {
    // Ignore storage errors.
  }
}

export function SearchBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>(() => readRecentQueries());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const pathParts = location.pathname.split("/");
    if (pathParts[1] === "search" && pathParts[2]) {
      const urlQuery = decodeURIComponent(pathParts[2]);
      setQuery((prev) => (prev === urlQuery ? prev : urlQuery));
      persistCurrentSearch(urlQuery);
    }
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTypingTarget) return;

      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
      if (!query.trim()) {
        setShowRecentDropdown(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!containerRef.current?.contains(target)) {
        setShowRecentDropdown(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (!location.pathname.startsWith("/search")) {
      setIsLoading(false);
      return;
    }

    if (!query.trim()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      const target = `/search/${encodeURIComponent(query)}`;
      if (location.pathname !== target) {
        navigate(target);
      }
      persistCurrentSearch(query.trim());
      setIsLoading(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query, navigate, location.pathname]);

  const saveRecentQuery = (rawQuery: string) => {
    const normalized = rawQuery.trim();
    if (!normalized) return;

    setRecentQueries((prev) => {
      const next = [
        normalized,
        ...prev.filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
      ].slice(0, MAX_RECENT_QUERIES);
      persistRecentQueries(next);
      return next;
    });
  };

  const handleClear = () => {
    setQuery("");
    persistCurrentSearch("");
    if (inputRef.current === document.activeElement && recentQueries.length > 0) {
      setShowRecentDropdown(true);
    }
    if (location.pathname.startsWith("/search")) {
      navigate("/search");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = query.trim();
    if (!normalized) return;
    navigate(`/search/${encodeURIComponent(normalized)}`);
    saveRecentQuery(normalized);
    persistCurrentSearch(normalized);
    setShowRecentDropdown(false);
    setIsLoading(false);
  };

  const handleRecentClick = (recentQuery: string) => {
    setQuery(recentQuery);
    navigate(`/search/${encodeURIComponent(recentQuery)}`);
    saveRecentQuery(recentQuery);
    persistCurrentSearch(recentQuery);
    setShowRecentDropdown(false);
  };

  const handleClearRecentQueries = () => {
    setRecentQueries([]);
    clearRecentQueriesStorage();
    setShowRecentDropdown(false);
  };

  return (
    <div className="flex w-full max-w-none flex-col gap-2 md:max-w-3xl">
      <div ref={containerRef} className="relative w-full">
        <form className="relative w-full" onSubmit={handleSubmit}>
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search for tracks, albums, or artists..."
            value={query}
            onFocus={() => {
              if (!query.trim() && recentQueries.length > 0) {
                setShowRecentDropdown(true);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setShowRecentDropdown(false);
                inputRef.current?.blur();
              }
            }}
            onChange={(e) => {
              const nextValue = e.target.value;
              setQuery(nextValue);
              persistCurrentSearch(nextValue);
              if (nextValue.trim()) {
                setShowRecentDropdown(false);
              } else if (document.activeElement === inputRef.current && recentQueries.length > 0) {
                setShowRecentDropdown(true);
              }
            }}
            className="h-10 rounded-2xl border-border/60 bg-card/70 pl-9 pr-10 md:h-11"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {!isLoading && query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
          {!isLoading && !query && (
            <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border/80 bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
              /
            </kbd>
          )}
        </form>

        {showRecentDropdown && !query && recentQueries.length > 0 && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 rounded-xl border border-border/70 bg-card/95 p-2 shadow-lg backdrop-blur-md">
            <div className="mb-1.5 flex items-center justify-between px-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Recent
              </span>
              <button
                type="button"
                onClick={handleClearRecentQueries}
                className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Clear all
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {recentQueries.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleRecentClick(item)}
                  className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-sm text-foreground/90 transition-colors hover:bg-accent/60"
                >
                  <SearchIcon className="mr-2 size-3.5 text-muted-foreground" />
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
