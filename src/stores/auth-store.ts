import { create } from "zustand";
import {
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
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (
        code === "auth/popup-blocked" ||
        code === "auth/cancelled-popup-request"
      ) {
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
