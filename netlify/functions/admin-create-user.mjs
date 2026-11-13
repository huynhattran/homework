
import { randomUUID } from "node:crypto";
import { firebaseAdmin, requireUser, json } from "./_firebase.mjs";

export default async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const actor = await requireUser(event, ["admin"]);
  if (actor.error) {
    return json(actor.statusCode, { error: actor.error });
  }

  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const username = String(input.username || "").trim().toLowerCase();
  const fullName = String(input.fullName || "").trim();
  const password = String(input.password || "");
  const role = String(input.role || "");
  const classId = input.classId ? String(input.classId) : null;

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return json(400, { error: "Invalid username" });
  }

  if (!fullName || fullName.length > 100) {
    return json(400, { error: "Invalid fullName" });
  }

  if (password.length < 8) {
    return json(400, { error: "Password must be at least 8 characters" });
  }

  if (!["teacher", "student"].includes(role)) {
    return json(400, { error: "Invalid role" });
  }

  if (role === "student" && !classId) {
    return json(400, { error: "Student must have a classId" });
  }

  const { auth, db } = firebaseAdmin();
  const usernameRef = db.collection("usernames").doc(username);
  const requestId = randomUUID();
  const email = `${username}@eduquiz.invalid`;

  let uid = null;
  let reserved = false;

  try {
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(usernameRef);

      if (existing.exists) {
        throw new Error("USERNAME_TAKEN");
      }

      tx.create(usernameRef, {
        status: "creating",
        requestId,
        createdAt: new Date().toISOString()
      });
    });

    reserved = true;

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
      disabled: false
    });

    uid = userRecord.uid;

    await auth.setCustomUserClaims(uid, { role });

    const profile = {
      username,
      fullName,
      role,
      status: "active",
      mustChangePassword: true,
      classId: role === "student" ? classId : null,
      createdAt: new Date().toISOString(),
      createdBy: actor.uid
    };

    await db.runTransaction(async (tx) => {
      const reservation = await tx.get(usernameRef);

      if (
        !reservation.exists ||
        reservation.data()?.requestId !== requestId
      ) {
        throw new Error("RESERVATION_LOST");
      }

      tx.create(db.collection("users").doc(uid), profile);

      tx.update(usernameRef, {
        uid,
        status: "active",
        createdAt: new Date().toISOString()
      });
    });

    return json(201, {
      ok: true,
      uid,
      user: profile
    });

  } catch (error) {
    if (uid) {
      try {
        await auth.deleteUser(uid);
      } catch {}
    }

    if (reserved) {
      try {
        await db.runTransaction(async (tx) => {
          const reservation = await tx.get(usernameRef);

          if (
            reservation.exists &&
            reservation.data()?.requestId === requestId
          ) {
            tx.delete(usernameRef);
          }
        });
      } catch {}
    }

    if (error.message === "USERNAME_TAKEN") {
      return json(409, { error: "Username already exists" });
    }

    return json(500, {
      error: "Could not create account. Please check server logs."
    });
  }
};
