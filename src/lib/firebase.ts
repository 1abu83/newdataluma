import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyDsMUtJQHEmD3y0ItTjD_jNIUfTPFj-3F0",
    authDomain: "tradeflow-f12a9.firebaseapp.com",
    databaseURL: "https://tradeflow-f12a9-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tradeflow-f12a9",
    storageBucket: "tradeflow-f12a9.firebasestorage.app",
    messagingSenderId: "389101516125",
    appId: "1:389101516125:web:592b8a7a522d9cd313e4b4"
  };

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const rtdb = getDatabase(app); 