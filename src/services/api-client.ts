"use client";

import type { ApiErrorResponse } from "@/types/contracts";

export async function apiClient<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : {
            "Content-Type": "application/json",
          }),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Request failed";

    try {
      const body = (await response.json()) as ApiErrorResponse;
      message = body.message || message;
    } catch {
      // Ignore JSON parse errors here.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}
