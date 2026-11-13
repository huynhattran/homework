
import { firebaseAdmin } from "./_firebase.mjs";

export default async () => {
  try {
    const { auth, db } = firebaseAdmin();

    await auth.listUsers(1);
    await db.collection("users").limit(1).get();

    return new Response(
      JSON.stringify({
        ok: true,
        firebase: "connected",
        authentication: "connected",
        firestore: "connected"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    console.error("Firebase health check failed:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        firebase: "connection_failed"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
};
