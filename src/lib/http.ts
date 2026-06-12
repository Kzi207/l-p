import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400, issues?: unknown) {
  return NextResponse.json(
    {
      message,
      ...(issues ? { issues } : {}),
    },
    { status },
  );
}
