import { getCurrentCouple } from "@/lib/auth-helpers";
import { jsonError, jsonOk } from "@/lib/http";
import { emptyDashboard } from "@/lib/serializers";
import { getDashboardSummary } from "@/services/dashboard";

export async function GET() {
  try {
    const couple = await getCurrentCouple();

    if (!couple) {
      return jsonOk(emptyDashboard());
    }

    return jsonOk(await getDashboardSummary(couple.id, couple.startDate));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    return jsonError("Unable to load dashboard", 500);
  }
}
