export const firebaseConfig = {
  apiKey: "AIzaSyAMv3ROqUfxkxInxREJiEa8aShQmyTjeZE",
  authDomain: "flowledger-567ac.firebaseapp.com",
  projectId: "flowledger-567ac",
  storageBucket: "flowledger-567ac.firebasestorage.app",
  messagingSenderId: "783981040175",
  appId: "1:783981040175:web:49d736d0a1b264c33facda",
  measurementId: "G-GM9PCKHGQG"
};

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY_HERE"
  );
}