
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged,
  User
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { getFirestore, collection, query, orderBy, limit, getDocs } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDsMUtJQHEmD3y0ItTjD_jNIUfTPFj-3F0",
  authDomain: "tradeflow-f12a9.firebaseapp.com",
  databaseURL: "https://tradeflow-f12a9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tradeflow-f12a9",
  storageBucket: "tradeflow-f12a9.appspot.com",
  messagingSenderId: "389101516125",
  appId: "1:389101516125:web:592b8a7a522d9cd313e4b4"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);


export { app, db, auth, onAuthStateChanged };
export type { User };
