import { getCurrentCouple } from "@/lib/auth-helpers";
import { jsonError, jsonOk } from "@/lib/http";
import { readJsonBody } from "@/lib/request";
import { serializeCouple } from "@/lib/serializers";
import { parseDateInput } from "@/lib/utils";
import { coupleUpdateSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const couple = await getCurrentCouple();

    if (!couple) {
      return jsonOk(null);
    }

    return jsonOk(serializeCouple(couple));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    return jsonError("Unable to load couple", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const couple = await getCurrentCouple();

    if (!couple) {
      return jsonError("Couple not found", 404);
    }

    const body = await readJsonBody(request);
    const parsed = coupleUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid couple payload", 400, parsed.error.flatten());
    }

    const updated = await prisma.couple.update({
      where: { id: couple.id },
      data: {
        startDate: parseDateInput(parsed.data.startDate),
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return jsonOk(serializeCouple(updated));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof Error && error.message === "INVALID_JSON") {
      return jsonError("Invalid JSON body", 400);
    }

    return jsonError("Unable to update couple", 500);
  }
}
