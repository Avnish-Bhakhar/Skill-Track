import jwt from "jsonwebtoken";
import { HttpError } from "./http";

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new HttpError(500, "JWT_SECRET is not set on the server.");
  return value;
}

export const signToken = (adminId: string, email: string) =>
  jwt.sign({ sub: adminId, email, role: "admin" }, secret(), { expiresIn: "12h", algorithm: "HS256" });

export function requireAdmin(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Log in first.");
  const key = secret();
  try {
    const payload = jwt.verify(token, key, { algorithms: ["HS256"] }) as { sub: string; email: string; role: string };
    if (payload.role !== "admin") throw new Error("role");
    return payload;
  } catch {
    throw new HttpError(401, "Your session ran out. Log in again.");
  }
}
