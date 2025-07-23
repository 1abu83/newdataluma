
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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

/**
 * Signs in or registers a user using their wallet address.
 * It creates a synthetic email and uses the wallet address as a password.
 * @param walletAddress The user's public wallet address.
 * @returns A Firebase User object if sign-in/registration is successful, otherwise null.
 */
export const signInWithWallet = async (walletAddress: string): Promise<User | null> => {
  if (!walletAddress) {
    console.error("Wallet address is required to sign in.");
    return null;
  }

  const email = `${walletAddress}@lumadex.finance`;
  const password = walletAddress; // Using the wallet address as the password

  try {
    // Try to sign in the user first
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("User successfully signed in:", userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    const firebaseError = error as FirebaseError;
    
    // If the user is not found, create a new account
    // Newer Firebase SDK versions might return 'auth/invalid-credential' for both not found and wrong password.
    if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/invalid-credential') {
      console.log("User not found or invalid credential, attempting to create a new account...");
      try {
        const newUserCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("New user successfully registered:", newUserCredential.user.uid);
        return newUserCredential.user;
      } catch (createError) {
        const createFirebaseError = createError as FirebaseError;
        console.error("Error creating new user:", createFirebaseError.message);
        return null;
      }
    } else if (firebaseError.code === 'auth/wrong-password') {
        console.error("Authentication failed: The wallet address may not match the one used for registration.");
        return null;
    } else {
        console.error("Error during sign in:", firebaseError.message);
        return null;
    }
  }
};

/**
 * Fetch recent swaps (trades) from Firestore, ordered by timestamp descending.
 * @param {number} maxCount - Maximum number of swaps to fetch (default 50)
 * @returns {Promise<any[]>} Array of swap objects
 */
export async function fetchRecentSwaps(maxCount = 50) {
  const swapsQuery = query(
    collection(db, "swaps"),
    orderBy("timestamp", "desc"),
    limit(maxCount)
  );
  const snapshot = await getDocs(swapsQuery);
  return snapshot.docs.map(doc => doc.data());
}

export { app, db, auth, onAuthStateChanged };
