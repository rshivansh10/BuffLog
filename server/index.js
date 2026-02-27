import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { pool } from "./db.js";
import { createToken, requireAuth } from "./auth.js";
import { initializeSchema } from "./schema.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, "../dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist", "index.html"));
});
app.use(
  cors({
    origin: config.clientOrigin,
  })
);
app.use(express.json());

function mapUserRow(row) {
  const bodyWeightKg = row.body_weight_kg === null ? null : Number(row.body_weight_kg);
  const heightCm = row.height_cm === null ? null : Number(row.height_cm);
  const muscleWeightKg =
    row.muscle_weight_kg === null ? null : Number(row.muscle_weight_kg);
  const fatPercentage = row.fat_percentage === null ? null : Number(row.fat_percentage);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    bodyWeightKg,
    heightCm,
    muscleWeightKg,
    fatPercentage,
    profileCompleted:
      bodyWeightKg !== null &&
      heightCm !== null &&
      muscleWeightKg !== null &&
      fatPercentage !== null,
  };
}

async function getUserById(userId) {
  const [rows] = await pool.query(
    `SELECT id, name, email, body_weight_kg, height_cm, muscle_weight_kg, fat_percentage
     FROM users WHERE id = ?`,
    [userId]
  );
  return rows.length ? mapUserRow(rows[0]) : null;
}

app.get("/api/health", async (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email and password are required." });
  }

  const loweredEmail = String(email).toLowerCase().trim();
  const hash = await bcrypt.hash(password, 12);

  try {
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name.trim(), loweredEmail, hash]
    );
    const user = await getUserById(result.insertId);
    const token = createToken(user);
    return res.status(201).json({ user, token });
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email already registered." });
    }
    return res.status(500).json({ message: "Failed to create account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required." });
  }

  const loweredEmail = String(email).toLowerCase().trim();
  const [rows] = await pool.query(
    `SELECT id, name, email, password_hash, body_weight_kg, height_cm, muscle_weight_kg, fat_percentage
     FROM users WHERE email = ?`,
    [loweredEmail]
  );

  if (!rows.length) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const dbUser = rows[0];
  const matches = await bcrypt.compare(password, dbUser.password_hash);
  if (!matches) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const user = mapUserRow(dbUser);
  const token = createToken(user);
  return res.json({ user, token });
});

app.get("/api/me", requireAuth, async (req, res) => {
  const user = await getUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }
  return res.json({ user });
});

app.put("/api/profile", requireAuth, async (req, res) => {
  const { bodyWeightKg, heightCm, muscleWeightKg, fatPercentage } = req.body ?? {};
  if (
    bodyWeightKg === undefined ||
    heightCm === undefined ||
    muscleWeightKg === undefined ||
    fatPercentage === undefined
  ) {
    return res.status(400).json({
      message:
        "bodyWeightKg, heightCm, muscleWeightKg and fatPercentage are required.",
    });
  }

  await pool.query(
    `UPDATE users
     SET body_weight_kg = ?, height_cm = ?, muscle_weight_kg = ?, fat_percentage = ?
     WHERE id = ?`,
    [
      Number(bodyWeightKg),
      Number(heightCm),
      Number(muscleWeightKg),
      Number(fatPercentage),
      req.user.userId,
    ]
  );

  const user = await getUserById(req.user.userId);
  return res.json({ user });
});

app.post("/api/workouts", requireAuth, async (req, res) => {
  const { workoutDate, notes = "", strength = [], cardio = [] } = req.body ?? {};

  if (!workoutDate) {
    return res.status(400).json({ message: "workoutDate is required." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [sessionResult] = await connection.query(
      "INSERT INTO workout_sessions (user_id, workout_date, notes) VALUES (?, ?, ?)",
      [req.user.userId, workoutDate, notes]
    );

    const sessionId = sessionResult.insertId;

    for (const exercise of strength) {
      const exerciseName = exercise.exerciseName?.trim();
      if (!exerciseName || !Array.isArray(exercise.sets)) continue;
      for (let i = 0; i < exercise.sets.length; i += 1) {
        const set = exercise.sets[i];
        await connection.query(
          "INSERT INTO strength_sets (session_id, exercise_name, set_order, reps, weight_kg) VALUES (?, ?, ?, ?, ?)",
          [sessionId, exerciseName, i + 1, Number(set.reps || 0), Number(set.weightKg || 0)]
        );
      }
    }

    for (const entry of cardio) {
      const activityName = entry.activityName?.trim();
      if (!activityName) continue;
      await connection.query(
        "INSERT INTO cardio_entries (session_id, activity_name, time_minutes, distance_km, calories_burned) VALUES (?, ?, ?, ?, ?)",
        [
          sessionId,
          activityName,
          Number(entry.timeMinutes || 0),
          Number(entry.distanceKm || 0),
          Number(entry.caloriesBurned || 0),
        ]
      );
    }

    await connection.commit();
    return res.status(201).json({ message: "Workout saved.", sessionId });
  } catch {
    await connection.rollback();
    return res.status(500).json({ message: "Could not save workout." });
  } finally {
    connection.release();
  }
});

app.get("/api/workouts", requireAuth, async (req, res) => {
  const [sessions] = await pool.query(
    "SELECT id, workout_date, notes, created_at FROM workout_sessions WHERE user_id = ? ORDER BY workout_date DESC, id DESC",
    [req.user.userId]
  );

  if (!sessions.length) {
    return res.json({ workouts: [] });
  }

  const sessionIds = sessions.map((s) => s.id);
  const placeholders = sessionIds.map(() => "?").join(", ");

  const [strengthRows] = await pool.query(
    `SELECT session_id, exercise_name, set_order, reps, weight_kg
     FROM strength_sets
     WHERE session_id IN (${placeholders})
     ORDER BY session_id DESC, exercise_name, set_order`,
    sessionIds
  );

  const [cardioRows] = await pool.query(
    `SELECT session_id, activity_name, time_minutes, distance_km, calories_burned
     FROM cardio_entries
     WHERE session_id IN (${placeholders})
     ORDER BY session_id DESC, activity_name`,
    sessionIds
  );

  const strengthBySession = new Map();
  for (const row of strengthRows) {
    if (!strengthBySession.has(row.session_id)) strengthBySession.set(row.session_id, []);
    strengthBySession.get(row.session_id).push({
      exerciseName: row.exercise_name,
      setOrder: row.set_order,
      reps: row.reps,
      weightKg: Number(row.weight_kg),
    });
  }

  const cardioBySession = new Map();
  for (const row of cardioRows) {
    if (!cardioBySession.has(row.session_id)) cardioBySession.set(row.session_id, []);
    cardioBySession.get(row.session_id).push({
      activityName: row.activity_name,
      timeMinutes: Number(row.time_minutes),
      distanceKm: Number(row.distance_km),
      caloriesBurned: Number(row.calories_burned),
    });
  }

  const workouts = sessions.map((session) => ({
    id: session.id,
    workoutDate: session.workout_date,
    notes: session.notes || "",
    createdAt: session.created_at,
    strength: strengthBySession.get(session.id) || [],
    cardio: cardioBySession.get(session.id) || [],
  }));

  return res.json({ workouts });
});

async function start() {
  await initializeSchema();
  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

