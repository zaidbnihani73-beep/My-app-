import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const getFirebaseConfig = () => {
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const isPlaceholder = !envKey || 
                        envKey === "ضع_قيمة_apiKey_هنا" || 
                        envKey === "YOUR_API_KEY" || 
                        envKey.trim() === "";

  if (!isPlaceholder) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
  }

  return {
    apiKey: localStorage.getItem("firebase_api_key") || "",
    authDomain: localStorage.getItem("firebase_auth_domain") || "",
    projectId: localStorage.getItem("firebase_project_id") || "",
    storageBucket: localStorage.getItem("firebase_storage_bucket") || "",
    messagingSenderId: localStorage.getItem("firebase_messaging_sender_id") || "",
    appId: localStorage.getItem("firebase_app_id") || "",
  };
};

const firebaseConfig = getFirebaseConfig();

// Only initialize if the required API key is present and is not a placeholder
const hasConfig = !!firebaseConfig.apiKey && 
                  firebaseConfig.apiKey !== "ضع_قيمة_apiKey_هنا" && 
                  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
                  firebaseConfig.apiKey.trim() !== "";

const app = hasConfig 
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;

export const auth = app ? getAuth(app) : null as any;
export const db = app ? getFirestore(app) : null as any;
export const storage = app ? getStorage(app) : null as any;

export const isFirebaseConfigured = () => {
  return !!app;
};
