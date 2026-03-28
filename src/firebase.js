import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB5w0BPV-v8VkvGyhMbCQFIQ3Ly_yI1vLU",
  authDomain: "stockly-16d7e.firebaseapp.com",
  projectId: "stockly-16d7e",
  storageBucket: "stockly-16d7e.firebasestorage.app",
  messagingSenderId: "668191609884",
  appId: "1:668191609884:web:d7856de88cede9becdfbd9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
