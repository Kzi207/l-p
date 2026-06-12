export async function readJsonBody<T>(
  request: Request,
  options?: {
    allowEmpty?: boolean;
  },
) {
  try {
    const rawBody = await request.text();

    if (!rawBody.trim()) {
      if (options?.allowEmpty) {
        return {} as T;
      }

      throw new Error("INVALID_JSON");
    }

    return JSON.parse(rawBody) as T;
  } catch {
    throw new Error("INVALID_JSON");
  }
}
