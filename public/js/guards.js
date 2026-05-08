import { auth, db, doc, getDoc, onAuthStateChanged } from "./firebase-init.js";
import { go } from "./routes.js";

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export function requireAuth(callback, onNoAuth = () => go("index")) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return onNoAuth();
    callback(user);
  });
}

export function ensureNotBlocked(profile, redirect = "/banned") {
  if (profile?.blocked) {
    go(redirect.replace("/", ""));
    return false;
  }
  return true;
}

export function ensureVerified(user, profile, redirect = "/verify") {
  if (!ensureNotBlocked(profile)) return false;
  if (!user.emailVerified || profile?.verificationStatus !== "verified") {
    go(redirect.replace("/", ""));
    return false;
  }
  return true;
}

export function ensureRole(profile, allowedRoles, redirect = "/home") {
  if (!allowedRoles.includes(profile?.role)) {
    go(redirect.replace("/", ""));
    return false;
  }
  return true;
}

export async function getAuthedContext(user) {
  const profile = await getProfile(user.uid);
  if (!profile) {
    go("index");
    return null;
  }
  return { user, profile };
}
