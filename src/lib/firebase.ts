
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// --- IMPORTANT ---
// Please ensure you have replaced the placeholder values below with your actual
// Firebase project's configuration. You can find these values in your
// Firebase project settings.

const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // REPLACE WITH YOUR ACTUAL API KEY
  authDomain: "YOUR_AUTH_DOMAIN", // REPLACE WITH YOUR ACTUAL AUTH DOMAIN
  projectId: "YOUR_PROJECT_ID", // REPLACE WITH YOUR ACTUAL PROJECT ID
  storageBucket: "YOUR_STORAGE_BUCKET", // REPLACE WITH YOUR ACTUAL STORAGE BUCKET
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // REPLACE WITH YOUR ACTUAL MESSAGING SENDER ID
  appId: "YOUR_APP_ID", // REPLACE WITH YOUR ACTUAL APP ID
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

// --- Configuration Validation ---
// Define common placeholder patterns to check against.
const PLACEHOLDER_PATTERNS = [
  "YOUR_API_KEY", "YOUR_AUTH_DOMAIN", "YOUR_PROJECT_ID",
  "YOUR_STORAGE_BUCKET", "YOUR_MESSAGING_SENDER_ID", "YOUR_APP_ID",
  "YOUR_MEASUREMENT_ID",
  "ADD_YOUR_API_KEY", // Add other common placeholder texts if needed
  "firebase-rules", // Common placeholder in some tutorials for projectId
  "AIzaSy", // Often part of example API keys, but real keys also start this way. More specific check needed.
  "firebaseapp.com", // authDomain often contains this, but an empty or placeholder value for projectId would be `YOUR_PROJECT_ID.firebaseapp.com`
  ".appspot.com", // storageBucket often contains this
];

// More specific check for critical keys if they are exactly the placeholder.
const EXACT_PLACEHOLDERS: Record<keyof typeof firebaseConfig, string> = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    // measurementId: "YOUR_MEASUREMENT_ID", // not critical for auth
};


const criticalKeys: (keyof typeof firebaseConfig)[] = ["apiKey", "authDomain", "projectId"];
const problematicConfigKeys: string[] = [];

for (const key of criticalKeys) {
  const value = firebaseConfig[key];
  if (!value || value === EXACT_PLACEHOLDERS[key] || (EXACT_PLACEHOLDERS[key] && value.includes(EXACT_PLACEHOLDERS[key] as string) && value.length < EXACT_PLACEHOLDERS[key]!.length + 5) ) {
    // Check if value is empty, exactly the placeholder, or suspiciously short if it contains the placeholder
    problematicConfigKeys.push(key);
  }
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

const isConfigComplete = problematicConfigKeys.length === 0;

if (getApps().length === 0) {
  if (isConfigComplete) {
    try {
      console.log("Firebase configuration appears complete. Initializing Firebase app...");
      app = initializeApp(firebaseConfig);
    } catch (error) {
      console.error("Firebase initialization error (likely from SDK checks before custom checks run):", error);
      app = null; // Ensure app is null on error
    }
  } else {
    console.warn(
      `Firebase configuration in src/lib/firebase.ts is INCOMPLETE or uses PLACEHOLDER values for the following critical keys: [${problematicConfigKeys.join(', ')}]. ` +
      "Please ensure these are replaced with your actual Firebase project settings. " +
      "Firebase services will not be available until properly configured. " +
      "The 'auth/configuration-not-found' error is likely due to this."
    );
    // app remains null
  }
} else {
  app = getApp();
  console.log("Firebase app already initialized. Checking its configuration integrity if possible...");
  // If app was initialized by another part or a previous broken config, we might still have issues.
  // Re-check against provided config if possible, though Firebase doesn't expose the running config easily.
  if (!isConfigComplete) {
     console.warn(
      `Firebase app was already initialized, but the current firebaseConfig in src/lib/firebase.ts ` +
      `is INCOMPLETE or uses PLACEHOLDER values for critical keys: [${problematicConfigKeys.join(', ')}]. ` +
      `This might lead to 'auth/configuration-not-found' if the initial setup was also flawed.`
    );
  }
}

if (app) {
  try {
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("Firebase services (Auth, Firestore, Storage) obtained.");
  } catch (error) {
    console.error("Error getting Firebase services (Auth, Firestore, Storage) AFTER app initialization:", error);
    // This could happen if the app object is valid but services fail for other reasons (e.g. permissions, network)
    // or if the initial config was subtly wrong and only caught at service level.
    auth = null;
    db = null;
    storage = null;
    if ((error as any).code === 'auth/configuration-not-found' && !isConfigComplete) {
        console.error("This 'auth/configuration-not-found' error confirms the firebaseConfig object is still incorrect.");
    }
  }
} else if (!isConfigComplete) {
    console.warn("Firebase app could not be initialized due to incomplete or placeholder configuration in firebaseConfig. Auth, Firestore, and Storage will be unavailable.");
} else {
    console.warn("Firebase app is null despite configuration appearing complete. This might indicate an SDK-level initialization failure. Auth, Firestore, and Storage will be unavailable.");
}

export { app, auth, db, storage };

