import { readAccessToken } from "../lib/auth.js";

export function requireAuth(req, res, next) {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const payload = token && readAccessToken(token);
  if (!payload) return res.status(401).json({ error: "Authentication required" });
  req.userId = payload.sub;
  next();
}

