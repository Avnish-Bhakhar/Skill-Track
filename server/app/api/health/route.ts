import { publicRoute } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = publicRoute(async () => ({ ok: true, ai: Boolean(process.env.GROQ_API_KEY) }));
