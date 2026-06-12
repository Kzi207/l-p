import { getCurrentCouple, requireCurrentUserRecord } from "@/lib/auth-helpers";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/request";
import { serializeNote } from "@/lib/serializers";
import { noteCreateSchema } from "@/lib/validators";

export async function GET() {
  try {
    const couple = await getCurrentCouple();

    if (!couple) {
      return jsonOk([]);
    }

    const notes = await prisma.note.findMany({
      where: { coupleId: couple.id },
      orderBy: [
        { isPinned: "desc" },
        { updatedAt: "desc" },
      ],
    });

    return jsonOk(notes.map(serializeNote));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    return jsonError("Unable to load notes", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUserRecord();

    const coupleId = user.coupleId;

    if (!coupleId) {
      return jsonError("Join or create a couple first", 409);
    }

    const body = await readJsonBody(request);
    const parsed = noteCreateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid note payload", 400, parsed.error.flatten());
    }

    const note = await prisma.$transaction(async (tx) => {
      if (parsed.data.isPinned) {
        await tx.note.updateMany({
          where: { coupleId },
          data: { isPinned: false },
        });
      }

      return tx.note.create({
        data: {
          coupleId,
          content: parsed.data.content,
          isPinned: parsed.data.isPinned ?? false,
        },
      });
    });

    return jsonOk(serializeNote(note), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof Error && error.message === "INVALID_JSON") {
      return jsonError("Invalid JSON body", 400);
    }

    return jsonError("Unable to create note", 500);
  }
}
