
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { getFirestore, collection, query, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";

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

/**
 * Fetch recent swaps (trades) from Firestore, ordered by timestamp descending.
 * @param {number} maxCount - Maximum number of swaps to fetch (default 50)
 * @returns {Promise<any[]>} Array of swap objects
 */
export async function fetchRecentSwaps(maxCount = 50) {
  try {
    const swapsQuery = query(
      collection(db, "swaps"),
      orderBy("timestamp", "desc"),
      limit(maxCount)
    );
    const snapshot = await getDocs(swapsQuery);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        // Ensure timestamp is serializable
        if (data.timestamp instanceof Timestamp) {
            return { ...data, timestamp: data.timestamp.toDate().getTime() };
        }
        return data;
    });
  } catch (error) {
    console.error("Error fetching recent swaps:", error);
    return [];
  }
}

export { app, db, auth, onAuthStateChanged };
