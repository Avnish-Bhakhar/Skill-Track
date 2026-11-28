import { HttpError, publicRoute, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export const POST = publicRoute(async (request) => {
  const { email } = await readJson<{ email?: string }>(request);
  if (typeof email !== "string" || !email.trim()) {
    throw new HttpError(400, "Please provide your registered officer email address.");
  }
  const cleanEmail = email.trim().toLowerCase();
  const admin = await prisma.admin.findUnique({ where: { email: cleanEmail } });
  
  // Security standard: don't reveal whether user exists, but give helpful officer feedback
  if (admin) {
    console.info(`[Auth] Password reset requested for officer: ${cleanEmail}`);
  }
  
  return {
    ok: true,
    message: "If an officer account matches this email, password recovery guidance has been logged. In development mode, check your server console or environment credentials.",
  };
});
