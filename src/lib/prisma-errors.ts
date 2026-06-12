type PrismaLikeError = Error & {
  code?: string;
};

export function getPrismaClientErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  const prismaError = error as PrismaLikeError;

  if (prismaError.code === "P1001" || error.message.includes("Can't reach database server")) {
    return "Database is not reachable";
  }

  if (prismaError.code === "P2021" || error.message.includes("does not exist in the current database")) {
    return "Database schema is not ready";
  }

  return null;
}
