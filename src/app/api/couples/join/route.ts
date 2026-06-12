import { requireCurrentUserRecord } from "@/lib/auth-helpers";
import { jsonError, jsonOk } from "@/lib/http";
import { readJsonBody } from "@/lib/request";
import { serializeCouple } from "@/lib/serializers";
import { coupleJoinSchema } from "@/lib/validators";
import { joinCoupleByCode } from "@/services/couples";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUserRecord();

    if (user.coupleId) {
      return jsonError("You already belong to a couple", 409);
    }

    const body = await readJsonBody(request);
    const parsed = coupleJoinSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid join payload", 400, parsed.error.flatten());
    }

    const updated = await joinCoupleByCode(user.id, parsed.data.code);

    return jsonOk(serializeCouple(updated));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof Error && error.message === "INVALID_JSON") {
      return jsonError("Invalid JSON body", 400);
    }

    if (error instanceof Error && error.message === "COUPLE_EXISTS") {
      return jsonError("You already belong to a couple", 409);
    }

    if (error instanceof Error && error.message === "COUPLE_NOT_FOUND") {
      return jsonError("Couple code not found", 404);
    }

    if (error instanceof Error && error.message === "COUPLE_FULL") {
      return jsonError("This couple is already full", 409);
    }

    return jsonError("Unable to join couple", 500);
  }
}
