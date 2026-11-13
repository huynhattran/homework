import { firebaseAdmin, requireUser, json } from "./_firebase.mjs";

export default async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const actor = await requireUser(event, ["admin"]);
  if (actor.error) return json(actor.statusCode, { error: actor.error });

  let input;
  try { input = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON" }); }
  const username = String(input.username || "").trim().toLowerCase();
  const fullName = String(input.fullName || "").trim();
  const password = String(input.password || "");
  const role = String(input.role || "");
  const classId = input.classId ? String(input.classId) : null;

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return json(400, { error: "Username must be 3-32 chars: a-z, 0-9, dot, underscore or hyphen" });
  if (fullName.length < 1 || fullName.length > 100) return json(400, { error: "Invalid fullName" });
  if (password.length < 8) return json(400, { error: "Temporary password must be at least 8 characters" });
  if (!["teacher", "student"].includes(role)) return json(400, { error: "Role must be teacher or student" });

  const { auth, db } = firebaseAdmin();
  const usernameRef = db.collection("usernames").doc(username);
  try {
    const result = await db.runTransaction(async (tx) => {
      const existing = await tx.get(usernameRef);
      if (existing.exists) throw new Error("USERNAME_TAKEN");
      const syntheticEmail = `${username}@eduquiz.invalid`;
      const userRecord = await auth.createUser({ email: syntheticEmail, password, displayName: fullName, disabled: false });
      await auth.setCustomUserClaims(userRecord.uid, { role });
      const profile = {
        username, fullName, role, status: "active",
        mustChangePassword: true,
        classId: role === "student" ? classId : null,
        createdAt: new Date().toISOString(),
        createdBy: actor.uid
      };
      tx.create(db.collection("users").doc(userRecord.uid), profile);
      tx.create(usernameRef, { uid: userRecord.uid, createdAt: new Date().toISOString() });
      return { uid: userRecord.uid, profile };
    });
    return json(201, { ok: true, user: result.profile, uid: result.uid });
  } catch (error) {
    if (error.message === "USERNAME_TAKEN") return json(409, { error: "Username already exists" });
    return json(500, { error: "Could not create account" });
  }
};
