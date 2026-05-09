// Firebase Configuration
// Replace the config object below with your actual Firebase project configuration
// You can find this in your Firebase Console: Project Settings > General > Your apps

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, updateDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCPoJKEu74c5tIQ6IQb0hvH8XVMecOjDCA",
  authDomain: "my-maestloper.firebaseapp.com",
  projectId: "my-maestloper",
  storageBucket: "my-maestloper.firebasestorage.app",
  messagingSenderId: "820347563596",
  appId: "1:820347563596:web:37fa4ae052f5e356948ee9",
  measurementId: "G-LSJ5BNEL8T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { db, auth, analytics, collection, addDoc, onSnapshot, query, where, orderBy, updateDoc, doc, getDocs };

