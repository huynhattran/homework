
import { json } from "./_firebase.mjs";

export default async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const username = String(input.username || "")
    .trim()
    .toLowerCase();

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return json(400, { error: "Invalid username" });
  }

  return json(200, {
    email: `${username}@eduquiz.invalid`
  });
};
