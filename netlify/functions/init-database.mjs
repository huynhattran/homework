
import {
  firebaseAdmin,
  requireUser,
  json
} from "./_firebase.mjs";

// Database schema for EduQuiz Pro
const DATABASE_SCHEMA = {
  version: 1,
  collections: {
    users: {
      purpose: "User accounts and profiles",
      fields: [
        "username",
        "fullName",
        "role",
        "status",
        "classId",
        "createdAt",
        "createdBy"
      ]
    },

    usernames: {
      purpose: "Username to Firebase UID mapping",
      fields: ["uid", "status", "createdAt"]
    },

    classes: {
      purpose: "Classes managed by teachers",
      fields: [
        "name",
        "teacherId",
        "studentIds",
        "status",
        "createdAt"
      ]
    },

    exams: {
      purpose: "Exam information",
      fields: [
        "title",
        "description",
        "teacherId",
        "classId",
        "questionIds",
        "status",
        "createdAt"
      ]
    },

    questions: {
      purpose: "Exam questions",
      fields: [
        "examId",
        "content",
        "type",
        "options",
        "points",
        "order"
      ]
    },

    assignments: {
      purpose: "Exams assigned to classes or students",
      fields: [
        "examId",
        "classId",
        "teacherId",
        "startAt",
        "endAt",
        "status"
      ]
    },

    submissions: {
      purpose: "Student exam submissions",
      fields: [
        "examId",
        "studentId",
        "answers",
        "submittedAt",
        "status"
      ]
    },

    results: {
      purpose: "Grading results",
      fields: [
        "examId",
        "studentId",
        "submissionId",
        "score",
        "gradedAt"
      ]
    },

    answer_keys: {
      purpose: "Private correct answers",
      fields: [
        "examId",
        "answers",
        "createdBy",
        "createdAt"
      ]
    }
  }
};

export default async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, {
      ok: false,
      error: "Method not allowed"
    });
  }

  // Only Admin can initialize database schema
  const actor = await requireUser(event, ["admin"]);

  if (actor.error) {
    return json(actor.statusCode, {
      ok: false,
      error: actor.error
    });
  }

  try {
    const { db } = firebaseAdmin();

    const schemaRef = db
      .collection("_system")
      .doc("schema");

    const result = await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(schemaRef);

      if (snapshot.exists) {
        const existing = snapshot.data();

        if (existing.version > DATABASE_SCHEMA.version) {
          throw new Error("SCHEMA_VERSION_CONFLICT");
        }

        // Same version: do not overwrite existing configuration
        if (existing.version === DATABASE_SCHEMA.version) {
          return {
            alreadyInitialized: true,
            version: existing.version
          };
        }
      }

      tx.set(schemaRef, {
        ...DATABASE_SCHEMA,
        initializedAt: new Date().toISOString(),
        initializedBy: actor.uid
      });

      return {
        alreadyInitialized: false,
        version: DATABASE_SCHEMA.version
      };
    });

    return json(200, {
      ok: true,
      message: result.alreadyInitialized
        ? "Database schema already initialized"
        : "Database schema initialized successfully",
      version: result.version,
      collections: Object.keys(
        DATABASE_SCHEMA.collections
      )
    });

  } catch (error) {
    console.error("Database initialization error:", error);

    if (error.message === "SCHEMA_VERSION_CONFLICT") {
      return json(409, {
        ok: false,
        error: "Database schema version conflict"
      });
    }

    return json(500, {
      ok: false,
      error: "Database initialization failed"
    });
  }
};
