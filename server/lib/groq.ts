import { HttpError } from "./http";

export async function groqJson<T>(system: string, user: string): Promise<T> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new HttpError(503, "GROQ_API_KEY is not set, so the AI step is off. Everything else still works.");
  }
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_completion_tokens: 4000,
      ...(model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  }).catch(() => {
    throw new HttpError(502, "Couldn't reach Groq. Try again shortly.");
  });

  if (!response.ok) {
    console.error("Groq error", response.status, await response.text());
    const hint = response.status === 401 ? "The API key was rejected." : response.status === 429 ? "Rate limit hit." : `Status ${response.status}.`;
    throw new HttpError(502, `Groq said no. ${hint}`);
  }
  const body = await response.json();
  try {
    return JSON.parse(body.choices[0].message.content) as T;
  } catch {
    throw new HttpError(502, "The model sent back something unreadable. Try once more.");
  }
}
