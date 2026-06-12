import { getCurrentCouple, requireCurrentUserRecord } from "@/lib/auth-helpers";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/request";
import { serializeEvent } from "@/lib/serializers";
import { parseDateInput } from "@/lib/utils";
import { eventCreateSchema } from "@/lib/validators";

export async function GET() {
  try {
    const couple = await getCurrentCouple();

    if (!couple) {
      return jsonOk([]);
    }

    const events = await prisma.event.findMany({
      where: { coupleId: couple.id },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: {
        eventDate: "asc",
      },
    });

    return jsonOk(events.map(serializeEvent));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    return jsonError("Unable to load events", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUserRecord();

    if (!user.coupleId) {
      return jsonError("Join or create a couple first", 409);
    }

    const body = await readJsonBody(request);
    const parsed = eventCreateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid event payload", 400, parsed.error.flatten());
    }

    const event = await prisma.event.create({
      data: {
        coupleId: user.coupleId,
        authorId: user.id,
        title: parsed.data.title,
        eventDate: new Date(parsed.data.eventDate),
        type: parsed.data.type,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return jsonOk(serializeEvent(event), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof Error && error.message === "INVALID_JSON") {
      return jsonError("Invalid JSON body", 400);
    }

    return jsonError("Unable to create event", 500);
  }
}
