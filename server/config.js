import dotenv from "dotenv";

dotenv.config();

const {
  PORT = 4000,
  JWT_SECRET = "dev-secret-change-me",
  DATABASE_URL = "",
  CLIENT_ORIGIN = "http://localhost:5173",
} = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required in environment variables.");
}

export const config = {
  port: Number(PORT),
  jwtSecret: JWT_SECRET,
  databaseUrl: DATABASE_URL,
  clientOrigin: CLIENT_ORIGIN,
};

