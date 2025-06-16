
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// --- User's Firebase Project Configuration ---
// IMPORTANT: Replace the placeholder values below with your ACTUAL Firebase project settings.
// You can find these in your Firebase project console:
// Project settings (gear icon) > General tab > Your apps > Web app > SDK setup and configuration (Config)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_FROM_FIREBASE_CONSOLE", // <<< --- !!! REPLACE THIS WITH YOUR ACTUAL API KEY !!!
  authDomain: "faceroster.firebaseapp.com",
  projectId: "faceroster",
  storageBucket: "faceroster.firebasestorage.app", // Verify this too, usually "your-project-id.appspot.com"
  messagingSenderId: "17864523080",
  appId: "1:17864523080:web:e03c71bdbe26ba4712077d",
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

// --- Configuration Validation Logic (Do NOT modify this section) ---
const PLACEHOLDER_PATTERNS: string[] = [
  "YOUR_API_KEY",
  "YOUR_AUTH_DOMAIN",
  "YOUR_PROJECT_ID",
  "YOUR_STORAGE_BUCKET",
  "YOUR_MESSAGING_SENDER_ID",
  "YOUR_APP_ID",
  "AIzaSy", // Common prefix for API keys, check if it's just a generic example
  "firebase-rules", // A common placeholder often seen in tutorials
  "YOURMEASUREMENTID", // Placeholder for measurementId
  "your-project-id",
  "your-app-id",
  "your-api-key"
];

const EXACT_PLACEHOLDERS: Record<string, string> = {
    apiKey: "YOUR_API_KEY_FROM_FIREBASE_CONSOLE", // Updated to match the new placeholder
    authDomain: "YOUR_AUTH_DOMAIN",
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
  let isProblematic = !value || value.trim() === ""; // Check for empty or just whitespace

  if (!isProblematic) {
    // Check against exact placeholders first
    if (EXACT_PLACEHOLDERS[key] && value === EXACT_PLACEHOLDERS[key]) {
      isProblematic = true;
    }
    // Then check against general placeholder patterns
    if (!isProblematic) {
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (typeof value === 'string' && value.toUpperCase().includes(pattern.toUpperCase())) {
          // More nuanced check for API key as it often starts with "AIzaSy"
          if (key === "apiKey" && value.startsWith("AIzaSy") && value.length > 10) { // Actual keys are longer
             // Potentially valid, don't mark as problematic based on "AIzaSy" alone
          } else if (key !== "apiKey" || !value.startsWith("AIzaSy")) {
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
      app = null;
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
    const typedError = error as any;
    console.error("Error getting Firebase services (Auth, Firestore, Storage) AFTER app initialization:", typedError);
    if (typedError.code === 'auth/configuration-not-found' || typedError.code === 'auth/api-key-not-valid') {
        console.error(
          `This error (${typedError.code}) strongly suggests the firebaseConfig object in src/lib/firebase.ts, ` +
          "even if seemingly populated, is not valid for your project or specific services (like Auth) aren't correctly enabled or configured in the Firebase/Google Cloud console."
        );
    }
    auth = null;
    db = null;
    storage = null;
  }
} else {
  if (!isConfigComplete) {
    // Error already logged above about incomplete config
  } else if (firebaseInitializationError) {
       console.error("Firebase app could not be initialized due to an SDK error (see above). Auth, Firestore, and Storage will be unavailable.");
  } else {
       console.warn("Firebase app object is null for an unknown reason (and config was thought to be complete). Auth, Firestore, and Storage will be unavailable.");
  }
}

export { app, auth, db, storage };
