import { getCurrentCouple, requireCurrentUserRecord } from "@/lib/auth-helpers";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/request";
import { serializeJournal } from "@/lib/serializers";
import { journalCreateSchema } from "@/lib/validators";

export async function GET() {
  try {
    const couple = await getCurrentCouple();

    if (!couple) {
      return jsonOk([]);
    }

    const journals = await prisma.journal.findMany({
      where: { coupleId: couple.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return jsonOk(journals.map(serializeJournal));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    return jsonError("Unable to load journals", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUserRecord();

    if (!user.coupleId) {
      return jsonError("Join or create a couple first", 409);
    }

    const body = await readJsonBody(request);
    const parsed = journalCreateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid journal payload", 400, parsed.error.flatten());
    }

    const journal = await prisma.journal.create({
      data: {
        coupleId: user.coupleId,
        authorId: user.id,
        title: parsed.data.title,
        content: parsed.data.content,
        imageUrl: parsed.data.imageUrl ?? null,
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

    return jsonOk(serializeJournal(journal), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof Error && error.message === "INVALID_JSON") {
      return jsonError("Invalid JSON body", 400);
    }

    return jsonError("Unable to create journal", 500);
  }
}
