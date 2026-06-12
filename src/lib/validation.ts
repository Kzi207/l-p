import type { ZodError } from "zod";

export function getFirstZodErrorMessage(error: ZodError) {
  for (const issue of error.issues) {
    if (issue.message) {
      return issue.message;
    }
  }

  return "Invalid payload";
}
