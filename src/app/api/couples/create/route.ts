import { requireCurrentUserRecord } from "@/lib/auth-helpers";
import { jsonError, jsonOk } from "@/lib/http";
import { readJsonBody } from "@/lib/request";
import { serializeCouple } from "@/lib/serializers";
import { coupleCreateSchema } from "@/lib/validators";
import { createCoupleForUser } from "@/services/couples";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUserRecord();

    if (user.coupleId) {
      return jsonError("You already belong to a couple", 409);
    }

    const body = await readJsonBody<Record<string, unknown>>(request, { allowEmpty: true });
    const parsed = coupleCreateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid couple payload", 400, parsed.error.flatten());
    }

    const couple = await createCoupleForUser(user.id, parsed.data.startDate);

    return jsonOk(serializeCouple(couple), { status: 201 });
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

    return jsonError("Unable to create couple", 500);
  }
}
