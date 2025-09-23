// firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyA-ILQQcKGiDgyV7UtzGc4XSN3GoFtS7gA",
  authDomain: "water-tracker-ba59e.firebaseapp.com",
  projectId: "water-tracker-ba59e",
  storageBucket: "water-tracker-ba59e.firebasestorage.app",
  messagingSenderId: "50404210108",
  appId: "1:50404210108:web:22278260f9d2667407a7b9",
  measurementId: "G-DRXXF7J371"
};

// Init Firebase
firebase.initializeApp(firebaseConfig);

// Helpers
const auth = firebase.auth();
const db = firebase.firestore();

// Ensure an authenticated session before any DB calls
window.firebaseReady = new Promise((resolve, reject) => {
  auth.onAuthStateChanged(async (user) => {
    try {
      if (!user) await auth.signInAnonymously();
      resolve();
    } catch (e) {
      console.error("Auth error:", e);
      reject(e);
    }
  }, reject);
});