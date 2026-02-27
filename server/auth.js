import jwt from "jsonwebtoken";
import { config } from "./config.js";

export function createToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Missing auth token." });
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

