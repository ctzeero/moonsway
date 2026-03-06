import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

// Firebase web config is public by design — no secrets here.
// Set in .env (VITE_FIREBASE_*) or override via localStorage key "moonsway-firebase-config".
const DEFAULT_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "",
};

function shouldUseCurrentHostAuthDomain(hostname: string): boolean {
  return !(
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".localhost")
  );
}

function resolveConfig(baseConfig: typeof DEFAULT_CONFIG): typeof DEFAULT_CONFIG {
  if (typeof window === "undefined") return baseConfig;

  const hostname = window.location.hostname;
  if (!hostname || !shouldUseCurrentHostAuthDomain(hostname)) {
    return baseConfig;
  }

  if (
    baseConfig.authDomain.endsWith(".firebaseapp.com") ||
    baseConfig.authDomain.endsWith(".web.app")
  ) {
    return {
      ...baseConfig,
      authDomain: hostname,
    };
  }

  return baseConfig;
}

function getStoredConfig() {
  try {
    return JSON.parse(
      localStorage.getItem("moonsway-firebase-config") ?? "null"
    );
  } catch {
    return null;
  }
}

function isValidConfig(cfg: typeof DEFAULT_CONFIG): boolean {
  return !!(cfg?.apiKey && cfg?.authDomain && cfg?.projectId && cfg?.appId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

const config = resolveConfig(getStoredConfig() ?? DEFAULT_CONFIG);

if (isValidConfig(config)) {
  try {
    app = initializeApp(config);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (err) {
    console.error("[firebase] Failed to initialize:", err);
  }
} else {
  console.info(
    "[firebase] No valid config found"
  );
}

export { auth, googleProvider };
export const isFirebaseEnabled = !!app;
