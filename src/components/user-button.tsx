import { useRef, useState } from "react";
import { LogIn, LogOut, User, Chrome } from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function UserAvatar({
  user,
  className,
}: {
  user: FirebaseUser;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (user.photoURL && !imgError) {
    return (
      <img
        src={user.photoURL}
        alt={user.displayName ?? "User"}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={cn("rounded-full object-cover ring-1 ring-border", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/20 ring-1 ring-border",
        className
      )}
    >
      <User className="size-4 text-primary" />
    </div>
  );
}

// Read once at module level — never changes after init.
const { firebaseEnabled } = useAuthStore.getState();

export function UserButton() {
  // Subscribe only to the values that drive rendering.
  // Actions (signInWithGoogle, signOut, clearError) are read in callbacks via getState().
  const { user, loading, error } = useAuthStore();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!firebaseEnabled) return null;

  if (loading) {
    return (
      <div className="flex h-10 items-center gap-2 px-1">
        <div className="size-7 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-1">
        {error && (
          <p
            className="px-1 text-xs text-destructive"
            onClick={() => useAuthStore.getState().clearError()}
          >
            {error}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => useAuthStore.getState().signInWithGoogle()}
        >
          <Chrome className="size-4" />
          Sign in with Google
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent/70",
          open && "bg-accent/70"
        )}
      >
        <UserAvatar user={user} className="size-7" />
        <span className="flex-1 truncate text-left text-sm font-medium">
          {user.displayName ?? user.email}
        </span>
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full left-0 z-20 mb-1 w-full min-w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-foreground">
                {user.displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={() => {
                setOpen(false);
                useAuthStore.getState().signOut();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function UserButtonIcon() {
  const { user, loading } = useAuthStore();

  if (loading) return null;

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        title="Sign in with Google"
        onClick={() => useAuthStore.getState().signInWithGoogle()}
      >
        <LogIn className="size-4" />
      </Button>
    );
  }

  return <UserAvatar user={user} className="size-7" />;
}
