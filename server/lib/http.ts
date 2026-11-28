import { NextResponse } from "next/server";
import { requireAdmin } from "./auth";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type StaticContext = { params: Promise<Record<string, string>> };

type Handler<C> = (request: Request, context: C) => Promise<Response | object>;

export function publicRoute<C = StaticContext>(handler: Handler<C>) {
  return async (request: Request, context: C) => {
    try {
      const result = await handler(request, context);
      return result instanceof Response ? result : NextResponse.json(result);
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error(error);
      return NextResponse.json({ error: "Something broke on our side. Try again in a minute." }, { status: 500 });
    }
  };
}

export function adminRoute<C = StaticContext>(handler: Handler<C>) {
  return publicRoute<C>(async (request, context) => {
    requireAdmin(request);
    return handler(request, context);
  });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "The request body wasn't readable.");
  }
}

export async function readUpload(request: Request, extension: ".csv" | ".pdf") {
  const form = await request.formData().catch(() => {
    throw new HttpError(400, "Send the file as form data.");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file arrived. Pick one and try again.");
  if (!file.name.toLowerCase().endsWith(extension)) throw new HttpError(400, `That isn't a ${extension} file.`);
  if (file.size > 4 * 1024 * 1024) throw new HttpError(413, "Keep files under 4 MB. Split it and upload twice.");
  return { file, form };
}
