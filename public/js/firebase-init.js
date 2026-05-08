import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const inlineConfig = window.__FIREBASE_CONFIG__ || {};
const firebaseConfig = {
  apiKey: inlineConfig.apiKey || "REPLACE_ME",
  authDomain: inlineConfig.authDomain || "REPLACE_ME",
  projectId: inlineConfig.projectId || "REPLACE_ME",
  appId: inlineConfig.appId || "REPLACE_ME"
};

const notConfigured = Object.values(firebaseConfig).some((v) => v === "REPLACE_ME");
if (notConfigured) {
  document.body.innerHTML = "<h2>Firebase не настроен</h2><p>Заполните конфиг в public/js/firebase-init.js или задайте window.__FIREBASE_CONFIG__ в HTML.</p>";
  throw new Error("Firebase config is missing");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  getDocs,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification
};
