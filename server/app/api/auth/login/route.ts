import bcrypt from "bcrypt";
import { signToken } from "@/lib/auth";
import { HttpError, publicRoute, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export const POST = publicRoute(async (request) => {
  const { email, password } = await readJson<{ email?: string; password?: string }>(request);
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    throw new HttpError(400, "Enter both email and password.");
  }
  const admin = await prisma.admin.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    throw new HttpError(401, "Email or password is wrong. Caps lock, perhaps.");
  }
  return { token: signToken(admin.id, admin.email), email: admin.email };
});
