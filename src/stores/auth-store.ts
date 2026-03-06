import { create } from "zustand";
import {
  browserLocalPersistence,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseEnabled } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  firebaseEnabled: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

function shouldAvoidRedirectFallback(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    /(FBAN|FBAV|Instagram|Line|MicroMessenger|wv)/i.test(ua)
  );
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: isFirebaseEnabled,
  error: null,
  firebaseEnabled: isFirebaseEnabled,

  signInWithGoogle: async () => {
    if (!auth || !googleProvider) {
      set({ error: "Firebase is not configured." });
      return;
    }
    set({ error: null });
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (
        code === "auth/popup-blocked" ||
        code === "auth/cancelled-popup-request"
      ) {
        if (shouldAvoidRedirectFallback()) {
          set({
            error:
              "Google sign-in popup was blocked. Allow popups for this browser or open Moonsway in Safari or Chrome and try again.",
          });
          return;
        }

        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr: unknown) {
          set({
            error:
              (redirectErr as Error).message ?? "Sign in failed. Try again.",
          });
        }
      } else {
        set({ error: (err as Error).message ?? "Sign in failed. Try again." });
      }
    }
  },

  signOut: async () => {
    if (!auth) return;
    try {
      await fbSignOut(auth);
    } catch (err: unknown) {
      set({ error: (err as Error).message ?? "Sign out failed." });
    }
  },

  clearError: () => set({ error: null }),
}));

// Set up the auth state listener only when Firebase is configured.
if (isFirebaseEnabled && auth) {
  onAuthStateChanged(auth, (user) => {
    useAuthStore.setState({ user, loading: false });
  });
}
