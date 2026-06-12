import { getCurrentCouple } from "@/lib/auth-helpers";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/request";
import { serializeNote } from "@/lib/serializers";
import { noteUpdateSchema } from "@/lib/validators";

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
    const parsed = noteUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid note payload", 400, parsed.error.flatten());
    }

    const { id } = await params;
    const existing = await prisma.note.findFirst({
      where: {
        id,
        coupleId: couple.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return jsonError("Note not found", 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.isPinned) {
        await tx.note.updateMany({
          where: { coupleId: couple.id },
          data: { isPinned: false },
        });
      }

      return tx.note.update({
        where: { id },
        data: {
          ...(parsed.data.content !== undefined ? { content: parsed.data.content } : {}),
          ...(parsed.data.isPinned !== undefined ? { isPinned: parsed.data.isPinned } : {}),
        },
      });
    });

    return jsonOk(serializeNote(updated));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof Error && error.message === "INVALID_JSON") {
      return jsonError("Invalid JSON body", 400);
    }

    return jsonError("Unable to update note", 500);
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
    const existing = await prisma.note.findFirst({
      where: {
        id,
        coupleId: couple.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return jsonError("Note not found", 404);
    }

    await prisma.note.delete({
      where: { id },
    });

    return jsonOk({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    return jsonError("Unable to delete note", 500);
  }
}
