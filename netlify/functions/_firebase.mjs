import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function firebaseAdmin() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(required("FIREBASE_SERVICE_ACCOUNT_JSON"));
    initializeApp({ credential: cert(serviceAccount), projectId: required("FIREBASE_PROJECT_ID") });
  }
  return { auth: getAuth(), db: getFirestore() };
}

export async function requireUser(event, allowedRoles = []) {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return { error: "Missing bearer token", statusCode: 401 };
  try {
    const { auth, db } = firebaseAdmin();
    const decoded = await auth.verifyIdToken(match[1], true);
    const snap = await db.collection("users").doc(decoded.uid).get();
    if (!snap.exists || snap.data()?.status !== "active") return { error: "Account is not active", statusCode: 403 };
    const profile = snap.data();
    if (allowedRoles.length && !allowedRoles.includes(profile.role)) return { error: "Insufficient role", statusCode: 403 };
    return { auth, db, uid: decoded.uid, profile };
  } catch {
    return { error: "Invalid or expired token", statusCode: 401 };
  }
}

export function json(statusCode, data) {
  return { statusCode, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, body: JSON.stringify(data) };
}
