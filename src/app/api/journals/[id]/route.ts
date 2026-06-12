import { getCurrentCouple } from "@/lib/auth-helpers";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/request";
import { serializeJournal } from "@/lib/serializers";
import { journalUpdateSchema } from "@/lib/validators";

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
    const parsed = journalUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid journal payload", 400, parsed.error.flatten());
    }

    const { id } = await params;
    const existing = await prisma.journal.findFirst({
      where: {
        id,
        coupleId: couple.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return jsonError("Journal not found", 404);
    }

    const updated = await prisma.journal.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.content !== undefined ? { content: parsed.data.content } : {}),
        ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl ?? null } : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return jsonOk(serializeJournal(updated));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof Error && error.message === "INVALID_JSON") {
      return jsonError("Invalid JSON body", 400);
    }

    return jsonError("Unable to update journal", 500);
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
    const existing = await prisma.journal.findFirst({
      where: {
        id,
        coupleId: couple.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return jsonError("Journal not found", 404);
    }

    await prisma.journal.delete({
      where: { id },
    });

    return jsonOk({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    return jsonError("Unable to delete journal", 500);
  }
}
