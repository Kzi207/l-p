import { getCurrentCouple } from "@/lib/auth-helpers";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

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
    const existing = await prisma.memory.findFirst({
      where: {
        id,
        coupleId: couple.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return jsonError("Memory not found", 404);
    }

    await prisma.memory.delete({
      where: { id },
    });

    return jsonOk({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    return jsonError("Unable to delete memory", 500);
  }
}
