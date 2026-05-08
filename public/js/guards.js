import { auth, db, doc, getDoc, onAuthStateChanged } from "./firebase-init.js";

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export function requireAuth(callback, onNoAuth = () => location.assign("/")) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return onNoAuth();
    callback(user);
  });
}

export function ensureNotBlocked(profile, redirect = "/banned") {
  if (profile?.blocked) {
    location.assign(redirect);
    return false;
  }
  return true;
}

export function ensureVerified(user, profile, redirect = "/verify") {
  if (!ensureNotBlocked(profile)) return false;
  if (!user.emailVerified || profile?.verificationStatus !== "verified") {
    location.assign(redirect);
    return false;
  }
  return true;
}

export function ensureRole(profile, allowedRoles, redirect = "/home") {
  if (!allowedRoles.includes(profile?.role)) {
    location.assign(redirect);
    return false;
  }
  return true;
}

export async function getAuthedContext(user) {
  const profile = await getProfile(user.uid);
  if (!profile) {
    location.assign("/");
    return null;
  }
  return { user, profile };
}
