
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// --- IMPORTANT ---
// Replace the placeholder values below with your actual Firebase project's configuration.
// You can find these values in your Firebase project settings:
// 1. Go to the Firebase console (console.firebase.google.com)
// 2. Select your project.
// 3. Go to Project settings (gear icon) > General tab.
// 4. In the "Your apps" section, select your web app.
// 5. Find the "SDK setup and configuration" section and copy the config values.

const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // <-- Replace with your Firebase project's API Key
  authDomain: "YOUR_AUTH_DOMAIN", // <-- Replace with your Firebase project's Auth Domain (e.g., your-project-id.firebaseapp.com)
  projectId: "YOUR_PROJECT_ID", // <-- Replace with your Firebase project's Project ID
  storageBucket: "YOUR_STORAGE_BUCKET", // <-- Replace with your Firebase project's Storage Bucket (e.g., your-project-id.appspot.com)
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // <-- Replace with your Firebase project's Messaging Sender ID
  appId: "YOUR_APP_ID", // <-- Replace with your Firebase project's App ID
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional: Replace if you use Google Analytics
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

const isConfigComplete =
  firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.authDomain && firebaseConfig.authDomain !== "YOUR_AUTH_DOMAIN" &&
  firebaseConfig.projectId && firebaseConfig.projectId !== "YOUR_PROJECT_ID";

if (getApps().length === 0) {
  if (isConfigComplete) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (error) {
      console.error("Firebase initialization error:", error);
      // Fallback: app remains null
    }
  } else {
    console.warn(
      "Firebase configuration is missing or uses placeholder values in src/lib/firebase.ts. " +
      "Please replace all 'YOUR_...' placeholders with your actual Firebase project settings. " +
      "Firebase services will not be available until properly configured."
    );
    // app remains null
  }
} else {
  app = getApp();
}

if (app) {
  try {
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error("Error getting Firebase services:", error);
    // Services might remain null if there's an issue after initialization
    auth = null;
    db = null;
    storage = null;
  }
} else if (!isConfigComplete) {
    // This case is already handled by the console.warn above, but to be explicit for services:
    console.warn("Firebase app not initialized due to incomplete config. Auth, Firestore, and Storage will be unavailable.");
}


export { app, auth, db, storage };
