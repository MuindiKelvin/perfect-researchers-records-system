// src/firebase-config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyDWDv5LzMfgu1fn1OR0Y66VaSYd-SpyLg4",
  authDomain: "record-management-1b172.firebaseapp.com",
  projectId: "record-management-1b172",
  storageBucket: "record-management-1b172.appspot.com",  // Corrected the URL here
  messagingSenderId: "592095855242",
  appId: "1:592095855242:web:5a2ce895f00f92148ae373",
  measurementId: "G-6CEWYKGQ2V"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);