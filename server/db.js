import mysql from "mysql2/promise";
import { config } from "./config.js";

const dbUrl = new URL(config.databaseUrl);
const sslMode = dbUrl.searchParams.get("ssl-mode");

export const pool = mysql.createPool({
  host: dbUrl.hostname,
  port: Number(dbUrl.port || 3306),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace("/", ""),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: sslMode === "REQUIRED" ? { rejectUnauthorized: false } : undefined,
});

