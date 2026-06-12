import { requireSessionUser } from "@/lib/auth-helpers";
import { jsonError, jsonOk } from "@/lib/http";
import { uploadImageSchema } from "@/lib/validators";
import { uploadToCatbox } from "@/services/catbox";

export async function POST(request: Request) {
  try {
    await requireSessionUser();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("File is required", 400);
    }

    const parsed = uploadImageSchema.safeParse({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!parsed.success) {
      return jsonError("Invalid upload payload", 400, parsed.error.flatten());
    }

    const imageUrl = await uploadToCatbox(file);

    return jsonOk({ imageUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }

    return jsonError("Unable to upload image", 500);
  }
}
