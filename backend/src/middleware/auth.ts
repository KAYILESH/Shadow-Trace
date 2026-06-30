import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../db/supabase";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  userMetadata?: Record<string, unknown>;
}

/**
 * Express middleware that validates a Supabase JWT from the
 * Authorization: Bearer <token> header.
 * On success, attaches req.userId and req.userEmail.
 * On failure, returns 401 Unauthorized.
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.userId = data.user.id;
    req.userEmail = data.user.email;
    req.userMetadata = data.user.user_metadata as Record<string, unknown>;
    next();
  } catch (err) {
    console.error("[auth middleware] Error:", err);
    res.status(401).json({ error: "Authentication failed" });
  }
}
