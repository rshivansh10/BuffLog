import { pool } from "./db.js";

async function ensureColumn(tableName, columnDefinition) {
  try {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
  } catch (error) {
    if (error?.code !== "ER_DUP_FIELDNAME") throw error;
  }
}

export async function initializeSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      body_weight_kg DECIMAL(10,2) NULL,
      height_cm DECIMAL(10,2) NULL,
      muscle_weight_kg DECIMAL(10,2) NULL,
      fat_percentage DECIMAL(10,2) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn("users", "body_weight_kg DECIMAL(10,2) NULL");
  await ensureColumn("users", "height_cm DECIMAL(10,2) NULL");
  await ensureColumn("users", "muscle_weight_kg DECIMAL(10,2) NULL");
  await ensureColumn("users", "fat_percentage DECIMAL(10,2) NULL");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      workout_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS strength_sets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id INT NOT NULL,
      exercise_name VARCHAR(120) NOT NULL,
      set_order INT NOT NULL,
      reps INT NOT NULL,
      weight_kg DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cardio_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id INT NOT NULL,
      activity_name VARCHAR(120) NOT NULL,
      time_minutes DECIMAL(10,2) NOT NULL,
      distance_km DECIMAL(10,2) NOT NULL,
      calories_burned DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
    )
  `);
}
