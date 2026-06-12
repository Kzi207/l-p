import bcrypt from "bcrypt";

import { jsonError, jsonOk } from "@/lib/http";
import { getPrismaClientErrorMessage } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/request";
import { getFirstZodErrorMessage } from "@/lib/validation";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(getFirstZodErrorMessage(parsed.error), 400, parsed.error.flatten());
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (existingUser) {
      return jsonError("Email already in use", 409);
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return jsonOk(user, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON") {
      return jsonError("Invalid JSON body", 400);
    }

    const prismaMessage = getPrismaClientErrorMessage(error);

    if (prismaMessage) {
      return jsonError(prismaMessage, 503);
    }

    return jsonError("Unable to register right now", 500);
  }
}
