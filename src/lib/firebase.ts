
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add your own Firebase configuration snippet here
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // <-- ここにFirebaseプロジェクトのAPIキーを入力してください
  authDomain: "YOUR_AUTH_DOMAIN", // <-- ここにFirebaseプロジェクトのAuthドメインを入力してください
  projectId: "YOUR_PROJECT_ID", // <-- ここにFirebaseプロジェクトのプロジェクトIDを入力してください
  storageBucket: "YOUR_STORAGE_BUCKET", // <-- ここにFirebaseプロジェクトのストレージバケットを入力してください
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // <-- ここにFirebaseプロジェクトのメッセージングセンダーIDを入力してください
  appId: "YOUR_APP_ID", // <-- ここにFirebaseプロジェクトのApp IDを入力してください
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
