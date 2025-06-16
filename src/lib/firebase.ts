
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
  apiKey: "YOUR_API_KEY", // Replace with your actual API key
  authDomain: "YOUR_AUTH_DOMAIN", // Replace with your actual auth domain (e.g., project-id.firebaseapp.com)
  projectId: "YOUR_PROJECT_ID", // Replace with your actual project ID
  storageBucket: "YOUR_STORAGE_BUCKET", // Replace with your actual storage bucket (e.g., project-id.appspot.com)
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Replace with your actual messaging sender ID
  appId: "YOUR_APP_ID", // Replace with your actual app ID
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional: Replace if you use Analytics
};

// --- Configuration Validation ---
// Define common placeholder patterns to check against.
const PLACEHOLDER_PATTERNS = [
  "YOUR_API_KEY", "YOUR_AUTH_DOMAIN", "YOUR_PROJECT_ID",
  "YOUR_STORAGE_BUCKET", "YOUR_MESSAGING_SENDER_ID", "YOUR_APP_ID",
  "YOUR_MEASUREMENT_ID",
  "ADD_YOUR_API_KEY", // Add other common placeholder texts if needed
  "firebase-rules", // Common placeholder in some tutorials for projectId
];

const criticalKeys: (keyof typeof firebaseConfig)[] = ["apiKey", "authDomain", "projectId"];
const problematicConfigKeys: string[] = [];

for (const key of criticalKeys) {
  const value = firebaseConfig[key];
  if (!value || PLACEHOLDER_PATTERNS.some(placeholder => value.includes(placeholder))) {
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
      console.error("Firebase initialization error:", error);
      // app remains null
    }
  } else {
    console.warn(
      "Firebase configuration in src/lib/firebase.ts is INCOMPLETE or uses PLACEHOLDER values " +
      `for the following critical keys: [${problematicConfigKeys.join(', ')}]. ` +
      "Please ensure these are replaced with your actual Firebase project settings. " +
      "Firebase services will not be available until properly configured. " +
      "The 'auth/configuration-not-found' error is likely due to this."
    );
    // app remains null
  }
} else {
  app = getApp();
  console.log("Firebase app already initialized.");
}

if (app) {
  try {
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("Firebase services (Auth, Firestore, Storage) obtained.");
  } catch (error) {
    console.error("Error getting Firebase services (Auth, Firestore, Storage):", error);
    // Services might remain null if there's an issue after initialization
    auth = null;
    db = null;
    storage = null;
  }
} else if (!isConfigComplete) {
    console.warn("Firebase app not initialized due to incomplete or placeholder configuration. Auth, Firestore, and Storage will be unavailable.");
} else {
    console.warn("Firebase app is null for an unknown reason, but configuration seemed complete. Auth, Firestore, and Storage will be unavailable.");
}

export { app, auth, db, storage };
