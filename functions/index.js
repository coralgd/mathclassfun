/**
 * Firebase Cloud Functions for secure server-side operations.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const CATEGORY_KEYS = ["math", "science", "humanities", "physical", "appearance"];
const ALLOWED_VOTE_STATUSES = ["pending", "verified", "rejected", "withdrawn"];

function assertAuth(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Auth required");
  }
  return request.auth.uid;
}

async function getUserOrThrow(uid) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "User not found");
  }
  return { uid: snap.id, ...snap.data() };
}

async function requireRole(uid, allowedRoles) {
  const actor = await getUserOrThrow(uid);
  if (!allowedRoles.includes(actor.role)) {
    throw new HttpsError("permission-denied", "Insufficient role");
  }
  return actor;
}

function parsePlacementTable(table) {
  if (!table || typeof table !== "object" || Array.isArray(table)) return {};

  const usedRanks = new Set();
  const usedPlayers = new Set();
  const scores = {};

  for (const [position, targetUid] of Object.entries(table)) {
    const rank = Number(position);
    if (!Number.isInteger(rank) || rank < 1 || rank > 10) continue;
    if (usedRanks.has(rank)) continue;
    if (typeof targetUid !== "string" || !targetUid.trim()) continue;
    if (usedPlayers.has(targetUid)) continue;

    usedRanks.add(rank);
    usedPlayers.add(targetUid);
    scores[targetUid] = 10 - rank;
  }

  return scores;
}

async function writeActivityLog(action, actorUid, payload) {
  await db.collection("activityLogs").add({
    action,
    actorUid,
    payload,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

function average(sum, count) {
  return count > 0 ? sum / count : 0;
}

exports.calculateLeaderboard = onDocumentWritten("votes/{voteId}", async () => {
  const votesSnap = await db.collection("votes").where("status", "==", "verified").get();

  const perUser = new Map();
  for (const vote of votesSnap.docs) {
    const categories = vote.data().categories || {};

    for (const key of CATEGORY_KEYS) {
      const categoryScores = parsePlacementTable(categories[key]);
      for (const [targetUid, score] of Object.entries(categoryScores)) {
        if (!perUser.has(targetUid)) {
          perUser.set(targetUid, {
            uid: targetUid,
            sums: { math: 0, science: 0, humanities: 0, physical: 0, appearance: 0 },
            counts: { math: 0, science: 0, humanities: 0, physical: 0, appearance: 0 }
          });
        }

        const row = perUser.get(targetUid);
        row.sums[key] += score;
        row.counts[key] += 1;
      }
    }
  }

  const userIds = Array.from(perUser.keys());
  const userSnaps = await Promise.all(userIds.map((uid) => db.collection("users").doc(uid).get()));
  const usernameByUid = new Map(
    userSnaps
      .filter((s) => s.exists)
      .map((s) => [s.id, s.data().name || s.data().email || "Unknown"])
  );

  const computed = userIds.map((uid) => {
    const row = perUser.get(uid);

    const mathAvg = average(row.sums.math, row.counts.math);
    const scienceAvg = average(row.sums.science, row.counts.science);
    const humanitiesAvg = average(row.sums.humanities, row.counts.humanities);
    const physicalAvg = average(row.sums.physical, row.counts.physical);
    const appearanceAvg = average(row.sums.appearance, row.counts.appearance);
    const overallAvg = (mathAvg + scienceAvg + humanitiesAvg + physicalAvg + appearanceAvg) / 5;
    const ratingsCount = Math.max(
      row.counts.math,
      row.counts.science,
      row.counts.humanities,
      row.counts.physical,
      row.counts.appearance
    );

    return {
      uid,
      username: usernameByUid.get(uid) || "Unknown",
      mathAvg,
      scienceAvg,
      humanitiesAvg,
      physicalAvg,
      appearanceAvg,
      overallAvg,
      ratingsCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
  });

  computed.sort((a, b) => b.overallAvg - a.overallAvg || a.username.localeCompare(b.username));
  computed.forEach((r, i) => {
    r.place = i + 1;
  });

  const batch = db.batch();
  const leaderboardCollection = db.collection("leaderboardResults");
  const existingSnap = await leaderboardCollection.get();
  const nextUserIds = new Set(computed.map((r) => r.uid));

  computed.forEach((row) => {
    batch.set(leaderboardCollection.doc(row.uid), row, { merge: true });
  });

  existingSnap.forEach((doc) => {
    if (!nextUserIds.has(doc.id)) {
      batch.delete(doc.ref);
    }
  });

  await batch.commit();
});

exports.verifyPlayer = onCall(async (request) => {
  const actorUid = assertAuth(request);
  await requireRole(actorUid, ["moder", "elder"]);

  const { uid, name } = request.data || {};
  if (!uid || !name || typeof name !== "string" || !name.trim()) {
    throw new HttpsError("invalid-argument", "uid and non-empty name are required");
  }

  const user = await getUserOrThrow(uid);
  if (user.verificationStatus === "verified") {
    return { ok: true, noChange: true };
  }

  await db.runTransaction(async (tx) => {
    tx.update(db.collection("users").doc(uid), {
      name: name.trim(),
      verificationStatus: "verified",
      emailVerified: true
    });
    tx.set(
      db.collection("verificationRequests").doc(uid),
      {
        status: "approved",
        moderatedAt: admin.firestore.FieldValue.serverTimestamp(),
        moderatedBy: actorUid
      },
      { merge: true }
    );
  });

  await writeActivityLog("verifyPlayer", actorUid, { uid });
  return { ok: true };
});

exports.moderateVote = onCall(async (request) => {
  const actorUid = assertAuth(request);
  await requireRole(actorUid, ["moder", "elder"]);

  const { voteId, status } = request.data || {};
  if (!voteId || !["verified", "rejected"].includes(status)) {
    throw new HttpsError("invalid-argument", "voteId and valid status are required");
  }

  const voteRef = db.collection("votes").doc(voteId);
  const snap = await voteRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Vote not found");
  }

  const currentStatus = snap.data().status;
  if (!ALLOWED_VOTE_STATUSES.includes(currentStatus) || currentStatus === "withdrawn") {
    throw new HttpsError("failed-precondition", "Vote cannot be moderated in current status");
  }

  await voteRef.update({
    status,
    moderatedBy: actorUid,
    moderatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  await writeActivityLog("moderateVote", actorUid, { voteId, status });
  return { ok: true };
});

exports.blockDevice = onCall(async (request) => {
  const actorUid = assertAuth(request);
  await requireRole(actorUid, ["elder"]);

  const { fingerprint } = request.data || {};
  if (!fingerprint || typeof fingerprint !== "string") {
    throw new HttpsError("invalid-argument", "fingerprint is required");
  }

  const usersSnap = await db.collection("users").where("deviceFingerprint", "==", fingerprint).get();
  const accounts = [];
  const batch = db.batch();

  usersSnap.forEach((doc) => {
    accounts.push({ uid: doc.id, email: doc.data().email || "" });
    batch.update(doc.ref, { blocked: true });
  });

  batch.set(db.collection("blockedDevices").doc(fingerprint), {
    accounts,
    blockedAt: admin.firestore.FieldValue.serverTimestamp(),
    blockedBy: actorUid
  });

  await batch.commit();
  await writeActivityLog("blockDevice", actorUid, { fingerprint, blockedUsers: accounts.length });
  return { ok: true, blockedUsers: accounts.length };
});

exports.setRole = onCall(async (request) => {
  const actorUid = assertAuth(request);
  await requireRole(actorUid, ["elder"]);

  const { uid, role } = request.data || {};
  if (!uid || !["player", "moder", "elder"].includes(role)) {
    throw new HttpsError("invalid-argument", "uid and valid role are required");
  }

  if (uid === actorUid && role !== "elder") {
    throw new HttpsError("failed-precondition", "Elder cannot demote self");
  }

  await getUserOrThrow(uid);
  await db.collection("users").doc(uid).update({ role });
  await writeActivityLog("setRole", actorUid, { uid, role });
  return { ok: true };
});
