import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

// Firebase web config is public by design — no secrets here.
// Self-hosters can override via localStorage key "moonsway-firebase-config".
// Leave DEFAULT_CONFIG empty strings until you add your own Firebase project.
const DEFAULT_CONFIG = {
  apiKey: "AIzaSyAy3HyO7ihUC-iJVfPWf3CObJEqlci9TZo",
  authDomain: "moonsway-7b948.firebaseapp.com",
  projectId: "moonsway-7b948",
  storageBucket: "moonsway-7b948.firebasestorage.app",
  messagingSenderId: "17544628860",
  appId: "1:17544628860:web:86ac6ceb58de0607ce97f9",
  measurementId: "G-CT7G7ZH4TG"
};

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

const config = getStoredConfig() ?? DEFAULT_CONFIG;

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
