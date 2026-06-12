import { getCurrentCouple, requireCurrentUserRecord } from "@/lib/auth-helpers";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/request";
import { serializeMemory } from "@/lib/serializers";
import { memoryCreateSchema } from "@/lib/validators";

export async function GET() {
  try {
    const couple = await getCurrentCouple();

    if (!couple) {
      return jsonOk([]);
    }

    const memories = await prisma.memory.findMany({
      where: { coupleId: couple.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return jsonOk(memories.map(serializeMemory));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    return jsonError("Unable to load memories", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUserRecord();

    if (!user.coupleId) {
      return jsonError("Join or create a couple first", 409);
    }

    const body = await readJsonBody(request);
    const parsed = memoryCreateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid memory payload", 400, parsed.error.flatten());
    }

    const memory = await prisma.memory.create({
      data: {
        coupleId: user.coupleId,
        authorId: user.id,
        imageUrl: parsed.data.imageUrl,
        caption: parsed.data.caption,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return jsonOk(serializeMemory(memory), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    if (error instanceof Error && error.message === "INVALID_JSON") {
      return jsonError("Invalid JSON body", 400);
    }

    return jsonError("Unable to create memory", 500);
  }
}
