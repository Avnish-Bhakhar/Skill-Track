import { requireAdmin } from "@/lib/auth";
import { publicRoute } from "@/lib/http";

export const GET = publicRoute(async (request) => ({ email: requireAdmin(request).email }));
