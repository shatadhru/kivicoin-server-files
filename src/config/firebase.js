require("dotenv").config(); // .env ফাইল থেকে ভেরিয়েবল লোড করার জন্য

const { initializeApp } = require("firebase/app");
const {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} = require("firebase/auth");

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Firebase Initialize
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

module.exports = { auth, googleProvider, signInWithPopup };
