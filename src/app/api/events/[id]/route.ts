import { getCurrentCouple } from "@/lib/auth-helpers";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/request";
import { serializeEvent } from "@/lib/serializers";
import { parseDateInput } from "@/lib/utils";
import { eventUpdateSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const couple = await getCurrentCouple();

    if (!couple) {
      return jsonError("Couple not found", 404);
    }

    const body = await readJsonBody(request);
    const parsed = eventUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid event payload", 400, parsed.error.flatten());
    }

    const { id } = await params;
    const existing = await prisma.event.findFirst({
      where: {
        id,
        coupleId: couple.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return jsonError("Event not found", 404);
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
        ...(parsed.data.eventDate !== undefined
          ? { eventDate: new Date(parsed.data.eventDate) }
          : {}),
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return jsonOk(serializeEvent(updated));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof Error && error.message === "INVALID_JSON") {
      return jsonError("Invalid JSON body", 400);
    }

    return jsonError("Unable to update event", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const couple = await getCurrentCouple();

    if (!couple) {
      return jsonError("Couple not found", 404);
    }

    const { id } = await params;
    const existing = await prisma.event.findFirst({
      where: {
        id,
        coupleId: couple.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return jsonError("Event not found", 404);
    }

    await prisma.event.delete({
      where: { id },
    });

    return jsonOk({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    return jsonError("Unable to delete event", 500);
  }
}
