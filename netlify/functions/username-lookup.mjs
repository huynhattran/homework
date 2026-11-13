import { firebaseAdmin, json } from "./_firebase.mjs";

export default async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  let input;
  try { input = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON" }); }
  const username = String(input.username || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return json(400, { error: "Invalid username" });
  try {
    const { db } = firebaseAdmin();
    const snap = await db.collection("usernames").doc(username).get();
    // Do not disclose whether an account exists.
    if (!snap.exists) return json(404, { error: "Invalid username or password" });
    return json(200, { email: `${username}@eduquiz.invalid` });
  } catch {
    return json(500, { error: "Authentication lookup unavailable" });
  }
};
