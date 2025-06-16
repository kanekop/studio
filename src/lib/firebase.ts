
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// --- User's Firebase Project Configuration ---
// IMPORTANT: You MUST replace the placeholder for "apiKey" below with your ACTUAL Firebase project API key.
// You can find these in your Firebase project console:
// Project settings (gear icon) > General tab > Your apps > Web app > SDK setup and configuration (Config)
const firebaseConfig = {
  // --- >>> !!! REPLACE THE NEXT LINE WITH YOUR ACTUAL API KEY FROM THE FIREBASE CONSOLE !!! <<< ---
  apiKey: "YOU_MUST_REPLACE_THIS_WITH_YOUR_REAL_API_KEY",
  authDomain: "faceroster.firebaseapp.com",
  projectId: "faceroster",
  // Verify this storageBucket. Usually it's "<your-project-id>.appspot.com"
  // If "faceroster.firebasestorage.app" is what's in your console, it's fine.
  // Please double-check this value from your Firebase console (Storage section).
  storageBucket: "faceroster.firebasestorage.app",
  messagingSenderId: "17864523080",
  appId: "1:17864523080:web:e03c71bdbe26ba4712077d",
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

// --- Configuration Validation Logic (Do NOT modify this section) ---
const GENERAL_PLACEHOLDER_PATTERNS: string[] = [
  "YOUR_API_KEY", // General placeholder
  "YOUR_AUTH_DOMAIN",
  "YOUR_PROJECT_ID",
  "YOUR_STORAGE_BUCKET",
  "YOUR_MESSAGING_SENDER_ID",
  "YOUR_APP_ID",
  "AIzaSy", // Common prefix for API keys, but needs to be checked if it's *just* a generic example vs a real key.
  "firebase-rules",
  "YOURMEASUREMENTID",
  "your-project-id", // Common in examples
  "your-app-id",
  "your-api-key"
];

// This checks for the specific placeholder used in the firebaseConfig above for apiKey
const EXACT_PLACEHOLDERS: Record<string, string> = {
    apiKey: "YOU_MUST_REPLACE_THIS_WITH_YOUR_REAL_API_KEY", // This is the specific placeholder for apiKey
    authDomain: "YOUR_AUTH_DOMAIN", // Placeholder for other fields if they were also templated
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
};

const criticalKeys: (keyof typeof firebaseConfig)[] = ["apiKey", "authDomain", "projectId"];
let problematicConfigKeys: string[] = [];
let isConfigComplete = true;

for (const key of criticalKeys) {
  const value = firebaseConfig[key as keyof typeof firebaseConfig];
  let isProblematic = !value || value.trim() === "";

  if (!isProblematic) {
    // Check against the exact placeholder for this specific key
    if (EXACT_PLACEHOLDERS[key] && value === EXACT_PLACEHOLDERS[key]) {
      isProblematic = true;
    }
    // Check against general placeholder patterns only if not already caught by exact placeholder
    if (!isProblematic) {
      for (const pattern of GENERAL_PLACEHOLDER_PATTERNS) {
        if (typeof value === 'string' && value.toUpperCase().includes(pattern.toUpperCase())) {
          // API keys often start with "AIzaSy".
          // A real API key starting with "AIzaSy" is much longer.
          // If it's *just* "AIzaSy" or a very short string after, it's likely a placeholder.
          // If it's the exact placeholder for apiKey, it's already caught.
          if (key === "apiKey" && value.startsWith("AIzaSy") && value.length > 10 && value !== EXACT_PLACEHOLDERS.apiKey) {
             // Potentially valid, don't mark as problematic based on "AIzaSy" alone if it's long enough
             // and not the specific "YOU_MUST_REPLACE..." placeholder.
          } else if (key === "apiKey" && value === "AIzaSy") { // Exact "AIzaSy" is a placeholder
            isProblematic = true;
            break;
          } else if (key !== "apiKey" || !value.startsWith("AIzaSy")) { // Check other patterns for non-API keys or API keys not starting with "AIzaSy"
            isProblematic = true;
            break;
          }
        }
      }
    }
  }

  if (isProblematic) {
    problematicConfigKeys.push(key);
    isConfigComplete = false;
  }
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let firebaseInitializationError: Error | null = null;

if (!isConfigComplete) {
  console.error(
    `Firebase configuration in src/lib/firebase.ts is INCOMPLETE or contains PLACEHOLDERS for critical keys: [${problematicConfigKeys.join(', ')}]. ` +
    "Please replace these with your actual Firebase project settings from the Firebase console. " +
    "Firebase services will not be available until this is corrected."
  );
} else {
  if (getApps().length === 0) {
    try {
      console.log("Firebase configuration appears complete. Initializing Firebase app...");
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized successfully.");
    } catch (error) {
      firebaseInitializationError = error as Error;
      console.error("Firebase SDK initialization error:", firebaseInitializationError);
      app = null; // Ensure app is null if initialization fails
    }
  } else {
    app = getApp();
    console.log("Firebase app already initialized.");
  }
}

if (app) {
  try {
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("Firebase services (Auth, Firestore, Storage) obtained.");
  } catch (error) {
    const typedError = error as any; // Cast to any to access error.code
    console.error("Error getting Firebase services (Auth, Firestore, Storage) AFTER app initialization:", typedError);
    if (typedError.code && (typedError.code === 'auth/configuration-not-found' || typedError.code === 'auth/api-key-not-valid')) {
        console.error(
          `This error (${typedError.code}) strongly suggests the firebaseConfig object in src/lib/firebase.ts, ` +
          "even if seemingly populated, is not valid for your project or specific services (like Auth) aren't correctly enabled or configured in the Firebase/Google Cloud console."
        );
    }
    // Ensure services are null if there's an error obtaining them
    auth = null;
    db = null;
    storage = null;
  }
} else {
  if (!isConfigComplete) {
    // Error already logged about incomplete config
  } else if (firebaseInitializationError) {
       console.error("Firebase app could not be initialized due to an SDK error (see above). Auth, Firestore, and Storage will be unavailable.");
  } else {
       console.warn("Firebase app object is null (and config was thought to be complete, or initialization failed silently). Auth, Firestore, and Storage will be unavailable.");
  }
}

export { app, auth, db, storage };
